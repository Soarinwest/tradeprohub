# File: backend/users/urls.py
# Enhanced URL configuration for authentication endpoints
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, LoginView, logout_view,
    PasswordResetRequestView, PasswordResetConfirmView,
    EmailVerificationView, PasswordChangeView,
    UserProfileView, check_auth_status
)

urlpatterns = [
    # Authentication endpoints
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', logout_view, name='logout'),
    
    # Token management (kept for backward compatibility)
    path('token/', LoginView.as_view(), name='token_obtain_pair'),  # Alias for login
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Password management
    path('password-reset/', PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('change-password/', PasswordChangeView.as_view(), name='password_change'),
    
    # Email verification
    path('verify-email/', EmailVerificationView.as_view(), name='email_verification'),
    
    # User profile management
    path('profile/', UserProfileView.as_view(), name='user_profile'),
    
    # Authentication status
    path('auth/status/', check_auth_status, name='auth_status'),
]