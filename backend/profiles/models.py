# --------------------------------
from django.db import models
from django.contrib.auth import get_user_model
from django.conf import settings
import json

User = get_user_model()

class BusinessProfile(models.Model):
    """
    Enhanced business profile model for tradespeople
    """
    # User relationship
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='business_profile'
    )
    
    # Basic Business Information
    business_name = models.CharField(max_length=255)
    business_phone = models.CharField(max_length=20)
    business_email = models.EmailField()
    business_logo = models.ImageField(upload_to='business_logos/', null=True, blank=True)
    
    # Address Information
    address_line1 = models.CharField(max_length=255)
    address_line2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=50)
    zip_code = models.CharField(max_length=10)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    
    # Service Area Information
    SERVICE_AREA_CHOICES = [
        ('radius', 'Radius from location'),
        ('town', 'Entire town/city'),
        ('county', 'Entire county'),
        ('state', 'Entire state'),
        ('custom_draw', 'Custom drawn area'),
    ]
    service_area_type = models.CharField(
        max_length=20, 
        choices=SERVICE_AREA_CHOICES, 
        default='radius'
    )
    service_radius = models.IntegerField(default=25)  # in miles
    willing_to_travel_outside = models.BooleanField(default=False)
    
    # Pricing Information
    PRICING_CHOICES = [
        ('hourly', 'Hourly Rate'),
        ('quoted', 'Quoted Projects'),
        ('both', 'Both Hourly and Quoted'),
    ]
    pricing_mode = models.CharField(
        max_length=10, 
        choices=PRICING_CHOICES, 
        default='hourly'
    )
    hourly_rate = models.DecimalField(
        max_digits=6, 
        decimal_places=2, 
        null=True, 
        blank=True
    )
    minimum_charge = models.DecimalField(
        max_digits=8, 
        decimal_places=2, 
        null=True, 
        blank=True
    )
    
    # Quote packages (stored as JSON)
    quote_packages = models.JSONField(default=list, blank=True)
    
    # Media and Certifications
    certifications = models.TextField(blank=True)
    profile_photo = models.ImageField(upload_to='profile_photos/', null=True, blank=True)
    
    # Availability Information
    availability_schedule = models.JSONField(default=dict, blank=True)
    available_immediately = models.BooleanField(default=True)
    start_date = models.DateField(null=True, blank=True)
    
    # Profile Status
    is_complete = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Business Profile"
        verbose_name_plural = "Business Profiles"

    def __str__(self):
        return f"{self.business_name} - {self.user.username}"
    
    def save(self, *args, **kwargs):
        """Auto-check if profile is complete"""
        self.is_complete = self._check_profile_complete()
        super().save(*args, **kwargs)
        
        # Update user's profile_completed status
        if hasattr(self.user, 'profile_completed'):
            self.user.profile_completed = self.is_complete
            self.user.save(update_fields=['profile_completed'])
    
    def _check_profile_complete(self):
        """Check if all required fields are filled"""
        required_fields = [
            'business_name', 'business_phone', 'business_email',
            'address_line1', 'city', 'state', 'zip_code',
            'service_radius', 'pricing_mode'
        ]
        
        for field in required_fields:
            if not getattr(self, field):
                return False
        
        # Check pricing-specific requirements
        if self.pricing_mode == 'hourly' and not self.hourly_rate:
            return False
        elif self.pricing_mode == 'quoted' and not self.quote_packages:
            return False
            
        return True

    @property
    def completion_percentage(self):
        """Calculate profile completion percentage"""
        total_fields = 15  # Adjust based on your requirements
        completed_fields = 0
        
        # Basic info
        if self.business_name: completed_fields += 1
        if self.business_phone: completed_fields += 1
        if self.business_email: completed_fields += 1
        if self.business_logo: completed_fields += 1
        
        # Address
        if self.address_line1: completed_fields += 1
        if self.city: completed_fields += 1
        if self.state: completed_fields += 1
        if self.zip_code: completed_fields += 1
        
        # Service area
        if self.service_radius: completed_fields += 1
        
        # Pricing
        if self.pricing_mode: completed_fields += 1
        if (self.pricing_mode == 'hourly' and self.hourly_rate) or \
           (self.pricing_mode == 'quoted' and self.quote_packages):
            completed_fields += 1
        
        # Media
        if self.certifications: completed_fields += 1
        if self.profile_photo: completed_fields += 1
        
        # Availability
        if self.availability_schedule: completed_fields += 1
        if self.available_immediately or self.start_date: completed_fields += 1
        
        return int((completed_fields / total_fields) * 100)


class GalleryImage(models.Model):
    """
    Gallery images for business profiles
    """
    profile = models.ForeignKey(
        BusinessProfile,
        related_name='gallery_images',
        on_delete=models.CASCADE
    )
    image = models.ImageField(upload_to='gallery/')
    caption = models.CharField(max_length=255, blank=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'created_at']

    def __str__(self):
        return f"Gallery image for {self.profile.business_name}"


class ServicePackage(models.Model):
    """
    Service packages for quoted pricing
    """
    profile = models.ForeignKey(
        BusinessProfile,
        related_name='service_packages',
        on_delete=models.CASCADE
    )
    name = models.CharField(max_length=100)
    description = models.TextField()
    price = models.DecimalField(max_digits=8, decimal_places=2)
    duration = models.CharField(max_length=50, blank=True)  # e.g., "2-3 hours"
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['price']

    def __str__(self):
        return f"{self.name} - ${self.price}"