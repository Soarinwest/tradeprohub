from django.contrib.auth.models import User
from django.db import models

class TradespersonProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    services_offered = models.TextField()
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2)
    certifications = models.TextField(blank=True)
    profile_photo = models.ImageField(upload_to='profile_photos/', blank=True, null=True)

    def __str__(self):
        return self.user.username
