from django.db import models
from django.conf import settings
from django.utils import timezone
import os

try:
    from PIL import Image
except ImportError:
    Image = None


def post_image_path(instance, filename):
    """
    Função para definir onde salvar as imagens dos posts
    """
    ext = filename.split('.')[-1]
    timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
    filename = f'{instance.author.username}_{timestamp}.{ext}'
    return os.path.join('post_images', filename)


class Post(models.Model):
    """
    Modelo para representar posts/tweets no sistema
    """
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='posts',
        verbose_name='Autor'
    )
    content = models.TextField(max_length=280, verbose_name='Conteúdo')
    image = models.ImageField(
        upload_to=post_image_path,
        blank=True,
        null=True,
        verbose_name='Imagem'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Criado em')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Atualizado em')
    
    # Para repost/retweet
    is_repost = models.BooleanField(default=False)
    original_post = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='reposts'
    )
    
    # Para posts em thread
    reply_to = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='replies'
    )
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Post'
        verbose_name_plural = 'Posts'
    
    def __str__(self):
        if self.is_repost and self.original_post:
            return f"Repost de @{self.author.username}: {self.original_post.content[:50]}..."
        return f"@{self.author.username}: {self.content[:50]}..."
    
    def save(self, *args, **kwargs):
        """
        Override do método save para redimensionar imagem do post
        """
        super().save(*args, **kwargs)
        
        if self.image and Image:
            try:
                img = Image.open(self.image.path)
                if img.height > 800 or img.width > 800:
                    output_size = (800, 800)
                    img.thumbnail(output_size)
                    img.save(self.image.path, quality=85, optimize=True)
            except Exception as e:
                print(f"Erro ao redimensionar imagem do post: {e}")
    
    def likes_count(self):
        """Retorna o número de likes do post"""
        return self.likes.filter(is_like=True).count()
    
    def dislikes_count(self):
        """Retorna o número de dislikes do post"""
        return self.likes.filter(is_like=False).count()
    
    def comments_count(self):
        """Retorna o número de comentários do post"""
        return self.comments.count()
    
    def reposts_count(self):
        """Retorna o número de reposts"""
        return self.reposts.count()
    
    def get_engagement_score(self):
        """Calcula um score de engajamento baseado nas interações"""
        likes = self.likes_count()
        comments = self.comments_count()
        reposts = self.reposts_count()
        return (likes * 1) + (comments * 2) + (reposts * 3)


class Like(models.Model):
    """
    Modelo para likes/dislikes em posts
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='user_likes',
        verbose_name='Usuário'
    )
    post = models.ForeignKey(
        Post,
        on_delete=models.CASCADE,
        related_name='likes',
        verbose_name='Post'
    )
    is_like = models.BooleanField(
        default=True,
        verbose_name='É Like'
    )  # True para like, False para dislike
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['user', 'post']
        verbose_name = 'Like'
        verbose_name_plural = 'Likes'
    
    def __str__(self):
        action = "curtiu" if self.is_like else "descurtiu"
        return f"@{self.user.username} {action} post de @{self.post.author.username}"


class Comment(models.Model):
    """
    Modelo para comentários em posts
    Suporta comentários aninhados (threads)
    """
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='comments',
        verbose_name='Autor'
    )
    post = models.ForeignKey(
        Post,
        on_delete=models.CASCADE,
        related_name='comments',
        verbose_name='Post'
    )
    content = models.TextField(max_length=280, verbose_name='Conteúdo')
    
    # Para comentários aninhados (replies)
    parent_comment = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='replies',
        verbose_name='Comentário Pai'
    )
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Criado em')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Atualizado em')
    
    class Meta:
        ordering = ['created_at']
        verbose_name = 'Comentário'
        verbose_name_plural = 'Comentários'
    
    def __str__(self):
        if self.parent_comment:
            return f"@{self.author.username} respondeu @{self.parent_comment.author.username}"
        return f"@{self.author.username} comentou no post de @{self.post.author.username}"
    
    def replies_count(self):
        """Retorna o número de respostas a este comentário"""
        return self.replies.count()
    
    def is_reply(self):
        """Verifica se é uma resposta a outro comentário"""
        return self.parent_comment is not None


class CommentLike(models.Model):
    """
    Modelo para likes em comentários
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='comment_likes',
        verbose_name='Usuário'
    )
    comment = models.ForeignKey(
        Comment,
        on_delete=models.CASCADE,
        related_name='likes',
        verbose_name='Comentário'
    )
    is_like = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['user', 'comment']
        verbose_name = 'Like em Comentário'
        verbose_name_plural = 'Likes em Comentários'
    
    def __str__(self):
        action = "curtiu" if self.is_like else "descurtiu"
        return f"@{self.user.username} {action} comentário de @{self.comment.author.username}"


class Notification(models.Model):
    """
    Modelo para notificações do sistema
    """
    NOTIFICATION_TYPES = [
        ('like', 'Like'),
        ('comment', 'Comentário'),
        ('follow', 'Novo Seguidor'),
        ('mention', 'Menção'),
        ('repost', 'Repost'),
    ]
    
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name='Destinatário'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_notifications',
        verbose_name='Remetente'
    )
    notification_type = models.CharField(
        max_length=20,
        choices=NOTIFICATION_TYPES,
        verbose_name='Tipo de Notificação'
    )
    message = models.TextField(verbose_name='Mensagem')
    post = models.ForeignKey(
        Post,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        verbose_name='Post'
    )
    is_read = models.BooleanField(default=False, verbose_name='Lida')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Criado em')
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Notificação'
        verbose_name_plural = 'Notificações'
    
    def __str__(self):
        return f"Notificação para @{self.recipient.username}: {self.message[:50]}..."
