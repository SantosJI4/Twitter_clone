from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Router para ViewSets
router = DefaultRouter()
router.register(r'posts', views.PostViewSet, basename='post')
router.register(r'comments', views.CommentViewSet, basename='comment')

urlpatterns = [
    # Debug
    path('debug-auth/', views.debug_auth, name='debug-auth'),
    
    # Feed e explorar
    path('feed/', views.feed, name='feed'),
    path('explore/', views.explore, name='explore'),
    path('search/', views.search_posts, name='search-posts'),
    path('trending/', views.trending_hashtags, name='trending-hashtags'),
    
    # Notificações
    path('notifications/', views.notifications, name='notifications'),
    path('notifications/mark-read/', views.mark_notifications_read, name='mark-notifications-read'),
    
    # Followers e Following
    path('users/<str:username>/followers/', views.user_followers, name='user-followers'),
    path('users/<str:username>/following/', views.user_following, name='user-following'),
    path('user-posts/<str:username>/', views.user_posts, name='user-posts'),
    
    # URLs dos ViewSets
    path('', include(router.urls)),
]