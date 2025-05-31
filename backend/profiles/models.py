# File: backend/profiles/models.py
# --------------------------------
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator, MaxValueValidator
from django_countries.fields import CountryField
from localflavor.us.models import USStateField
from versatileimagefield.fields import VersatileImageField, PPOIField


class BusinessProfile(models.Model):
    """
    Main business profile model for tradespeople
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='business_profile'
    )
    
    # Business Information
    business_name = models.CharField(max_length=255)
    business_phone = models.CharField(max_length=20)
    business_email = models.EmailField()
    
    # Logo with versatile image field for auto-resizing
    logo = VersatileImageField(
        'Logo',
        upload_to='logos/',
        ppoi_field='logo_ppoi',
        blank=True,
        null=True
    )
    logo_ppoi = PPOIField()
    
    # Address fields with proper country/state validation
    address_line1 = models.CharField(max_length=255)
    address_line2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100)
    state = USStateField(_('state'))  # US states with validation
    country = CountryField(default='US')  # Country field with ISO codes
    zip_code = models.CharField(max_length=10)
    
    # Location coordinates
    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        validators=[MinValueValidator(-90), MaxValueValidator(90)]
    )
    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        validators=[MinValueValidator(-180), MaxValueValidator(180)]
    )
    
    # Service area configuration
    SERVICE_AREA_CHOICES = [
        ('radius', _('Radius')),
        ('town', _('Town/City')),
        ('county', _('County')),
        ('state', _('State')),
        ('custom', _('Custom Area')),
    ]
    
    service_area_type = models.CharField(
        max_length=20,
        choices=SERVICE_AREA_CHOICES,
        default='radius'
    )
    service_radius = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(500)],
        help_text=_('Service radius in miles')
    )
    willing_to_travel_outside = models.BooleanField(
        default=False,
        help_text=_('Willing to consider projects outside normal service area')
    )
    
    # Custom service area polygon (GeoJSON)
    service_area_polygon = models.JSONField(
        blank=True,
        null=True,
        help_text=_('GeoJSON polygon for custom service areas')
    )
    
    # Pricing configuration
    PRICING_MODE_CHOICES = [
        ('hourly', _('Hourly Rate')),
        ('quoted', _('Project Quotes')),
        ('both', _('Both Hourly and Quoted')),
    ]
    
    pricing_mode = models.CharField(
        max_length=20,
        choices=PRICING_MODE_CHOICES,
        default='hourly'
    )
    hourly_rate = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)]
    )
    minimum_charge = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)]
    )
    
    # Availability
    availability_schedule = models.JSONField(
        default=dict,
        help_text=_('Weekly availability schedule')
    )
    available_immediately = models.BooleanField(default=True)
    start_date = models.DateField(null=True, blank=True)
    
    # Professional information
    license_number = models.CharField(max_length=100, blank=True)
    insurance_info = models.TextField(blank=True)
    certifications = models.TextField(blank=True)
    years_in_business = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MaxValueValidator(100)]
    )
    
    # Profile status
    is_published = models.BooleanField(
        default=False,
        help_text=_('Whether this profile is visible to customers')
    )
    verified = models.BooleanField(
        default=False,
        help_text=_('Whether this business has been verified by admin')
    )
    featured = models.BooleanField(
        default=False,
        help_text=_('Featured profiles appear first in search results')
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # SEO fields
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    meta_description = models.TextField(
        max_length=160,
        blank=True,
        help_text=_('SEO meta description')
    )
    
    class Meta:
        verbose_name = _('Business Profile')
        verbose_name_plural = _('Business Profiles')
        ordering = ['-featured', '-created_at']
        indexes = [
            models.Index(fields=['is_published', 'featured', '-created_at']),
            models.Index(fields=['state', 'city']),
            models.Index(fields=['service_area_type']),
        ]
    
    def __str__(self):
        return f"{self.business_name} - {self.user.email}"
    
    def save(self, *args, **kwargs):
        # Auto-generate slug from business name if not provided
        if not self.slug:
            from django.utils.text import slugify
            base_slug = slugify(self.business_name)
            slug = base_slug
            counter = 1
            while BusinessProfile.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        
        super().save(*args, **kwargs)
    
    @property
    def full_address(self):
        """Get formatted full address"""
        parts = [
            self.address_line1,
            self.address_line2,
            f"{self.city}, {self.state} {self.zip_code}",
            self.country.name
        ]
        return '\n'.join(filter(None, parts))
    
    @property
    def is_complete(self):
        """Check if all required fields are filled"""
        required_fields = [
            self.business_name,
            self.business_phone,
            self.business_email,
            self.address_line1,
            self.city,
            self.state,
            self.zip_code,
            self.service_radius,
            self.pricing_mode,
            self.availability_schedule
        ]
        return all(required_fields)


class ServicePackage(models.Model):
    """
    Predefined service packages for quoted pricing
    """
    profile = models.ForeignKey(
        BusinessProfile,
        on_delete=models.CASCADE,
        related_name='service_packages'
    )
    name = models.CharField(max_length=200)
    description = models.TextField()
    price = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    duration_hours = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        null=True,
        blank=True,
        help_text=_('Estimated duration in hours')
    )
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)
    
    class Meta:
        verbose_name = _('Service Package')
        verbose_name_plural = _('Service Packages')
        ordering = ['order', 'name']
    
    def __str__(self):
        return f"{self.name} - ${self.price}"


class GalleryImage(models.Model):
    """
    Gallery images for business profiles with auto-resizing
    """
    profile = models.ForeignKey(
        BusinessProfile,
        related_name='gallery_images',
        on_delete=models.CASCADE
    )
    image = VersatileImageField(
        'Image',
        upload_to='gallery/',
        ppoi_field='image_ppoi'
    )
    image_ppoi = PPOIField()
    
    caption = models.CharField(max_length=255, blank=True)
    is_primary = models.BooleanField(
        default=False,
        help_text=_('Primary image shown in search results')
    )
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = _('Gallery Image')
        verbose_name_plural = _('Gallery Images')
        ordering = ['order', '-created_at']
    
    def __str__(self):
        return f"Gallery image for {self.profile.business_name}"
    
    def save(self, *args, **kwargs):
        # Ensure only one primary image per profile
        if self.is_primary:
            GalleryImage.objects.filter(
                profile=self.profile,
                is_primary=True
            ).exclude(pk=self.pk).update(is_primary=False)
        
        super().save(*args, **kwargs)


class BusinessLocation(models.Model):
    """
    Support for businesses with multiple locations
    """
    profile = models.ForeignKey(
        BusinessProfile,
        on_delete=models.CASCADE,
        related_name='locations'
    )
    name = models.CharField(
        max_length=100,
        help_text=_('Location name (e.g., "Main Office", "North Branch")')
    )
    
    # Address fields
    address_line1 = models.CharField(max_length=255)
    address_line2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100)
    state = USStateField()
    country = CountryField(default='US')
    zip_code = models.CharField(max_length=10)
    
    # Contact
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    
    # Coordinates
    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        validators=[MinValueValidator(-90), MaxValueValidator(90)]
    )
    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        validators=[MinValueValidator(-180), MaxValueValidator(180)]
    )
    
    # Service area for this location
    service_radius = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(500)],
        help_text=_('Service radius in miles from this location')
    )
    
    is_primary = models.BooleanField(
        default=False,
        help_text=_('Primary location for the business')
    )
    is_active = models.BooleanField(default=True)
    
    class Meta:
        verbose_name = _('Business Location')
        verbose_name_plural = _('Business Locations')
        ordering = ['-is_primary', 'name']
    
    def __str__(self):
        return f"{self.profile.business_name} - {self.name}"
    
    def save(self, *args, **kwargs):
        # Ensure only one primary location per profile
        if self.is_primary:
            BusinessLocation.objects.filter(
                profile=self.profile,
                is_primary=True
            ).exclude(pk=self.pk).update(is_primary=False)
        
        super().save(*args, **kwargs)