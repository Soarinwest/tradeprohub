# File: backend/profiles/models.py
# --------------------------------
from django.db import models
from django.contrib.auth import get_user_model
import json

User = get_user_model()

class BusinessProfile(models.Model):
    """
    Main business profile model for tradespeople
    Contains all business information in structured format
    """
    PRICING_MODES = [
        ('hourly', 'Hourly Rate'),
        ('quoted', 'Project Quotes'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='business_profile')
    
    # Business Information
    business_name = models.CharField(max_length=200, blank=True)
    business_phone = models.CharField(max_length=20, blank=True)
    business_email = models.EmailField(blank=True)
    logo = models.ImageField(upload_to='logos/', blank=True, null=True)
    
    # Location Information
    address_line1 = models.CharField(max_length=255, blank=True)
    address_line2 = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=50, blank=True)
    zip_code = models.CharField(max_length=10, blank=True)
    country = models.CharField(max_length=50, default='United States')
    latitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    service_radius = models.PositiveIntegerField(default=25, help_text="Service radius in miles")
    
    # Pricing Information
    pricing_mode = models.CharField(max_length=10, choices=PRICING_MODES, default='hourly')
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    minimum_charge = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    quote_packages = models.JSONField(default=list, blank=True)  # List of package objects
    
    # Media Information
    certifications = models.TextField(blank=True, null=True)
    profile_photo = models.ImageField(upload_to='profiles/', blank=True, null=True)
    gallery_images = models.JSONField(default=list, blank=True)  # List of image URLs
    
    # Availability Information
    availability_schedule = models.JSONField(default=dict, blank=True)  # Weekly schedule object
    
    # Meta
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_complete = models.BooleanField(default=False)  # Profile wizard completion status

    class Meta:
        verbose_name = "Business Profile"
        verbose_name_plural = "Business Profiles"

    def __str__(self):
        return f"{self.business_name} - {self.user.username}"

    def save(self, *args, **kwargs):
        """Check if profile is complete on save"""
        self.is_complete = self.check_completion()
        super().save(*args, **kwargs)

    def check_completion(self):
        """Check if all required profile sections are completed"""
        required_fields = [
            self.business_name, self.business_phone, self.business_email,
            self.address_line1, self.city, self.state, self.zip_code
        ]
        
        # Check if all required fields are filled
        if not all(required_fields):
            return False
            
        # Check if pricing information is complete
        if self.pricing_mode == 'hourly' and not self.hourly_rate:
            return False
        elif self.pricing_mode == 'quoted' and not self.quote_packages:
            return False
            
        return True

class GalleryImage(models.Model):
    """
    Separate model for gallery images to handle file uploads properly
    """
    profile = models.ForeignKey(BusinessProfile, on_delete=models.CASCADE, related_name='gallery')
    image = models.ImageField(upload_to='gallery/')
    caption = models.CharField(max_length=255, blank=True, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Gallery image for {self.profile.business_name}"