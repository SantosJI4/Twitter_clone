from rest_framework import serializers
from .models import Post, Like, Comment, CommentLike, Notification
from accounts.serializers import UserMinimalSerializer


class PostSerializer(serializers.ModelSerializer):
    """
    Serializer para posts
    """
    author = UserMinimalSerializer(read_only=True)
    likes_count = serializers.IntegerField(read_only=True)
    dislikes_count = serializers.IntegerField(read_only=True)
    comments_count = serializers.IntegerField(read_only=True)
    reposts_count = serializers.IntegerField(read_only=True)
    is_liked = serializers.SerializerMethodField()
    is_disliked = serializers.SerializerMethodField()
    original_post = serializers.SerializerMethodField()
    
    class Meta:
        model = Post
        fields = [
            'id', 'author', 'content', 'image', 'created_at', 'updated_at',
            'is_repost', 'original_post', 'reply_to', 'likes_count', 
            'dislikes_count', 'comments_count', 'reposts_count',
            'is_liked', 'is_disliked'
        ]
        read_only_fields = ['author', 'created_at', 'updated_at']
    
    def get_is_liked(self, obj):
        """Verifica se o usuário curtiu o post"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(user=request.user, is_like=True).exists()
        return False
    
    def get_is_disliked(self, obj):
        """Verifica se o usuário descurtiu o post"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(user=request.user, is_like=False).exists()
        return False
    
    def get_original_post(self, obj):
        """Retorna o post original se for um repost"""
        if obj.is_repost and obj.original_post:
            return PostSerializer(obj.original_post, context=self.context).data
        return None
    
    def validate_image(self, value):
        """Validação da imagem do post"""
        if value:
            # Validar tamanho (máx 10MB)
            if value.size > 10 * 1024 * 1024:
                raise serializers.ValidationError(
                    "Imagem muito grande. Máximo 10MB."
                )
            
            # Validar formato
            if not value.content_type.startswith('image/'):
                raise serializers.ValidationError(
                    "Arquivo deve ser uma imagem."
                )
        
        return value


class PostCreateSerializer(serializers.ModelSerializer):
    """
    Serializer para criação de posts
    """
    class Meta:
        model = Post
        fields = ['content', 'image', 'reply_to']
    
    def validate(self, attrs):
        """Validação personalizada"""
        content = attrs.get('content', '').strip()
        image = attrs.get('image')
        
        # Pelo menos conteúdo ou imagem deve estar presente
        if not content and not image:
            raise serializers.ValidationError(
                "Post deve ter pelo menos texto ou imagem."
            )
        
        return attrs
    
    def create(self, validated_data):
        """Criação do post"""
        validated_data['author'] = self.context['request'].user
        return super().create(validated_data)


class CommentSerializer(serializers.ModelSerializer):
    """
    Serializer para comentários
    """
    author = UserMinimalSerializer(read_only=True)
    likes_count = serializers.SerializerMethodField()
    dislikes_count = serializers.SerializerMethodField()
    replies_count = serializers.IntegerField(read_only=True)
    is_liked = serializers.SerializerMethodField()
    is_disliked = serializers.SerializerMethodField()
    replies = serializers.SerializerMethodField()
    
    class Meta:
        model = Comment
        fields = [
            'id', 'author', 'post', 'content', 'parent_comment',
            'created_at', 'updated_at', 'likes_count', 'dislikes_count',
            'replies_count', 'is_liked', 'is_disliked', 'replies'
        ]
        read_only_fields = ['author', 'created_at', 'updated_at']
    
    def get_likes_count(self, obj):
        """Contador de likes"""
        return obj.likes.filter(is_like=True).count()
    
    def get_dislikes_count(self, obj):
        """Contador de dislikes"""
        return obj.likes.filter(is_like=False).count()
    
    def get_is_liked(self, obj):
        """Verifica se o usuário curtiu o comentário"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(user=request.user, is_like=True).exists()
        return False
    
    def get_is_disliked(self, obj):
        """Verifica se o usuário descurtiu o comentário"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(user=request.user, is_like=False).exists()
        return False
    
    def get_replies(self, obj):
        """Retorna replies se for comentário principal"""
        if not obj.parent_comment:  # Apenas comentários principais têm replies listadas
            replies = obj.replies.all()[:5]  # Limite de 5 replies iniciais
            return CommentSerializer(replies, many=True, context=self.context).data
        return []
    
    def create(self, validated_data):
        """Criação do comentário"""
        validated_data['author'] = self.context['request'].user
        return super().create(validated_data)


class LikeSerializer(serializers.ModelSerializer):
    """
    Serializer para likes/dislikes
    """
    user = UserMinimalSerializer(read_only=True)
    
    class Meta:
        model = Like
        fields = ['id', 'user', 'post', 'is_like', 'created_at']
        read_only_fields = ['user', 'created_at']


class CommentLikeSerializer(serializers.ModelSerializer):
    """
    Serializer para likes em comentários
    """
    user = UserMinimalSerializer(read_only=True)
    
    class Meta:
        model = CommentLike
        fields = ['id', 'user', 'comment', 'is_like', 'created_at']
        read_only_fields = ['user', 'created_at']


class NotificationSerializer(serializers.ModelSerializer):
    """
    Serializer para notificações
    """
    sender = UserMinimalSerializer(read_only=True)
    post = PostSerializer(read_only=True)
    
    class Meta:
        model = Notification
        fields = [
            'id', 'sender', 'notification_type', 'message', 
            'post', 'is_read', 'created_at'
        ]
        read_only_fields = ['sender', 'created_at']


class FeedSerializer(serializers.Serializer):
    """
    Serializer para feed personalizado
    """
    posts = PostSerializer(many=True, read_only=True)
    has_more = serializers.BooleanField(read_only=True)
    next_page = serializers.IntegerField(read_only=True, allow_null=True)