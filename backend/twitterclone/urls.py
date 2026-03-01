"""
URL configuration for twitterclone project.

Sistema de rede social similar ao Twitter
Desenvolvido por Maurício Santana
"""

from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views


urlpatterns = [
    # Admin
    path("admin/", admin.site.urls),
    
    # JWT Token endpoints
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # API endpoints (ANTES do catch-all!)
    path('api/auth/', include('accounts.urls')),
    path('api/social/', include('social.urls')),
    
    # API status
    path('api/health/', views.health_check, name='health_check'),
    path('api/status/', views.api_status, name='api_status'),
]

# Servir arquivos de mídia durante desenvolvimento (ANTES do catch-all)
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

# Adicionar rotas de assets e catch-all SPA POR ÚLTIMO
urlpatterns += [
    # Servir arquivos estáticos do frontend (com regex específico)
    re_path(r'^assets/(?P<path>.*)$', serve, {'document_root': str(settings.BASE_DIR.parent / 'frontend' / 'assets')}),
    
    # Frontend SPA - deve ser a última rota para catch-all
    re_path(r'^(?!api|admin|assets|media).*$', views.FrontendAppView.as_view(), name='frontend'),
]
