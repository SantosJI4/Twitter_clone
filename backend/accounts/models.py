from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.text import slugify
import os

try:
    from PIL import Image
except ImportError:
    Image = None


def user_profile_image_path(instance, filename):
    """
    Função para definir onde salvar as imagens de perfil dos usuários
    """
    ext = filename.split('.')[-1]
    filename = f'{instance.username}_profile.{ext}'
    return os.path.join('profile_pics', filename)


class User(AbstractUser):
    """
    Modelo de usuário customizado baseado no AbstractUser do Django
    Inclui campos específicos para rede social
    """
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=30, unique=True)
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    bio = models.TextField(max_length=500, blank=True, null=True)
    profile_image = models.ImageField(
        upload_to=user_profile_image_path, 
        blank=True,
        null=True
    )
    date_of_birth = models.DateField(blank=True, null=True)
    location = models.CharField(max_length=100, blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    is_private = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Campos para seguir outros usuários
    following = models.ManyToManyField(
        'self',
        through='Follow',
        symmetrical=False,
        related_name='followers',
        blank=True
    )
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']
    
    class Meta:
        db_table = 'accounts_user'
        verbose_name = 'Usuário'
        verbose_name_plural = 'Usuários'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"@{self.username} ({self.get_full_name()})"
    
    def get_full_name(self):
        """Retorna o nome completo do usuário"""
        return f"{self.first_name} {self.last_name}".strip()
    
    def get_short_name(self):
        """Retorna o primeiro nome do usuário"""
        return self.first_name
    
    def save(self, *args, **kwargs):
        """
        Override do método save para redimensionar imagem de perfil
        """
        super().save(*args, **kwargs)
        
        if self.profile_image and Image:
            try:
                img = Image.open(self.profile_image.path)
                if img.height > 300 or img.width > 300:
                    output_size = (300, 300)
                    img.thumbnail(output_size)
                    img.save(self.profile_image.path)
            except Exception as e:
                print(f"Erro ao redimensionar imagem: {e}")
    
    def followers_count(self):
        """Retorna o número de seguidores"""
        return self.followers.count()
    
    def following_count(self):
        """Retorna o número de usuários que está seguindo"""
        return self.following.count()
    
    def is_following(self, user):
        """Verifica se está seguindo um usuário específico"""
        return self.following.filter(id=user.id).exists()


class Follow(models.Model):
    """
    Modelo para representar relacionamento de seguir entre usuários
    """
    follower = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='following_set',
        verbose_name='Seguidor'
    )
    followed = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='followers_set',
        verbose_name='Seguido'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['follower', 'followed']
        ordering = ['-created_at']
        verbose_name = 'Seguir'
        verbose_name_plural = 'Seguidores'
    
    def __str__(self):
        return f"{self.follower.username} segue {self.followed.username}"
    
    def save(self, *args, **kwargs):
        """Impede que um usuário siga a si mesmo"""
        if self.follower == self.followed:
            raise ValueError("Um usuário não pode seguir a si mesmo")
        super().save(*args, **kwargs)


class UserProfile(models.Model):
    """
    Modelo para informações adicionais do perfil do usuário
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    profile_completed = models.BooleanField(default=False)
    onboarding_step = models.IntegerField(default=0)  # Para controlar etapas do formulário
    privacy_settings = models.JSONField(default=dict, blank=True)
    notification_settings = models.JSONField(default=dict, blank=True)
    
    class Meta:
        verbose_name = 'Perfil do Usuário'
        verbose_name_plural = 'Perfis dos Usuários'
    
    def __str__(self):
        return f"Perfil de {self.user.username}"
