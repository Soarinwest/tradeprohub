# File: backend/users/models.py
# -----------------------------
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _
from phonenumber_field.modelfields import PhoneNumberField


class User(AbstractUser):
    """
    Custom User model for TradeProHub
    Uses email as the primary authentication field
    """
    username = None  # Remove username field
    email = models.EmailField(_('email address'), unique=True)
    
    # Additional fields
    phone_number = PhoneNumberField(
        _('phone number'),
        unique=True,
        blank=True,
        null=True,
        help_text=_('Phone number in international format (e.g., +1234567890)')
    )
    
    # Verification fields
    email_verified = models.BooleanField(
        _('email verified'),
        default=False,
        help_text=_('Designates whether this user has confirmed their email address.')
    )
    phone_verified = models.BooleanField(
        _('phone verified'),
        default=False,
        help_text=_('Designates whether this user has confirmed their phone number.')
    )
    
    # 2FA field
    two_factor_enabled = models.BooleanField(
        _('2FA enabled'),
        default=False,
        help_text=_('Designates whether this user has enabled two-factor authentication.')
    )
    
    # Profile completion tracking
    profile_completed = models.BooleanField(
        _('profile completed'),
        default=False,
        help_text=_('Designates whether this user has completed their business profile.')
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Login tracking
    last_login_ip = models.GenericIPAddressField(
        _('last login IP'),
        blank=True,
        null=True
    )
    last_login_attempt = models.DateTimeField(
        _('last login attempt'),
        blank=True,
        null=True
    )
    failed_login_attempts = models.PositiveIntegerField(
        _('failed login attempts'),
        default=0
    )
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []  # Remove email from REQUIRED_FIELDS since it's the USERNAME_FIELD
    
    class Meta:
        verbose_name = _('user')
        verbose_name_plural = _('users')
        db_table = 'users'
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['phone_number']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return self.email
    
    def get_full_name(self):
        """
        Return the first_name plus the last_name, with a space in between.
        """
        full_name = f"{self.first_name} {self.last_name}".strip()
        return full_name or self.email
    
    def get_short_name(self):
        """
        Return the short name for the user.
        """
        return self.first_name or self.email.split('@')[0]
    
    @property
    def is_fully_verified(self):
        """
        Check if user has verified both email and phone (if provided)
        """
        if self.phone_number:
            return self.email_verified and self.phone_verified
        return self.email_verified
    
    @property
    def profile_completion_percentage(self):
        """
        Calculate profile completion percentage
        """
        total_fields = 5  # Base user fields
        completed_fields = 0
        
        if self.first_name:
            completed_fields += 1
        if self.last_name:
            completed_fields += 1
        if self.email_verified:
            completed_fields += 1
        if self.phone_number:
            completed_fields += 1
            if self.phone_verified:
                completed_fields += 1
        
        # Check if business profile exists
        if hasattr(self, 'business_profile'):
            total_fields += 10  # Business profile fields
            profile = self.business_profile
            
            if profile.business_name:
                completed_fields += 1
            if profile.business_phone:
                completed_fields += 1
            if profile.business_email:
                completed_fields += 1
            if profile.address_line1:
                completed_fields += 1
            if profile.city:
                completed_fields += 1
            if profile.state:
                completed_fields += 1
            if profile.zip_code:
                completed_fields += 1
            if profile.service_radius:
                completed_fields += 1
            if profile.pricing_mode:
                completed_fields += 1
            if profile.availability_schedule:
                completed_fields += 1
        
        return int((completed_fields / total_fields) * 100)


class AuditLog(models.Model):
    """
    Model to track user actions and system events
    """
    ACTION_CHOICES = [
        ('login', _('Login')),
        ('logout', _('Logout')),
        ('login_failed', _('Login Failed')),
        ('register', _('Registration')),
        ('email_verified', _('Email Verified')),
        ('phone_verified', _('Phone Verified')),
        ('password_reset', _('Password Reset')),
        ('password_changed', _('Password Changed')),
        ('profile_created', _('Profile Created')),
        ('profile_updated', _('Profile Updated')),
        ('2fa_enabled', _('2FA Enabled')),
        ('2fa_disabled', _('2FA Disabled')),
        ('admin_action', _('Admin Action')),
    ]
    
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs'
    )
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True)
    
    # Additional context
    details = models.JSONField(
        default=dict,
        blank=True,
        help_text=_('Additional details about the action')
    )
    
    # For admin actions, track who performed the action
    performed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='admin_actions'
    )
    
    class Meta:
        verbose_name = _('audit log')
        verbose_name_plural = _('audit logs')
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['action', '-timestamp']),
            models.Index(fields=['timestamp']),
        ]
    
    def __str__(self):
        if self.user:
            return f"{self.get_action_display()} - {self.user.email} - {self.timestamp}"
        return f"{self.get_action_display()} - {self.timestamp}"