# backend/profiles/urls.py
from django.urls import path
from .views import (
    RegisterView,
    TokenObtainPairView,
    TokenRefreshView,
    EmployeeProfileCreateView,
    EmployeeProfileDetailView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('employee-profile/', EmployeeProfileCreateView.as_view(), name='employee-profile-create'),
    path('my-employee-profile/', EmployeeProfileDetailView.as_view(), name='my-employee-profile'),
]
