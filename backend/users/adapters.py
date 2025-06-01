# File: backend/users/adapters.py
from allauth.account.adapter import DefaultAccountAdapter
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from django.conf import settings
from django.urls import reverse
from .models import AuditLog


class AccountAdapter(DefaultAccountAdapter):
    """
    Custom adapter for django-allauth to customize account behavior
    """
    
    def is_open_for_signup(self, request):
        """
        Whether to allow sign-ups.
        """
        return getattr(settings, 'ACCOUNT_ALLOW_REGISTRATION', True)
    
    def save_user(self, request, user, form, commit=True):
        """
        Save a new user instance using information provided in the
        signup form.
        """
        user = super().save_user(request, user, form, commit=False)
        
        # Additional user fields from the signup form
        if hasattr(form, 'cleaned_data'):
            user.first_name = form.cleaned_data.get('first_name', '')
            user.last_name = form.cleaned_data.get('last_name', '')
            user.phone_number = form.cleaned_data.get('phone_number', '')
        
        if commit:
            user.save()
            
            # Log registration
            AuditLog.objects.create(
                user=user,
                action='register',
                ip_address=self.get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                details={
                    'email': user.email,
                    'method': 'email'
                }
            )
        
        return user
    
    def get_login_redirect_url(self, request):
        """
        Returns the URL to redirect to after a successful login.
        """
        user = request.user
        
        # Check if user has completed their profile
        if hasattr(user, 'business_profile') and user.business_profile.is_complete:
            return reverse('dashboard')
        else:
            return reverse('create-profile')
    
    def get_email_confirmation_redirect_url(self, request):
        """
        The URL to redirect to after a successful email confirmation.
        """
        if request.user.is_authenticated:
            return self.get_login_redirect_url(request)
        return reverse('login')
    
    def send_confirmation_mail(self, request, emailconfirmation, signup):
        """
        Send the confirmation email with custom template
        """
        # Log email sent
        AuditLog.objects.create(
            user=emailconfirmation.email_address.user,
            action='email_sent',
            details={
                'type': 'confirmation',
                'email': emailconfirmation.email_address.email
            }
        )
        
        super().send_confirmation_mail(request, emailconfirmation, signup)
    
    def get_client_ip(self, request):
        """
        Get client IP address from request
        """
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def pre_authenticate(self, request, **credentials):
        """
        Called before authentication
        """
        # Could implement additional checks here
        pass
    
    def authentication_failed(self, request, **credentials):
        """
        Called when authentication fails
        """
        email = credentials.get('email', credentials.get('username', ''))
        
        # Log failed attempt
        AuditLog.objects.create(
            action='login_failed',
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            details={
                'email': email
            }
        )
        
        # Update failed login attempts if user exists
        from .models import User
        try:
            user = User.objects.get(email=email)
            user.failed_login_attempts += 1
            user.last_login_attempt = timezone.now()
            user.save(update_fields=['failed_login_attempts', 'last_login_attempt'])
        except User.DoesNotExist:
            pass


class SocialAccountAdapter(DefaultSocialAccountAdapter):
    """
    Custom adapter for social account authentication
    """
    
    def is_open_for_signup(self, request, sociallogin):
        """
        Whether to allow sign-ups via social accounts.
        """
        return getattr(settings, 'SOCIALACCOUNT_ALLOW_REGISTRATION', True)
    
    def pre_social_login(self, request, sociallogin):
        """
        Invoked just after a user successfully authenticates via a
        social provider, but before the login is actually processed.
        """
        # Check if social account exists
        if sociallogin.is_existing:
            return
        
        # Check if email exists
        if 'email' in sociallogin.account.extra_data:
            email = sociallogin.account.extra_data['email']
            try:
                from .models import User
                user = User.objects.get(email=email)
                # Connect social account to existing user
                sociallogin.connect(request, user)
            except User.DoesNotExist:
                pass
    
    def save_user(self, request, sociallogin, form=None):
        """
        Save a new user instance using information provided by the
        social provider.
        """
        user = super().save_user(request, sociallogin, form)
        
        # Extract additional data from social account
        data = sociallogin.account.extra_data
        
        # Update user fields based on provider
        if sociallogin.account.provider == 'google':
            user.first_name = data.get('given_name', '')
            user.last_name = data.get('family_name', '')
            user.email_verified = data.get('email_verified', False)
        
        user.save()
        
        # Log social registration
        AuditLog.objects.create(
            user=user,
            action='register',
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            details={
                'email': user.email,
                'method': f'social_{sociallogin.account.provider}'
            }
        )
        
        return user
    
    def get_client_ip(self, request):
        """
        Get client IP address from request
        """
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip