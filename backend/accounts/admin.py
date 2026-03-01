from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from .models import User, Follow, UserProfile


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Configuração do admin para o modelo User customizado
    """
    list_display = [
        'username', 'email', 'first_name', 'last_name', 
        'is_verified', 'is_private', 'followers_count', 
        'following_count', 'created_at'
    ]
    list_filter = [
        'is_verified', 'is_private', 'is_staff', 'is_superuser',
        'is_active', 'created_at'
    ]
    search_fields = ['username', 'email', 'first_name', 'last_name']
    readonly_fields = ['created_at', 'updated_at', 'last_login']
    ordering = ['-created_at']
    
    # Campos exibidos no formulário de edição
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Informações do Perfil', {
            'fields': (
                'bio', 'profile_image', 'date_of_birth', 
                'location', 'website'
            )
        }),
        ('Configurações da Conta', {
            'fields': (
                'is_verified', 'is_private'
            )
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        """
        Override para otimizar consultas
        """
        qs = super().get_queryset(request)
        return qs.prefetch_related('followers', 'following')


@admin.register(Follow)
class FollowAdmin(admin.ModelAdmin):
    """
    Configuração do admin para o modelo Follow
    """
    list_display = ['follower', 'followed', 'created_at']
    list_filter = ['created_at']
    search_fields = ['follower__username', 'followed__username']
    readonly_fields = ['created_at']
    
    def get_queryset(self, request):
        """
        Override para otimizar consultas
        """
        qs = super().get_queryset(request)
        return qs.select_related('follower', 'followed')


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    """
    Configuração do admin para o modelo UserProfile
    """
    list_display = [
        'user', 'profile_completed', 'onboarding_step'
    ]
    list_filter = ['profile_completed', 'onboarding_step']
    search_fields = ['user__username', 'user__email']
    readonly_fields = ['user']
    
    def get_queryset(self, request):
        """
        Override para otimizar consultas
        """
        qs = super().get_queryset(request)
        return qs.select_related('user')
