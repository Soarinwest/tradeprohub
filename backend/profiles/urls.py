from django.urls import path
from .views import RegisterView, ProfileCreateView, MyProfileView

urlpatterns = [
    # User can sign up:
    path('register/', RegisterView.as_view(), name='register'),
    # Create your profile (after signup):
    path('profile/', ProfileCreateView.as_view(), name='profile-create'),
    # Fetch & update your profile:
    path('my-profile/', MyProfileView.as_view(), name='my-profile'),
]