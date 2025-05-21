# backend/profiles/urls.py
from django.urls import path
from .views import (
    RegisterView,
    EmployeeProfileCreateView,
    EmployeeProfileDetailView,
)

urlpatterns = [
    # User registration
    path('register/', RegisterView.as_view(), name='register'),
    # Scalable: EmployeeProfile endpoints
    path('employee-profile/', EmployeeProfileCreateView.as_view(), name='employee-profile-create'),
    path('my-employee-profile/', EmployeeProfileDetailView.as_view(), name='my-employee-profile'),
]
