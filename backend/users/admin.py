# File: backend/users/admin.py
# Enhanced Django admin interface for user management and security monitoring

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth import get_user_model
from django.utils.html import format_html
from django.utils import timezone
from django.urls import reverse
from django.db.models import Count, Q
from .models import (
    EmailVerificationToken, PasswordResetToken, 
    UserSession, AuditLog
)

User = get_user_model()


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Enhanced User admin with security features and monitoring"""
    
    list_display = [
        'username', 'email', 'full_name_display', 'account_type', 
        'email_verified_display', 'is_active', 'last_login_display',
        'failed_attempts_display', 'account_status_display'
    ]
    
    list_filter = [
        'account_type', 'email_verified', 'is_active', 'is_staff',
        'created_at', 'last_login', 'account_locked_until'
    ]
    
    search_fields = ['username', 'email', 'first_name', 'last_name']
    
    readonly_fields = [
        'created_at', 'updated_at', 'last_activity', 'password_changed_at',
        'failed_login_attempts', 'last_login_attempt', 'account_locked_until'
    ]
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Personal Information', {
            'fields': (
                'phone_number', 'account_type', 'marketing_emails', 
                'notifications_enabled'
            )
        }),
        ('Verification Status', {
            'fields': ('email_verified', 'phone_verified')
        }),
        ('Security Information', {
            'fields': (
                'failed_login_attempts', 'last_login_attempt', 
                'account_locked_until', 'password_changed_at',
                'force_password_change'
            ),
            'classes': ('collapse',)
        }),
        ('Profile Status', {
            'fields': ('profile_completed', 'onboarding_completed')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'last_activity'),
            'classes': ('collapse',)
        }),
    )
    
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Additional Information', {
            'fields': (
                'email', 'first_name', 'last_name', 'phone_number',
                'account_type', 'email_verified'
            )
        }),
    )
    
    actions = [
        'verify_email', 'unverify_email', 'unlock_accounts', 
        'force_password_change', 'send_verification_email'
    ]

    def get_queryset(self, request):
        """Optimize queryset with select_related for better performance"""
        qs = super().get_queryset(request)
        return qs.select_related().annotate(
            session_count=Count('usersession', filter=Q(usersession__is_active=True))
        )

    def full_name_display(self, obj):
        """Display full name with fallback to username"""
        return obj.get_full_name() or obj.username
    full_name_display.short_description = 'Full Name'

    def email_verified_display(self, obj):
        """Display email verification status with colored indicator"""
        if obj.email_verified:
            return format_html(
                '<span style="color: green;">✓ Verified</span>'
            )
        else:
            return format_html(
                '<span style="color: red;">✗ Unverified</span>'
            )
    email_verified_display.short_description = 'Email Status'

    def last_login_display(self, obj):
        """Display last login with relative time"""
        if obj.last_login:
            return obj.last_login.strftime('%Y-%m-%d %H:%M')
        return 'Never'
    last_login_display.short_description = 'Last Login'

    def failed_attempts_display(self, obj):
        """Display failed login attempts with warning colors"""
        attempts = obj.failed_login_attempts
        if attempts == 0:
            return '0'
        elif attempts < 3:
            return format_html(
                '<span style="color: orange;">{}</span>', attempts
            )
        else:
            return format_html(
                '<span style="color: red; font-weight: bold;">{}</span>', attempts
            )
    failed_attempts_display.short_description = 'Failed Attempts'

    def account_status_display(self, obj):
        """Display account status with visual indicators"""
        if obj.is_account_locked:
            return format_html(
                '<span style="color: red; font-weight: bold;">🔒 LOCKED</span>'
            )
        elif not obj.is_active:
            return format_html(
                '<span style="color: orange;">⏸ INACTIVE</span>'
            )
        elif not obj.email_verified:
            return format_html(
                '<span style="color: blue;">📧 PENDING</span>'
            )
        else:
            return format_html(
                '<span style="color: green;">✅ ACTIVE</span>'
            )
    account_status_display.short_description = 'Status'

    # Admin Actions
    def verify_email(self, request, queryset):
        """Bulk verify email addresses"""
        count = queryset.update(email_verified=True)
        self.message_user(
            request, 
            f'{count} user(s) email verified successfully.'
        )
    verify_email.short_description = 'Verify email addresses'

    def unverify_email(self, request, queryset):
        """Bulk unverify email addresses"""
        count = queryset.update(email_verified=False)
        self.message_user(
            request, 
            f'{count} user(s) email unverified.'
        )
    unverify_email.short_description = 'Unverify email addresses'

    def unlock_accounts(self, request, queryset):
        """Bulk unlock user accounts"""
        count = 0
        for user in queryset:
            if user.is_account_locked:
                user.unlock_account()
                count += 1
        self.message_user(
            request, 
            f'{count} account(s) unlocked successfully.'
        )
    unlock_accounts.short_description = 'Unlock accounts'

    def force_password_change(self, request, queryset):
        """Force users to change password on next login"""
        count = queryset.update(force_password_change=True)
        self.message_user(
            request, 
            f'{count} user(s) will be required to change password on next login.'
        )
    force_password_change.short_description = 'Force password change'


@admin.register(EmailVerificationToken)
class EmailVerificationTokenAdmin(admin.ModelAdmin):
    """Admin for email verification tokens"""
    
    list_display = [
        'user', 'token_display', 'created_at', 'expires_at', 
        'used', 'is_expired_display'
    ]
    
    list_filter = ['used', 'created_at', 'expires_at']
    search_fields = ['user__username', 'user__email']
    readonly_fields = ['token', 'created_at', 'expires_at']
    
    def token_display(self, obj):
        """Display truncated token"""
        return f"{str(obj.token)[:8]}..."
    token_display.short_description = 'Token'

    def is_expired_display(self, obj):
        """Display expiration status"""
        if obj.is_expired:
            return format_html('<span style="color: red;">Expired</span>')
        else:
            return format_html('<span style="color: green;">Valid</span>')
    is_expired_display.short_description = 'Status'


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    """Admin for password reset tokens"""
    
    list_display = [
        'user', 'token_display', 'created_at', 'expires_at', 
        'used', 'ip_address', 'is_expired_display'
    ]
    
    list_filter = ['used', 'created_at', 'expires_at']
    search_fields = ['user__username', 'user__email', 'ip_address']
    readonly_fields = ['token', 'created_at', 'expires_at']
    
    def token_display(self, obj):
        """Display truncated token"""
        return f"{str(obj.token)[:8]}..."
    token_display.short_description = 'Token'

    def is_expired_display(self, obj):
        """Display expiration status"""
        if obj.is_expired:
            return format_html('<span style="color: red;">Expired</span>')
        else:
            return format_html('<span style="color: green;">Valid</span>')
    is_expired_display.short_description = 'Status'


@admin.register(UserSession)
class UserSessionAdmin(admin.ModelAdmin):
    """Admin for user sessions"""
    
    list_display = [
        'user', 'session_display', 'ip_address', 'browser_display',
        'created_at', 'last_activity', 'is_active'
    ]
    
    list_filter = ['is_active', 'created_at', 'last_activity']
    search_fields = ['user__username', 'user__email', 'ip_address']
    readonly_fields = ['session_key', 'created_at', 'last_activity']
    
    def session_display(self, obj):
        """Display truncated session key"""
        return f"{obj.session_key[:12]}..."
    session_display.short_description = 'Session'

    def browser_display(self, obj):
        """Extract and display browser info from user agent"""
        user_agent = obj.user_agent.lower()
        if 'chrome' in user_agent:
            return '🌐 Chrome'
        elif 'firefox' in user_agent:
            return '🦊 Firefox'
        elif 'safari' in user_agent:
            return '🧭 Safari'
        elif 'edge' in user_agent:
            return '📘 Edge'
        else:
            return '❓ Unknown'
    browser_display.short_description = 'Browser'


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """Admin for audit logs - read-only for security"""
    
    list_display = [
        'timestamp', 'user', 'action', 'ip_address', 
        'details_display'
    ]
    
    list_filter = ['action', 'timestamp']
    search_fields = ['user__username', 'user__email', 'ip_address']
    readonly_fields = [
        'user', 'action', 'ip_address', 'user_agent', 
        'details', 'timestamp'
    ]
    
    def has_add_permission(self, request):
        """Prevent manual creation of audit logs"""
        return False
    
    def has_change_permission(self, request, obj=None):
        """Prevent modification of audit logs"""
        return False
    
    def has_delete_permission(self, request, obj=None):
        """Prevent deletion of audit logs"""
        return False

    def details_display(self, obj):
        """Display formatted details"""
        if obj.details:
            # Format key details for display
            details_str = []
            for key, value in obj.details.items():
                details_str.append(f"{key}: {value}")
            return "; ".join(details_str[:3])  # Show first 3 items
        return "No details"
    details_display.short_description = 'Details'


# Customize Admin Site
admin.site.site_header = "TradeProHub Administration"
admin.site.site_title = "TradeProHub Admin"
admin.site.index_title = "Welcome to TradeProHub Administration"

# Add custom admin views if needed
class SecurityDashboardAdmin(admin.ModelAdmin):
    """Custom dashboard for security monitoring"""
    
    def changelist_view(self, request, extra_context=None):
        """Add security statistics to admin dashboard"""
        extra_context = extra_context or {}
        
        # Calculate security statistics
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        verified_users = User.objects.filter(email_verified=True).count()
        locked_accounts = User.objects.filter(
            account_locked_until__gt=timezone.now()
        ).count()
        
        recent_logins = AuditLog.objects.filter(
            action='login',
            timestamp__gte=timezone.now() - timezone.timedelta(days=7)
        ).count()
        
        failed_logins = AuditLog.objects.filter(
            action='login_failed',
            timestamp__gte=timezone.now() - timezone.timedelta(days=7)
        ).count()
        
        extra_context.update({
            'security_stats': {
                'total_users': total_users,
                'active_users': active_users,
                'verified_users': verified_users,
                'locked_accounts': locked_accounts,
                'recent_logins': recent_logins,
                'failed_logins': failed_logins,
                'verification_rate': (verified_users / total_users * 100) if total_users > 0 else 0,
            }
        })
        
        return super().changelist_view(request, extra_context=extra_context)