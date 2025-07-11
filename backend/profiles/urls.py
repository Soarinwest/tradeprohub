# File: backend/profiles/urls.py
# ------------------------------
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BusinessProfileViewSet

router = DefaultRouter()
router.register('profiles', BusinessProfileViewSet, basename='profile')

urlpatterns = [
    path('', include(router.urls)),
    
    # Legacy endpoints for backward compatibility
    path('profiles/me/', BusinessProfileViewSet.as_view({
        'get': 'get_my_profile',
        'put': 'update_my_profile',
        'patch': 'update_my_profile'
    }), name='profile-me'),
]