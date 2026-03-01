from django.contrib import admin
from django.utils.html import format_html
from .models import Post, Like, Comment, CommentLike, Notification


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    """
    Configuração do admin para o modelo Post
    """
    list_display = [
        'author', 'content_preview', 'has_image', 'is_repost',
        'likes_count', 'comments_count', 'created_at'
    ]
    list_filter = ['is_repost', 'created_at']
    search_fields = ['author__username', 'content']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']
    
    def content_preview(self, obj):
        """Exibe uma prévia do conteúdo"""
        return obj.content[:50] + "..." if len(obj.content) > 50 else obj.content
    content_preview.short_description = 'Conteúdo'
    
    def has_image(self, obj):
        """Indica se o post tem imagem"""
        if obj.image:
            return format_html('<span style="color: green;">✓</span>')
        return format_html('<span style="color: red;">✗</span>')
    has_image.short_description = 'Imagem'
    
    def get_queryset(self, request):
        """Override para otimizar consultas"""
        qs = super().get_queryset(request)
        return qs.select_related('author', 'original_post', 'reply_to') \
                 .prefetch_related('likes', 'comments')


@admin.register(Like)
class LikeAdmin(admin.ModelAdmin):
    """
    Configuração do admin para o modelo Like
    """
    list_display = ['user', 'post_preview', 'is_like', 'created_at']
    list_filter = ['is_like', 'created_at']
    search_fields = ['user__username', 'post__content']
    readonly_fields = ['created_at']
    
    def post_preview(self, obj):
        """Exibe uma prévia do post"""
        return obj.post.content[:30] + "..." if len(obj.post.content) > 30 else obj.post.content
    post_preview.short_description = 'Post'
    
    def get_queryset(self, request):
        """Override para otimizar consultas"""
        qs = super().get_queryset(request)
        return qs.select_related('user', 'post', 'post__author')


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    """
    Configuração do admin para o modelo Comment
    """
    list_display = [
        'author', 'post_preview', 'content_preview', 
        'is_reply', 'replies_count', 'created_at'
    ]
    list_filter = ['created_at']
    search_fields = ['author__username', 'content', 'post__content']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']
    
    def content_preview(self, obj):
        """Exibe uma prévia do comentário"""
        return obj.content[:50] + "..." if len(obj.content) > 50 else obj.content
    content_preview.short_description = 'Comentário'
    
    def post_preview(self, obj):
        """Exibe uma prévia do post"""
        return obj.post.content[:30] + "..." if len(obj.post.content) > 30 else obj.post.content
    post_preview.short_description = 'Post'
    
    def get_queryset(self, request):
        """Override para otimizar consultas"""
        qs = super().get_queryset(request)
        return qs.select_related('author', 'post', 'post__author', 'parent_comment') \
                 .prefetch_related('replies')


@admin.register(CommentLike)
class CommentLikeAdmin(admin.ModelAdmin):
    """
    Configuração do admin para o modelo CommentLike
    """
    list_display = ['user', 'comment_preview', 'is_like', 'created_at']
    list_filter = ['is_like', 'created_at']
    search_fields = ['user__username', 'comment__content']
    readonly_fields = ['created_at']
    
    def comment_preview(self, obj):
        """Exibe uma prévia do comentário"""
        return obj.comment.content[:30] + "..." if len(obj.comment.content) > 30 else obj.comment.content
    comment_preview.short_description = 'Comentário'
    
    def get_queryset(self, request):
        """Override para otimizar consultas"""
        qs = super().get_queryset(request)
        return qs.select_related('user', 'comment', 'comment__author')


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    """
    Configuração do admin para o modelo Notification
    """
    list_display = [
        'recipient', 'sender', 'notification_type', 
        'message_preview', 'is_read', 'created_at'
    ]
    list_filter = ['notification_type', 'is_read', 'created_at']
    search_fields = ['recipient__username', 'sender__username', 'message']
    readonly_fields = ['created_at']
    ordering = ['-created_at']
    
    def message_preview(self, obj):
        """Exibe uma prévia da mensagem"""
        return obj.message[:50] + "..." if len(obj.message) > 50 else obj.message
    message_preview.short_description = 'Mensagem'
    
    def get_queryset(self, request):
        """Override para otimizar consultas"""
        qs = super().get_queryset(request)
        return qs.select_related('recipient', 'sender', 'post')
