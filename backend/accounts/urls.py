from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Router para ViewSets
router = DefaultRouter()
router.register(r'users', views.UserProfileViewSet, basename='user')

urlpatterns = [
    # Autenticação
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    
    # Perfil do usuário logado
    path('profile/', views.my_profile, name='my-profile'),
    path('change-password/', views.change_password, name='change-password'),
    path('onboarding/', views.onboarding, name='onboarding'),
    
    # Sugestões
    path('suggested-users/', views.suggested_users, name='suggested-users'),
    
    # URLs dos ViewSets
    path('', include(router.urls)),
]