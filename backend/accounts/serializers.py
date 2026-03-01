from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from .models import User, Follow, UserProfile


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer para registro de novos usuários
    """
    password = serializers.CharField(
        write_only=True, 
        min_length=8,
        validators=[validate_password]
    )
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = [
            'email', 'username', 'first_name', 'last_name', 
            'password', 'password_confirm'
        ]
        extra_kwargs = {
            'username': {'min_length': 3, 'max_length': 30},
            'email': {'required': True},
            'first_name': {'required': True},
            'last_name': {'required': True},
        }
    
    def validate_username(self, value):
        """Validação customizada para username"""
        if not value.isalnum():
            raise serializers.ValidationError(
                "Username deve conter apenas letras e números."
            )
        return value
    
    def validate(self, attrs):
        """Validação de confirmação de senha"""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError(
                {'password_confirm': 'As senhas não coincidem.'}
            )
        return attrs
    
    def create(self, validated_data):
        """Criação de novo usuário"""
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        
        # Criar perfil do usuário
        UserProfile.objects.create(user=user)
        
        return user


class UserLoginSerializer(serializers.Serializer):
    """
    Serializer para login de usuários
    """
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        """Validação de credenciais"""
        email = attrs.get('email')
        password = attrs.get('password')
        
        if email and password:
            user = authenticate(
                request=self.context.get('request'),
                email=email,
                password=password
            )
            
            if not user:
                raise serializers.ValidationError(
                    'Email ou senha incorretos.'
                )
            
            if not user.is_active:
                raise serializers.ValidationError(
                    'Conta desativada.'
                )
            
            attrs['user'] = user
            return attrs
        
        raise serializers.ValidationError(
            'Email e senha são obrigatórios.'
        )


class UserProfileSerializer(serializers.ModelSerializer):
    """
    Serializer para perfil do usuário
    """
    followers_count = serializers.IntegerField(read_only=True)
    following_count = serializers.IntegerField(read_only=True)
    is_following = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    profile_image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'bio', 'profile_image', 'profile_image_url', 'date_of_birth', 'location', 'website',
            'is_verified', 'is_private', 'followers_count', 'following_count',
            'is_following', 'created_at'
        ]
        read_only_fields = ['email', 'username', 'is_verified', 'created_at', 'profile_image_url']
    
    def get_is_following(self, obj):
        """Verifica se o usuário logado está seguindo este usuário"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return request.user.is_following(obj)
        return False
    
    def get_full_name(self, obj):
        """Retorna o nome completo"""
        return obj.get_full_name()
    
    def get_profile_image_url(self, obj):
        """Retorna a URL completa da imagem de perfil"""
        request = self.context.get('request')
        if obj.profile_image:
            image_url = obj.profile_image.url
            if request:
                return request.build_absolute_uri(image_url)
            return image_url
        return None


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer para atualização do perfil do usuário
    """
    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'bio', 'profile_image', 
            'date_of_birth', 'location', 'website', 'is_private'
        ]
    
    def validate_profile_image(self, value):
        """Validação da imagem de perfil"""
        if value:
            # Validar tamanho (máx 5MB)
            if value.size > 5 * 1024 * 1024:
                raise serializers.ValidationError(
                    "Imagem muito grande. Máximo 5MB."
                )
            
            # Validar formato
            if not value.content_type.startswith('image/'):
                raise serializers.ValidationError(
                    "Arquivo deve ser uma imagem."
                )
        
        return value


class FollowSerializer(serializers.ModelSerializer):
    """
    Serializer para sistema de seguir
    """
    follower = UserProfileSerializer(read_only=True)
    followed = UserProfileSerializer(read_only=True)
    
    class Meta:
        model = Follow
        fields = ['id', 'follower', 'followed', 'created_at']
        read_only_fields = ['created_at']


class UserMinimalSerializer(serializers.ModelSerializer):
    """
    Serializer mínimo para listagem de usuários
    """
    full_name = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()
    profile_image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'full_name', 'profile_image', 'profile_image_url',
            'is_verified', 'is_following'
        ]
    
    def get_full_name(self, obj):
        return obj.get_full_name()
    
    def get_is_following(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return request.user.is_following(obj)
        return False
    
    def get_profile_image_url(self, obj):
        """Retorna a URL completa da imagem de perfil"""
        request = self.context.get('request')
        if obj.profile_image:
            image_url = obj.profile_image.url
            if request:
                return request.build_absolute_uri(image_url)
            return image_url
        return None


class UserProfileStepSerializer(serializers.ModelSerializer):
    """
    Serializer para formulário de perfil em etapas
    """
    class Meta:
        model = UserProfile
        fields = ['profile_completed', 'onboarding_step']


class PasswordChangeSerializer(serializers.Serializer):
    """
    Serializer para mudança de senha
    """
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(
        write_only=True, 
        validators=[validate_password]
    )
    new_password_confirm = serializers.CharField(write_only=True)
    
    def validate_old_password(self, value):
        """Validação da senha atual"""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Senha atual incorreta.')
        return value
    
    def validate(self, attrs):
        """Validação de confirmação da nova senha"""
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError(
                {'new_password_confirm': 'As senhas não coincidem.'}
            )
        return attrs
    
    def save(self):
        """Salvar nova senha"""
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user