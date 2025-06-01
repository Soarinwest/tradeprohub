# File: backend/users/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from django.db.models import Count, Q
from .models import User, AuditLog
from .forms import CustomUserCreationForm, CustomUserChangeForm


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    """
    Custom admin interface for User model
    """
    add_form = CustomUserCreationForm
    form = CustomUserChangeForm
    model = User
    
    list_display = [
        'email',
        'full_name',
        'phone_number',
        'date_joined',
        'verification_status',
        'profile_status',
        'last_login',
        'is_active',
    ]
    
    list_filter = [
        'is_active',
        'is_staff',
        'email_verified',
        'phone_verified',
        'two_factor_enabled',
        'profile_completed',
        'date_joined',
        'last_login',
    ]
    
    search_fields = ['email', 'first_name', 'last_name', 'phone_number']
    
    ordering = ['-date_joined']
    
    fieldsets = (
        (None, {
            'fields': ('email', 'password')
        }),
        ('Personal info', {
            'fields': ('first_name', 'last_name', 'phone_number')
        }),
        ('Verification', {
            'fields': ('email_verified', 'phone_verified', 'two_factor_enabled'),
            'classes': ('collapse',)
        }),
        ('Permissions', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
            'classes': ('collapse',)
        }),
        ('Important dates', {
            'fields': ('last_login', 'date_joined', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
        ('Security', {
            'fields': ('failed_login_attempts', 'last_login_attempt', 'last_login_ip'),
            'classes': ('collapse',)
        }),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'phone_number', 'password1', 'password2'),
        }),
    )
    
    readonly_fields = ['date_joined', 'created_at', 'updated_at', 'last_login', 
                      'failed_login_attempts', 'last_login_attempt', 'last_login_ip']
    
    def full_name(self, obj):
        """Display user's full name"""
        return obj.get_full_name() or '-'
    full_name.short_description = 'Full Name'
    
    def verification_status(self, obj):
        """Display verification badges"""
        badges = []
        
        if obj.email_verified:
            badges.append('<span class="badge badge-success">Email ✓</span>')
        else:
            badges.append('<span class="badge badge-warning">Email ✗</span>')
        
        if obj.phone_number:
            if obj.phone_verified:
                badges.append('<span class="badge badge-success">Phone ✓</span>')
            else:
                badges.append('<span class="badge badge-warning">Phone ✗</span>')
        
        if obj.two_factor_enabled:
            badges.append('<span class="badge badge-info">2FA</span>')
        
        return format_html(' '.join(badges))
    verification_status.short_description = 'Verification'
    
    def profile_status(self, obj):
        """Display profile completion status"""
        if hasattr(obj, 'business_profile'):
            percentage = obj.profile_completion_percentage
            if percentage == 100:
                return format_html(
                    '<div class="progress" style="width: 100px; height: 20px;">'
                    '<div class="progress-bar bg-success" style="width: 100%">100%</div>'
                    '</div>'
                )
            elif percentage >= 75:
                return format_html(
                    '<div class="progress" style="width: 100px; height: 20px;">'
                    '<div class="progress-bar bg-info" style="width: {}%">{:.0f}%</div>'
                    '</div>',
                    percentage, percentage
                )
            else:
                return format_html(
                    '<div class="progress" style="width: 100px; height: 20px;">'
                    '<div class="progress-bar bg-warning" style="width: {}%">{:.0f}%</div>'
                    '</div>',
                    percentage, percentage
                )
        return format_html('<span class="badge badge-secondary">No Profile</span>')
    profile_status.short_description = 'Profile'
    
    def get_queryset(self, request):
        """Optimize queryset with select_related"""
        return super().get_queryset(request).select_related('business_profile')
    
    actions = ['verify_email', 'verify_phone', 'reset_login_attempts', 'export_users']
    
    def verify_email(self, request, queryset):
        """Admin action to verify email addresses"""
        updated = queryset.update(email_verified=True)
        
        # Log admin action
        for user in queryset:
            AuditLog.objects.create(
                user=user,
                action='admin_action',
                performed_by=request.user,
                details={
                    'action': 'email_verified_by_admin',
                    'admin': request.user.email
                }
            )
        
        self.message_user(request, f'{updated} user(s) email verified.')
    verify_email.short_description = 'Verify email for selected users'
    
    def verify_phone(self, request, queryset):
        """Admin action to verify phone numbers"""
        updated = queryset.filter(phone_number__isnull=False).update(phone_verified=True)
        
        # Log admin action
        for user in queryset.filter(phone_number__isnull=False):
            AuditLog.objects.create(
                user=user,
                action='admin_action',
                performed_by=request.user,
                details={
                    'action': 'phone_verified_by_admin',
                    'admin': request.user.email
                }
            )
        
        self.message_user(request, f'{updated} user(s) phone verified.')
    verify_phone.short_description = 'Verify phone for selected users'
    
    def reset_login_attempts(self, request, queryset):
        """Admin action to reset failed login attempts"""
        updated = queryset.update(failed_login_attempts=0)
        
        # Log admin action
        for user in queryset:
            AuditLog.objects.create(
                user=user,
                action='admin_action',
                performed_by=request.user,
                details={
                    'action': 'login_attempts_reset',
                    'admin': request.user.email
                }
            )
        
        self.message_user(request, f'{updated} user(s) login attempts reset.')
    reset_login_attempts.short_description = 'Reset failed login attempts'
    
    def export_users(self, request, queryset):
        """Export selected users to CSV"""
        import csv
        from django.http import HttpResponse
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="users.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'Email', 'First Name', 'Last Name', 'Phone', 
            'Email Verified', 'Phone Verified', '2FA Enabled',
            'Profile Complete', 'Date Joined', 'Last Login'
        ])
        
        for user in queryset:
            writer.writerow([
                user.email,
                user.first_name,
                user.last_name,
                user.phone_number or '',
                'Yes' if user.email_verified else 'No',
                'Yes' if user.phone_verified else 'No',
                'Yes' if user.two_factor_enabled else 'No',
                f'{user.profile_completion_percentage}%',
                user.date_joined.strftime('%Y-%m-%d %H:%M'),
                user.last_login.strftime('%Y-%m-%d %H:%M') if user.last_login else 'Never'
            ])
        
        return response
    export_users.short_description = 'Export selected users to CSV'


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """
    Admin interface for audit logs
    """
    list_display = [
        'timestamp',
        'user_link',
        'action',
        'ip_address',
        'details_preview',
    ]
    
    list_filter = [
        'action',
        'timestamp',
        ('user', admin.RelatedOnlyFieldListFilter),
    ]
    
    search_fields = ['user__email', 'ip_address', 'details']
    
    readonly_fields = [
        'user', 'action', 'timestamp', 'ip_address', 
        'user_agent', 'details', 'performed_by'
    ]
    
    ordering = ['-timestamp']
    
    date_hierarchy = 'timestamp'
    
    def user_link(self, obj):
        """Link to user admin page"""
        if obj.user:
            url = reverse('admin:users_user_change', args=[obj.user.pk])
            return format_html('<a href="{}">{}</a>', url, obj.user.email)
        return '-'
    user_link.short_description = 'User'
    
    def details_preview(self, obj):
        """Preview of details JSON"""
        if obj.details:
            # Show first 100 characters
            details_str = str(obj.details)
            if len(details_str) > 100:
                return details_str[:100] + '...'
            return details_str
        return '-'
    details_preview.short_description = 'Details'
    
    def has_add_permission(self, request):
        """Prevent manual creation of audit logs"""
        return False
    
    def has_delete_permission(self, request, obj=None):
        """Only superusers can delete audit logs"""
        return request.user.is_superuser
    
    def get_queryset(self, request):
        """Optimize queryset"""
        return super().get_queryset(request).select_related('user', 'performed_by')
    
    fieldsets = (
        ('Event Information', {
            'fields': ('action', 'timestamp', 'user', 'performed_by')
        }),
        ('Technical Details', {
            'fields': ('ip_address', 'user_agent'),
            'classes': ('collapse',)
        }),
        ('Additional Details', {
            'fields': ('details',),
            'classes': ('collapse',)
        }),
    )


# Admin site customization
admin.site.site_header = "TradeProHub Administration"
admin.site.site_title = "TradeProHub Admin"
admin.site.index_title = "Welcome to TradeProHub Administration"