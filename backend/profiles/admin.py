# File: backend/profiles/admin.py
# -------------------------------
from django.contrib import admin
from .models import BusinessProfile, GalleryImage

@admin.register(BusinessProfile)
class BusinessProfileAdmin(admin.ModelAdmin):
    """Admin interface for business profiles"""
    list_display = [
        'business_name',
        'business_email',
        'business_phone',
        'city',
        'created_at'
    ]
    list_filter = ['created_at', 'state']
    readonly_fields = ['created_at', 'updated_at']
    search_fields = ['business_name', 'business_email', 'city']
    fieldsets = (
        ('Business Information', {
            'fields': ('business_name', 'business_email', 'business_phone')
        }),
        ('Location', {
            'fields': (
                'address_line1',
                'address_line2',
                'city',
                'state',
                'zip_code',
                'latitude',
                'longitude',
                'service_radius'
            )
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )

@admin.register(GalleryImage)
class GalleryImageAdmin(admin.ModelAdmin):
    """Admin interface for gallery images"""
    list_display = ['profile', 'caption', 'created_at']
    list_filter = ['created_at']
    search_fields = ['caption']
    raw_id_fields = ['profile']
