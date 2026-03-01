from django.shortcuts import get_object_or_404
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q, Count, Prefetch
from django.db import transaction
from django.utils import timezone
from django.core.paginator import Paginator
from collections import Counter
import re
import logging

logger = logging.getLogger(__name__)

from .models import Post, Like, Comment, CommentLike, Notification
from .serializers import (
    PostSerializer, PostCreateSerializer, CommentSerializer,
    LikeSerializer, CommentLikeSerializer, NotificationSerializer,
    FeedSerializer
)
from accounts.models import User, Follow
from accounts.serializers import UserProfileSerializer


class PostPagination(PageNumberPagination):
    """Paginação customizada para posts"""
    page_size = 15
    page_size_query_param = 'page_size'
    max_page_size = 50


class PostViewSet(ModelViewSet):
    """
    ViewSet para gerenciamento de posts
    """
    queryset = Post.objects.all().select_related('author', 'original_post', 'reply_to') \
        .prefetch_related('likes', 'comments') \
        .annotate(
            likes_count=Count('likes', filter=Q(likes__is_like=True), distinct=True),
            dislikes_count=Count('likes', filter=Q(likes__is_like=False), distinct=True),
            comments_count=Count('comments', distinct=True),
            reposts_count=Count('reposts', distinct=True)
        )
    serializer_class = PostSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = PostPagination
    
    def get_serializer_class(self):
        if self.action == 'create':
            return PostCreateSerializer
        return PostSerializer
    
    def get_queryset(self):
        return self.queryset.order_by('-created_at')
    
    def create(self, request, *args, **kwargs):
        """Criar post e retornar com todos os dados"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Usar transação para garantir que o post seja salvo
        with transaction.atomic():
            self.perform_create(serializer)
            
            # Recarregar o post com todas as anotações
            post = Post.objects.select_related('author', 'original_post', 'reply_to') \
                .prefetch_related('likes', 'comments') \
                .annotate(
                    likes_count=Count('likes', filter=Q(likes__is_like=True), distinct=True),
                    dislikes_count=Count('likes', filter=Q(likes__is_like=False), distinct=True),
                    comments_count=Count('comments', distinct=True),
                    reposts_count=Count('reposts', distinct=True)
                ).get(id=serializer.instance.id)
            
            output_serializer = PostSerializer(post, context={'request': request})
            logger.info(f"Post {post.id} created by {request.user.username}")
            return Response(output_serializer.data, status=status.HTTP_201_CREATED)
    
    def perform_create(self, serializer):
        """Criar post com autor automaticamente"""
        serializer.save(author=self.request.user)
    
    def destroy(self, request, *args, **kwargs):
        """Só permite deletar próprios posts"""
        post = self.get_object()
        if post.author != request.user:
            return Response(
                {'error': 'Você só pode deletar seus próprios posts'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)
    
    @action(detail=True, methods=['post'])
    def like(self, request, pk=None):
        """Curtir um post"""
        post = self.get_object()
        
        with transaction.atomic():
            like, created = Like.objects.get_or_create(
                user=request.user,
                post=post,
                defaults={'is_like': True}
            )
            
            if not created:
                if like.is_like:
                    like.delete()
                    logger.info(f"Like removed: user {request.user.id}, post {post.id}")
                    return Response({
                        'message': 'Like removido',
                        'liked': False
                    })
                else:
                    like.is_like = True
                    like.save()
            
            # Criar notificação se não for próprio post
            if post.author != request.user:
                Notification.objects.get_or_create(
                    recipient=post.author,
                    sender=request.user,
                    notification_type='like',
                    post=post,
                    defaults={'message': f'@{request.user.username} curtiu seu post'}
                )
            
            logger.info(f"Post liked: user {request.user.id}, post {post.id}")
            return Response({
                'message': 'Post curtido',
                'liked': True
            })
    
    @action(detail=True, methods=['post'])
    def dislike(self, request, pk=None):
        """Descurtir um post"""
        post = self.get_object()
        
        with transaction.atomic():
            like, created = Like.objects.get_or_create(
                user=request.user,
                post=post,
                defaults={'is_like': False}
            )
            
            if not created:
                if not like.is_like:
                    like.delete()
                    logger.info(f"Dislike removed: user {request.user.id}, post {post.id}")
                    return Response({
                        'message': 'Dislike removido',
                        'disliked': False
                    })
                else:
                    like.is_like = False
                    like.save()
            
            logger.info(f"Post disliked: user {request.user.id}, post {post.id}")
            return Response({
                'message': 'Post descurtido',
                'disliked': True
            })
    
    @action(detail=True, methods=['post'])
    def repost(self, request, pk=None):
        """Repostar um post"""
        original_post = self.get_object()
        
        if original_post.author == request.user:
            return Response(
                {'error': 'Você não pode repostar seu próprio post'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verificar se já fez repost
        existing_repost = Post.objects.filter(
            author=request.user,
            is_repost=True,
            original_post=original_post
        ).exists()
        
        if existing_repost:
            return Response(
                {'error': 'Você já fez repost deste post'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Criar repost
        repost = Post.objects.create(
            author=request.user,
            content=f"Repost de @{original_post.author.username}",
            is_repost=True,
            original_post=original_post
        )
        
        # Criar notificação
        Notification.objects.create(
            recipient=original_post.author,
            sender=request.user,
            notification_type='repost',
            post=original_post,
            message=f'@{request.user.username} fez repost do seu post'
        )
        
        return Response({
            'message': 'Post repostado com sucesso',
            'repost': PostSerializer(repost, context={'request': request}).data
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['get'])
    def comments(self, request, pk=None):
        """Listar comentários de um post"""
        post = self.get_object()
        comments = Comment.objects.filter(post=post, parent_comment=None) \
            .select_related('author') \
            .prefetch_related(
                Prefetch('replies', queryset=Comment.objects.select_related('author')),
                'likes'
            ) \
            .order_by('created_at')
        
        # Sempre paginar para consistência na API
        page = self.paginate_queryset(comments)
        if page is not None:
            serializer = CommentSerializer(
                page, many=True, context={'request': request}
            )
            return self.get_paginated_response(serializer.data)
        
        # Se não há página, retornar em formato paginado mesmo assim
        serializer = CommentSerializer(
            comments, many=True, context={'request': request}
        )
        # Retornar no formato consistente com resultados paginados
        return Response({
            'count': comments.count(),
            'next': None,
            'previous': None,
            'results': serializer.data
        })


class CommentViewSet(ModelViewSet):
    """
    ViewSet para gerenciamento de comentários
    """
    queryset = Comment.objects.all().select_related('author', 'post', 'parent_comment')
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = PostPagination
    
    def perform_create(self, serializer):
        """Criar comentário com autor automaticamente"""
        with transaction.atomic():
            comment = serializer.save(author=self.request.user)
            
            # Criar notificação para autor do post
            if comment.post.author != self.request.user:
                Notification.objects.create(
                    recipient=comment.post.author,
                    sender=self.request.user,
                    notification_type='comment',
                    post=comment.post,
                    message=f'@{self.request.user.username} comentou no seu post'
                )
            
            # Se for resposta a comentário, notificar autor do comentário pai
            if comment.parent_comment and comment.parent_comment.author != self.request.user:
                Notification.objects.create(
                    recipient=comment.parent_comment.author,
                    sender=self.request.user,
                    notification_type='comment',
                    post=comment.post,
                    message=f'@{self.request.user.username} respondeu seu comentário'
                )
            
            logger.info(f"Comment {comment.id} created by {self.request.user.username} on post {comment.post.id}")
    
    def destroy(self, request, *args, **kwargs):
        """Só permite deletar próprios comentários"""
        comment = self.get_object()
        if comment.author != request.user:
            return Response(
                {'error': 'Você só pode deletar seus próprios comentários'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)
    
    @action(detail=True, methods=['post'])
    def like(self, request, pk=None):
        """Curtir um comentário"""
        comment = self.get_object()
        comment_like, created = CommentLike.objects.get_or_create(
            user=request.user,
            comment=comment,
            defaults={'is_like': True}
        )
        
        if not created:
            if comment_like.is_like:
                comment_like.delete()
                return Response({
                    'message': 'Like removido',
                    'liked': False
                })
            else:
                comment_like.is_like = True
                comment_like.save()
        
        return Response({
            'message': 'Comentário curtido',
            'liked': True
        })
    
    @action(detail=True, methods=['post'])
    def dislike(self, request, pk=None):
        """Descurtir um comentário"""
        comment = self.get_object()
        comment_like, created = CommentLike.objects.get_or_create(
            user=request.user,
            comment=comment,
            defaults={'is_like': False}
        )
        
        if not created:
            if not comment_like.is_like:
                comment_like.delete()
                return Response({
                    'message': 'Dislike removido',
                    'disliked': False
                })
            else:
                comment_like.is_like = False
                comment_like.save()
        
        return Response({
            'message': 'Comentário descurtido',
            'disliked': True
        })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def debug_auth(request):
    """Debug endpoint para testar autenticação"""
    return Response({
        'authenticated': request.user.is_authenticated,
        'user': str(request.user),
        'auth_header': request.META.get('HTTP_AUTHORIZATION', 'NOT SENT'),
        'method': request.method,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def feed(request):
    """
    Feed personalizado do usuário - apenas posts de quem segue
    """
    user = request.user
    
    # IDs dos usuários que o usuário atual está seguindo
    following_ids = user.following.values_list('id', flat=True)
    
    # Adicionar próprios posts também
    user_ids = list(following_ids) + [user.id]
    
    # Buscar posts dos usuários seguidos
    posts = Post.objects.filter(author_id__in=user_ids) \
        .select_related('author', 'original_post', 'reply_to') \
        .prefetch_related('likes', 'comments') \
        .annotate(
            likes_count=Count('likes', filter=Q(likes__is_like=True), distinct=True),
            dislikes_count=Count('likes', filter=Q(likes__is_like=False), distinct=True),
            comments_count=Count('comments', distinct=True),
            reposts_count=Count('reposts', distinct=True)
        ) \
        .order_by('-created_at')
    
    logger.info(f"Feed loaded for user {user.username}: {posts.count()} posts from {len(user_ids)} users")
    
    # Paginação
    paginator = PostPagination()
    page = paginator.paginate_queryset(posts, request)
    
    if page is not None:
        serializer = PostSerializer(page, many=True, context={'request': request})
        return paginator.get_paginated_response(serializer.data)
    
    serializer = PostSerializer(posts, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def explore(request):
    """
    Página de explorar - posts populares de todos os usuários
    """
    # Posts mais populares baseados em engajamento
    posts = Post.objects.all() \
        .select_related('author', 'original_post') \
        .prefetch_related('likes', 'comments') \
        .annotate(
            likes_count=Count('likes', filter=Q(likes__is_like=True), distinct=True),
            dislikes_count=Count('likes', filter=Q(likes__is_like=False), distinct=True),
            comments_count=Count('comments', distinct=True),
            reposts_count=Count('reposts', distinct=True),
            engagement_score=(
                Count('likes', filter=Q(likes__is_like=True), distinct=True) + 
                Count('comments', distinct=True) * 2 + 
                Count('reposts', distinct=True) * 3
            )
        ) \
        .filter(created_at__gte=timezone.now() - timezone.timedelta(days=7)) \
        .order_by('-engagement_score', '-created_at')
    
    logger.info(f"Explore loaded: {posts.count()} popular posts")
    
    # Paginação
    paginator = PostPagination()
    page = paginator.paginate_queryset(posts, request)
    
    if page is not None:
        serializer = PostSerializer(page, many=True, context={'request': request})
        return paginator.get_paginated_response(serializer.data)
    
    serializer = PostSerializer(posts, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def notifications(request):
    """
    Lista de notificações do usuário
    """
    user_notifications = Notification.objects.filter(recipient=request.user) \
        .select_related('sender', 'post', 'post__author') \
        .order_by('-created_at')
    
    # Paginação
    paginator = PostPagination()
    page = paginator.paginate_queryset(user_notifications, request)
    
    if page is not None:
        serializer = NotificationSerializer(
            page, many=True, context={'request': request}
        )
        return paginator.get_paginated_response(serializer.data)
    
    serializer = NotificationSerializer(
        user_notifications, many=True, context={'request': request}
    )
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_notifications_read(request):
    """
    Marcar notificações como lidas
    """
    notification_ids = request.data.get('notification_ids', [])
    
    if notification_ids:
        Notification.objects.filter(
            id__in=notification_ids,
            recipient=request.user
        ).update(is_read=True)
    else:
        # Marcar todas como lidas
        Notification.objects.filter(
            recipient=request.user,
            is_read=False
        ).update(is_read=True)
    
    return Response({'message': 'Notificações marcadas como lidas'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_followers(request, username):
    """
    Lista de seguidores de um usuário
    """
    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response(
            {'error': f'Usuário {username} não encontrado'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Buscar all Follow relationships onde este usuário é o 'followed'
    followers = Follow.objects.filter(followed=user) \
        .select_related('follower')
    
    # Serializar
    follower_users = [f.follower for f in followers]
    serializer = UserProfileSerializer(follower_users, many=True, context={'request': request})
    
    return Response({
        'count': len(follower_users),
        'results': serializer.data
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_following(request, username):
    """
    Lista de usuários que um usuário segue (Seguindo)
    """
    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response(
            {'error': f'Usuário {username} não encontrado'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Buscar all Follow relationships onde este usuário é o 'follower'
    following = Follow.objects.filter(follower=user) \
        .select_related('followed')
    
    # Serializar
    following_users = [f.followed for f in following]
    serializer = UserProfileSerializer(following_users, many=True, context={'request': request})
    
    return Response({
        'count': len(following_users),
        'results': serializer.data
    })


@api_view(['GET'])
@permission_classes([AllowAny])  # Permite ver posts de qualquer um
def user_posts(request, username):
    """
    Posts de um usuário
    """
    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response(
            {'error': f'Usuário {username} não encontrado'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Buscar posts do usuário
    posts = Post.objects.filter(author=user) \
        .select_related('author') \
        .prefetch_related('likes', 'comments', 'reposts') \
        .order_by('-created_at')
    
    # Paginação
    paginator = Paginator(posts, 10)
    page_number = request.query_params.get('page', 1)
    page_obj = paginator.get_page(page_number)
    
    # Serializar
    serializer = PostSerializer(page_obj, many=True, context={'request': request})
    
    return Response({
        'count': paginator.count,
        'next': f"{request.build_absolute_uri(request.path)}?page={page_obj.next_page_number()}" if page_obj.has_next() else None,
        'previous': f"{request.build_absolute_uri(request.path)}?page={page_obj.previous_page_number()}" if page_obj.has_previous() else None,
        'results': serializer.data
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_posts(request):
    """
    Buscar posts por texto ou hashtag
    """
    query = request.query_params.get('q', '').strip()
    if not query:
        return Response({'results': [], 'count': 0})

    posts = Post.objects.filter(
        Q(content__icontains=query) |
        Q(author__username__icontains=query) |
        Q(author__first_name__icontains=query) |
        Q(author__last_name__icontains=query)
    ).select_related('author', 'original_post') \
     .prefetch_related('likes', 'comments') \
     .annotate(
        likes_count=Count('likes', filter=Q(likes__is_like=True), distinct=True),
        comments_count=Count('comments', distinct=True),
        reposts_count=Count('reposts', distinct=True)
     ).order_by('-created_at')

    paginator = PostPagination()
    page = paginator.paginate_queryset(posts, request)

    if page is not None:
        serializer = PostSerializer(page, many=True, context={'request': request})
        return paginator.get_paginated_response(serializer.data)

    serializer = PostSerializer(posts, many=True, context={'request': request})
    return Response({'results': serializer.data, 'count': posts.count()})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def trending_hashtags(request):
    """
    Retorna as hashtags mais usadas nos últimos 7 dias
    """
    recent_posts = Post.objects.filter(
        created_at__gte=timezone.now() - timezone.timedelta(days=7),
        content__contains='#'
    ).values_list('content', flat=True)

    hashtag_pattern = re.compile(r'#(\w+)', re.UNICODE)
    counter = Counter()

    for content in recent_posts:
        tags = hashtag_pattern.findall(content)
        for tag in tags:
            counter[tag.lower()] += 1

    trending = [
        {'hashtag': f'#{tag}', 'count': count}
        for tag, count in counter.most_common(10)
    ]

    return Response(trending)