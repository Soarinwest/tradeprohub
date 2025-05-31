# File: backend/users/management/commands/setup_groups.py
from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType


class Command(BaseCommand):
    help = 'Sets up user groups and permissions for TradeProHub'

    def handle(self, *args, **options):
        self.stdout.write('Setting up groups and permissions...')
        
        # Create groups
        admin_group, _ = Group.objects.get_or_create(name='Administrators')
        support_group, _ = Group.objects.get_or_create(name='Support Staff')
        readonly_group, _ = Group.objects.get_or_create(name='Read Only')
        
        # Clear existing permissions
        admin_group.permissions.clear()
        support_group.permissions.clear()
        readonly_group.permissions.clear()
        
        # Admin group - Full access
        admin_permissions = Permission.objects.all()
        admin_group.permissions.set(admin_permissions)
        
        # Support group - Can manage users and profiles but not system settings
        support_permissions = Permission.objects.filter(
            content_type__app_label__in=['users', 'profiles'],
            codename__in=[
                'view_user', 'change_user', 'view_auditlog',
                'view_businessprofile', 'change_businessprofile',
                'add_businessprofile', 'delete_businessprofile',
                'view_galleryimage', 'change_galleryimage',
                'add_galleryimage', 'delete_galleryimage',
                'view_servicepackage', 'change_servicepackage',
                'add_servicepackage', 'delete_servicepackage',
                'view_businesslocation', 'change_businesslocation',
                'add_businesslocation', 'delete_businesslocation',
            ]
        )
        support_group.permissions.set(support_permissions)
        
        # Read only group - View permissions only
        readonly_permissions = Permission.objects.filter(
            codename__startswith='view_'
        )
        readonly_group.permissions.set(readonly_permissions)
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created groups:\n'
                f'- Administrators ({admin_group.permissions.count()} permissions)\n'
                f'- Support Staff ({support_group.permissions.count()} permissions)\n'
                f'- Read Only ({readonly_group.permissions.count()} permissions)'
            )
        )