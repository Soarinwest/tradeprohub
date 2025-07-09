# File: backend/users/views.py
# Enhanced authentication views with comprehensive features
from rest_framework import status, generics, permissions
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from .models import EmailVerificationToken, PasswordResetToken, AuditLog, UserSession
from .serializers import (
    UserRegistrationSerializer, UserLoginSerializer, PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer, EmailVerificationSerializer, 
    PasswordChangeSerializer, UserProfileSerializer
)
import logging

User = get_user_model()
logger = logging.getLogger(__name__)

class EmailBackend(ModelBackend):
    """
    Authenticate using email instead of username.
    """
    def authenticate(self, request, username=None, password=None, **kwargs):
        UserModel = get_user_model()
        email = kwargs.get('email', username)
        try:
            user = UserModel.objects.get(email=email)
        except UserModel.DoesNotExist:
            return None
        if user.check_password(password):
            return user
        return None


def get_client_ip(request):
    """Get client IP address from request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


class RegisterView(generics.CreateAPIView):
    """
    Enhanced user registration endpoint
    POST /api/v1/register/
    Creates new user account with email verification
    """
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        
        try:
            serializer.is_valid(raise_exception=True)
            user = serializer.save()
            
            # Send verification email
            self.send_verification_email(user, request)
            
            # Log registration
            AuditLog.objects.create(
                user=user,
                action='account_created',
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                details={
                    'email': user.email,
                    'account_type': user.account_type
                }
            )
            
            # Generate tokens for immediate login (optional)
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'success': True,
                'message': 'Account created successfully! Please check your email to verify your account.',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'full_name': user.get_full_name(),
                    'email_verified': user.email_verified,
                    'account_type': user.account_type
                },
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                },
                'requires_verification': True
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f'Registration failed for {request.data.get("email", "unknown")}: {str(e)}')
            
            # Return detailed validation errors
            if hasattr(serializer, 'errors') and serializer.errors:
                return Response({
                    'success': False,
                    'error': 'Registration failed',
                    'details': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
            
            return Response({
                'success': False,
                'error': 'Registration failed',
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    def send_verification_email(self, user, request):
        """Send email verification email"""
        try:
            # Get or create verification token
            verification_token = EmailVerificationToken.objects.filter(
                user=user, used=False
            ).first()
            
            if not verification_token or verification_token.is_expired:
                verification_token = EmailVerificationToken.objects.create(user=user)
            
            # Build verification URL
            verification_url = f"{request.build_absolute_uri('/verify-email')}?token={verification_token.token}"
            
            # Render email template
            context = {
                'user': user,
                'verification_url': verification_url,
                'site_name': 'TradeProHub',
            }
            
            html_message = render_to_string('emails/verify_email.html', context)
            plain_message = strip_tags(html_message)
            
            send_mail(
                subject='Verify your TradeProHub account',
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=False,
            )
            
            logger.info(f'Verification email sent to {user.email}')
            
        except Exception as e:
            logger.error(f'Failed to send verification email to {user.email}: {str(e)}')


class LoginView(generics.GenericAPIView):
    """
    Enhanced login endpoint with security features
    POST /api/v1/login/
    """
    serializer_class = UserLoginSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        
        try:
            serializer.is_valid(raise_exception=True)
            user = serializer.validated_data['user']
            
            # Generate tokens
            refresh = RefreshToken.for_user(user)
            
            # Create user session
            session_key = request.session.session_key
            if session_key:
                UserSession.objects.update_or_create(
                    user=user,
                    session_key=session_key,
                    defaults={
                        'ip_address': get_client_ip(request),
                        'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                        'is_active': True
                    }
                )
            
            # Log successful login
            AuditLog.objects.create(
                user=user,
                action='login',
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                details={'method': 'email'}
            )
            
            return Response({
                'success': True,
                'message': 'Login successful',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'full_name': user.get_full_name(),
                    'email_verified': user.email_verified,
                    'account_type': user.account_type,
                    'profile_completed': user.profile_completed,
                    'needs_password_change': user.needs_password_change
                },
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            # Log failed login attempt
            email = request.data.get('email', '')
            if email:
                AuditLog.objects.create(
                    action='login_failed',
                    ip_address=get_client_ip(request),
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    details={'email': email, 'error': str(e)}
                )
            
            # Return appropriate error response
            if hasattr(serializer, 'errors') and serializer.errors:
                return Response({
                    'success': False,
                    'error': 'Login failed',
                    'details': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
            
            return Response({
                'success': False,
                'error': 'Login failed',
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """
    Enhanced logout endpoint
    POST /api/v1/logout/
    """
    try:
        # Blacklist refresh token if provided
        refresh_token = request.data.get('refresh_token')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
        
        # Deactivate user session
        session_key = request.session.session_key
        if session_key:
            UserSession.objects.filter(
                user=request.user,
                session_key=session_key
            ).update(is_active=False)
        
        # Log logout
        AuditLog.objects.create(
            user=request.user,
            action='logout',
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        return Response({
            'success': True,
            'message': 'Logged out successfully'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f'Logout failed for user {request.user.id}: {str(e)}')
        return Response({
            'success': False,
            'error': 'Logout failed'
        }, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetRequestView(generics.GenericAPIView):
    """
    Request password reset
    POST /api/v1/password-reset/
    """
    serializer_class = PasswordResetRequestSerializer
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        
        try:
            user = User.objects.get(email=email)
            
            # Create password reset token
            reset_token = PasswordResetToken.objects.create(
                user=user,
                ip_address=get_client_ip(request)
            )
            
            # Send reset email
            self.send_reset_email(user, reset_token, request)
            
            # Log password reset request
            AuditLog.objects.create(
                user=user,
                action='password_reset',
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                details={'type': 'request'}
            )
            
        except User.DoesNotExist:
            # Don't reveal if email exists for security
            pass
        
        # Always return success to prevent email enumeration
        return Response({
            'success': True,
            'message': 'If an account with this email exists, you will receive password reset instructions.'
        }, status=status.HTTP_200_OK)

    def send_reset_email(self, user, reset_token, request):
        """Send password reset email"""
        try:
            reset_url = f"{request.build_absolute_uri('/reset-password')}?token={reset_token.token}"
            
            context = {
                'user': user,
                'reset_url': reset_url,
                'site_name': 'TradeProHub',
                'expires_at': reset_token.expires_at,
            }
            
            html_message = render_to_string('emails/password_reset.html', context)
            plain_message = strip_tags(html_message)
            
            send_mail(
                subject='Reset your TradeProHub password',
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=False,
            )
            
            logger.info(f'Password reset email sent to {user.email}')
            
        except Exception as e:
            logger.error(f'Failed to send password reset email to {user.email}: {str(e)}')


class PasswordResetConfirmView(generics.GenericAPIView):
    """
    Confirm password reset with token
    POST /api/v1/password-reset/confirm/
    """
    serializer_class = PasswordResetConfirmSerializer
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        reset_token = serializer.validated_data['reset_token']
        new_password = serializer.validated_data['password']
        
        # Reset password
        user = reset_token.user
        user.set_password(new_password)
        user.save()
        
        # Mark token as used
        reset_token.used = True
        reset_token.save()
        
        # Log password reset
        AuditLog.objects.create(
            user=user,
            action='password_reset',
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            details={'type': 'confirmed'}
        )
        
        return Response({
            'success': True,
            'message': 'Password reset successfully'
        }, status=status.HTTP_200_OK)


class EmailVerificationView(generics.GenericAPIView):
    """
    Verify email address
    POST /api/v1/verify-email/
    """
    serializer_class = EmailVerificationSerializer
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        verification_token = serializer.validated_data['token']
        user = verification_token.user
        
        # Mark email as verified
        user.email_verified = True
        user.save(update_fields=['email_verified'])
        
        # Mark token as used
        verification_token.used = True
        verification_token.save()
        
        # Log email verification
        AuditLog.objects.create(
            user=user,
            action='email_verified',
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        return Response({
            'success': True,
            'message': 'Email verified successfully'
        }, status=status.HTTP_200_OK)


class PasswordChangeView(generics.GenericAPIView):
    """
    Change password for authenticated users
    POST /api/v1/change-password/
    """
    serializer_class = PasswordChangeSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        # Change password
        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        
        # Log password change
        AuditLog.objects.create(
            user=user,
            action='password_change',
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        return Response({
            'success': True,
            'message': 'Password changed successfully'
        }, status=status.HTTP_200_OK)


class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    Get and update user profile
    GET/PUT /api/v1/profile/
    """
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        
        if response.status_code == 200:
            # Log profile update
            AuditLog.objects.create(
                user=request.user,
                action='profile_updated',
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                details={'fields_updated': list(request.data.keys())}
            )
        
        return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_auth_status(request):
    """
    Check authentication status
    GET /api/v1/auth/status/
    """
    user = request.user
    
    return Response({
        'authenticated': True,
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'full_name': user.get_full_name(),
            'email_verified': user.email_verified,
            'account_type': user.account_type,
            'profile_completed': user.profile_completed,
            'needs_password_change': user.needs_password_change
        }
    }, status=status.HTTP_200_OK)