from django.urls import path
from .views import ProfileDetail
from .views import RegisterView

urlpatterns = [
    path('my-profile/', MyProfileView.as_view(), name='my-profile'),
    path('register/', RegisterView.as_view(), name='register'),
]