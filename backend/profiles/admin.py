# File: backend/profiles/admin.py
# -------------------------------
from django.contrib import admin
from .models import BusinessProfile, GalleryImage

@admin.register(BusinessProfile)
class BusinessProfileAdmin(admin.ModelAdmin):
    """Admin interface for business profiles"""
    list_display = ['business_name', 'user', 'city', 'state', 'pricing_mode', 'is_complete', 'created_at']
    list_filter = ['pricing_mode', 'is_complete', 'state', 'created_at']
    search_fields = ['business_name', 'user__username', 'business_email']
    readonly_fields = ['created_at', 'updated_at', 'is_complete']
    
    fieldsets = (
        ('User', {
            'fields': ('user',)
        }),
        ('Business Info', {
            'fields': ('business_name', 'business_phone', 'business_email', 'logo')
        }),
        ('Location', {
            'fields': ('address_line1', 'address_line2', 'city', 'state', 'zip_code', 
                      'country', 'latitude', 'longitude', 'service_radius')
        }),
        ('Pricing', {
            'fields': ('pricing_mode', 'hourly_rate', 'minimum_charge', 'quote_packages')
        }),
        ('Media', {
            'fields': ('certifications', 'profile_photo', 'gallery_images')
        }),
        ('Availability', {
            'fields': ('availability_schedule',)
        }),
        ('Meta', {
            'fields': ('is_complete', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )

@admin.register(GalleryImage)
class GalleryImageAdmin(admin.ModelAdmin):
    """Admin interface for gallery images"""
    list_display = ['profile', 'caption', 'uploaded_at']
    list_filter = ['uploaded_at']
    search_fields = ['profile__business_name', 'caption']
