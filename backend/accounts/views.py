from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q, Count
from django.db import transaction
import logging

logger = logging.getLogger(__name__)

from .models import User, Follow, UserProfile
from .serializers import (
    UserRegistrationSerializer, UserLoginSerializer, UserProfileSerializer,
    UserProfileUpdateSerializer, FollowSerializer, UserMinimalSerializer,
    UserProfileStepSerializer, PasswordChangeSerializer
)

User = get_user_model()


class UserPagination(PageNumberPagination):
    """Paginação customizada para usuários"""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class RegisterView(APIView):
    """
    View para registro de novos usuários
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            # Gerar tokens JWT
            refresh = RefreshToken.for_user(user)
            access_token = refresh.access_token
            
            return Response({
                'message': 'Usuário criado com sucesso',
                'user': UserProfileSerializer(user).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(access_token),
                }
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    """
    View para login de usuários
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = UserLoginSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            user = serializer.validated_data['user']
            
            # Gerar tokens JWT
            refresh = RefreshToken.for_user(user)
            access_token = refresh.access_token
            
            return Response({
                'message': 'Login realizado com sucesso',
                'user': UserProfileSerializer(user).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(access_token),
                }
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserProfileViewSet(ModelViewSet):
    """
    ViewSet para gerenciamento de perfis de usuários
    """
    queryset = User.objects.all().annotate(
        followers_count=Count('followers', distinct=True),
        following_count=Count('following', distinct=True)
    )
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = UserPagination
    lookup_field = 'username'
    
    def get_serializer_class(self):
        if self.action in ['update', 'partial_update']:
            return UserProfileUpdateSerializer
        return UserProfileSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        search = self.request.query_params.get('search', None)
        
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)
            )
        
        return queryset.order_by('-created_at')
    
    @action(detail=True, methods=['post'])
    def follow(self, request, username=None):
        """Seguir um usuário"""
        target_user = self.get_object()
        
        if target_user == request.user:
            return Response(
                {'error': 'Você não pode seguir a si mesmo'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            follow, created = Follow.objects.get_or_create(
                follower=request.user,
                followed=target_user
            )
            
            if created:
                logger.info(f"User {request.user.username} followed {target_user.username}")
                return Response({
                    'message': f'Agora você está seguindo @{target_user.username}'
                }, status=status.HTTP_201_CREATED)
            else:
                logger.info(f"User {request.user.username} already following {target_user.username}")
                return Response({
                    'message': f'Você já está seguindo @{target_user.username}'
                }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def unfollow(self, request, username=None):
        """Deixar de seguir um usuário"""
        target_user = self.get_object()
        
        try:
            follow = Follow.objects.get(
                follower=request.user,
                followed=target_user
            )
            follow.delete()
            return Response({
                'message': f'Você deixou de seguir @{target_user.username}'
            }, status=status.HTTP_200_OK)
        except Follow.DoesNotExist:
            return Response({
                'error': f'Você não está seguindo @{target_user.username}'
            }, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['get'])
    def followers(self, request, username=None):
        """Lista de seguidores de um usuário"""
        user = self.get_object()
        followers = User.objects.filter(following__followed=user)
        
        page = self.paginate_queryset(followers)
        if page is not None:
            serializer = UserMinimalSerializer(
                page, many=True, context={'request': request}
            )
            return self.get_paginated_response(serializer.data)
        
        serializer = UserMinimalSerializer(
            followers, many=True, context={'request': request}
        )
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def following(self, request, username=None):
        """Lista de usuários que o usuário está seguindo"""
        user = self.get_object()
        following = User.objects.filter(followers__follower=user)
        
        page = self.paginate_queryset(following)
        if page is not None:
            serializer = UserMinimalSerializer(
                page, many=True, context={'request': request}
            )
            return self.get_paginated_response(serializer.data)
        
        serializer = UserMinimalSerializer(
            following, many=True, context={'request': request}
        )
        return Response(serializer.data)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def my_profile(request):
    """
    View para gerenciar o próprio perfil
    """
    if request.method == 'GET':
        serializer = UserProfileSerializer(
            request.user, context={'request': request}
        )
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        serializer = UserProfileUpdateSerializer(
            request.user, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response({
                'message': 'Perfil atualizado com sucesso',
                'user': UserProfileSerializer(request.user, context={'request': request}).data
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """
    View para mudança de senha
    """
    serializer = PasswordChangeSerializer(
        data=request.data, 
        context={'request': request}
    )
    
    if serializer.is_valid():
        serializer.save()
        return Response({
            'message': 'Senha alterada com sucesso'
        }, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def onboarding(request):
    """
    View para gerenciar onboarding do usuário
    """
    profile, created = UserProfile.objects.get_or_create(user=request.user)
    
    if request.method == 'GET':
        serializer = UserProfileStepSerializer(profile)
        return Response({
            'profile_setup': serializer.data,
            'user': UserProfileSerializer(request.user, context={'request': request}).data
        })
    
    elif request.method == 'POST':
        step = request.data.get('step')
        
        # Atualizar dados do usuário baseado na etapa
        if step == 1:  # Informações básicas
            user_data = {
                'first_name': request.data.get('first_name'),
                'last_name': request.data.get('last_name'),
                'bio': request.data.get('bio', '')
            }
            user_serializer = UserProfileUpdateSerializer(
                request.user, data=user_data, partial=True
            )
            if user_serializer.is_valid():
                user_serializer.save()
                profile.onboarding_step = 2
                profile.save()
            else:
                return Response(user_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        elif step == 2:  # Foto de perfil
            profile_image = request.FILES.get('profile_image')
            if profile_image:
                request.user.profile_image = profile_image
                request.user.save()
            profile.onboarding_step = 3
            profile.save()
        
        elif step == 3:  # Data de nascimento e localização
            user_data = {
                'date_of_birth': request.data.get('date_of_birth'),
                'location': request.data.get('location', '')
            }
            user_serializer = UserProfileUpdateSerializer(
                request.user, data=user_data, partial=True
            )
            if user_serializer.is_valid():
                user_serializer.save()
                profile.onboarding_step = 4
                profile.profile_completed = True
                profile.save()
            else:
                return Response(user_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            'message': 'Etapa concluída com sucesso',
            'profile_setup': UserProfileStepSerializer(profile).data,
            'user': UserProfileSerializer(request.user, context={'request': request}).data
        })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def suggested_users(request):
    """
    View para sugerir usuários para seguir
    """
    user = request.user
    
    # Usuários que o usuário atual não está seguindo e não é ele mesmo
    following_ids = user.following.values_list('id', flat=True)
    
    suggested = User.objects.exclude(
        Q(id__in=following_ids) | Q(id=user.id)
    ).annotate(
        followers_count=Count('followers', distinct=True)
    ).order_by('-followers_count')[:10]
    
    logger.info(f"Suggested users loaded for {user.username}: {suggested.count()} users")
    
    serializer = UserMinimalSerializer(
        suggested, many=True, context={'request': request}
    )
    return Response(serializer.data)
