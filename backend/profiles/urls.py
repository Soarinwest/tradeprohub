# File: backend/profiles/urls.py
# ------------------------------
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BusinessProfileViewSet

router = DefaultRouter()
router.register('profiles', BusinessProfileViewSet, basename='profile')

urlpatterns = [
    path('', include(router.urls)),
]