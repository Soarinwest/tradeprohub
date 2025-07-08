# File: backend/users/management/commands/cleanup_auth_tokens.py
# Clean up expired authentication tokens and sessions

from django.core.management.base import BaseCommand
from django.utils import timezone
from users.models import EmailVerificationToken, PasswordResetToken, UserSession
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken


class Command(BaseCommand):
    help = 'Clean up expired authentication tokens and inactive sessions'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=30,
            help='Number of days to keep completed tokens (default: 30)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting'
        )

    def handle(self, *args, **options):
        days_to_keep = options['days']
        dry_run = options['dry_run']
        cutoff_date = timezone.now() - timezone.timedelta(days=days_to_keep)
        
        self.stdout.write(
            self.style.SUCCESS(f'Cleaning up tokens older than {days_to_keep} days...')
        )
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('DRY RUN MODE - No data will be deleted')
            )

        # Clean up expired email verification tokens
        expired_email_tokens = EmailVerificationToken.objects.filter(
            expires_at__lt=timezone.now()
        )
        email_count = expired_email_tokens.count()
        
        if not dry_run:
            expired_email_tokens.delete()
        
        self.stdout.write(
            f'Email verification tokens: {email_count} expired tokens {"would be" if dry_run else ""} deleted'
        )

        # Clean up expired password reset tokens
        expired_reset_tokens = PasswordResetToken.objects.filter(
            expires_at__lt=timezone.now()
        )
        reset_count = expired_reset_tokens.count()
        
        if not dry_run:
            expired_reset_tokens.delete()
        
        self.stdout.write(
            f'Password reset tokens: {reset_count} expired tokens {"would be" if dry_run else ""} deleted'
        )

        # Clean up old inactive sessions
        old_sessions = UserSession.objects.filter(
            last_activity__lt=cutoff_date,
            is_active=False
        )
        session_count = old_sessions.count()
        
        if not dry_run:
            old_sessions.delete()
        
        self.stdout.write(
            f'User sessions: {session_count} old inactive sessions {"would be" if dry_run else ""} deleted'
        )

        # Clean up blacklisted JWT tokens
        try:
            old_blacklisted = BlacklistedToken.objects.filter(
                token__created_at__lt=cutoff_date
            )
            blacklisted_count = old_blacklisted.count()
            
            if not dry_run:
                old_blacklisted.delete()
            
            self.stdout.write(
                f'JWT tokens: {blacklisted_count} old blacklisted tokens {"would be" if dry_run else ""} deleted'
            )
        except Exception as e:
            self.stdout.write(
                self.style.WARNING(f'Could not clean JWT tokens: {e}')
            )

        self.stdout.write(
            self.style.SUCCESS('Token cleanup completed successfully!')
        )


# File: backend/users/management/commands/unlock_accounts.py
# Unlock accounts that have been locked for too long

from django.core.management.base import BaseCommand
from django.utils import timezone
from users.models import User, AuditLog


class Command(BaseCommand):
    help = 'Unlock user accounts that have been locked beyond the lockout period'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force unlock all locked accounts regardless of time'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be unlocked without actually unlocking'
        )

    def handle(self, *args, **options):
        force = options['force']
        dry_run = options['dry_run']
        now = timezone.now()
        
        if force:
            # Unlock all locked accounts
            locked_users = User.objects.filter(
                account_locked_until__isnull=False
            )
            self.stdout.write('Force unlocking ALL locked accounts...')
        else:
            # Unlock accounts where lockout period has expired
            locked_users = User.objects.filter(
                account_locked_until__lt=now
            )
            self.stdout.write('Unlocking accounts with expired lockout periods...')
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('DRY RUN MODE - No accounts will be unlocked')
            )

        count = 0
        for user in locked_users:
            if not dry_run:
                user.unlock_account()
                
                # Log the unlock action
                AuditLog.objects.create(
                    user=user,
                    action='account_unlocked',
                    details={
                        'method': 'management_command',
                        'force': force,
                        'previous_lockout_until': user.account_locked_until.isoformat() if user.account_locked_until else None
                    }
                )
            
            count += 1
            self.stdout.write(f'{"Would unlock" if dry_run else "Unlocked"}: {user.username} ({user.email})')
        
        if count == 0:
            self.stdout.write('No locked accounts found to unlock.')
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f'{"Would unlock" if dry_run else "Unlocked"} {count} account(s) successfully!'
                )
            )


# File: backend/users/management/commands/security_report.py
# Generate security reports for admin review

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Count, Q
from users.models import User, AuditLog, UserSession
from datetime import timedelta


class Command(BaseCommand):
    help = 'Generate security reports for user accounts and authentication events'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=7,
            help='Number of days to include in the report (default: 7)'
        )
        parser.add_argument(
            '--format',
            choices=['text', 'csv'],
            default='text',
            help='Output format (default: text)'
        )

    def handle(self, *args, **options):
        days = options['days']
        output_format = options['format']
        start_date = timezone.now() - timedelta(days=days)
        
        self.stdout.write(
            self.style.SUCCESS(f'Security Report - Last {days} days')
        )
        self.stdout.write('=' * 50)
        
        # User Statistics
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        verified_users = User.objects.filter(email_verified=True).count()
        locked_users = User.objects.filter(account_locked_until__gt=timezone.now()).count()
        
        self.stdout.write('\nUSER STATISTICS:')
        self.stdout.write(f'Total Users: {total_users}')
        self.stdout.write(f'Active Users: {active_users} ({active_users/total_users*100:.1f}%)')
        self.stdout.write(f'Verified Users: {verified_users} ({verified_users/total_users*100:.1f}%)')
        self.stdout.write(f'Locked Accounts: {locked_users}')
        
        # Authentication Events
        login_events = AuditLog.objects.filter(
            action='login',
            timestamp__gte=start_date
        ).count()
        
        failed_logins = AuditLog.objects.filter(
            action='login_failed',
            timestamp__gte=start_date
        ).count()
        
        password_changes = AuditLog.objects.filter(
            action='password_change',
            timestamp__gte=start_date
        ).count()
        
        password_resets = AuditLog.objects.filter(
            action='password_reset',
            timestamp__gte=start_date
        ).count()
        
        self.stdout.write('\nAUTHENTICATION EVENTS:')
        self.stdout.write(f'Successful Logins: {login_events}')
        self.stdout.write(f'Failed Logins: {failed_logins}')
        self.stdout.write(f'Password Changes: {password_changes}')
        self.stdout.write(f'Password Resets: {password_resets}')
        
        if login_events + failed_logins > 0:
            success_rate = login_events / (login_events + failed_logins) * 100
            self.stdout.write(f'Login Success Rate: {success_rate:.1f}%')
        
        # Top Failed Login IPs
        failed_ips = AuditLog.objects.filter(
            action='login_failed',
            timestamp__gte=start_date,
            ip_address__isnull=False
        ).values('ip_address').annotate(
            count=Count('ip_address')
        ).order_by('-count')[:10]
        
        if failed_ips:
            self.stdout.write('\nTOP FAILED LOGIN IPs:')
            for ip_data in failed_ips:
                self.stdout.write(f"{ip_data['ip_address']}: {ip_data['count']} attempts")
        
        # Active Sessions
        active_sessions = UserSession.objects.filter(is_active=True).count()
        self.stdout.write(f'\nActive Sessions: {active_sessions}')
        
        # Account Types Distribution
        account_types = User.objects.values('account_type').annotate(
            count=Count('account_type')
        ).order_by('-count')
        
        self.stdout.write('\nACCOUNT TYPES:')
        for account_type in account_types:
            self.stdout.write(f"{account_type['account_type']}: {account_type['count']}")
        
        # Recent Registrations
        new_users = User.objects.filter(created_at__gte=start_date).count()
        self.stdout.write(f'\nNew Registrations: {new_users}')
        
        # Users requiring attention
        unverified_old = User.objects.filter(
            email_verified=False,
            created_at__lt=timezone.now() - timedelta(days=7)
        ).count()
        
        multiple_failed = User.objects.filter(
            failed_login_attempts__gte=3
        ).count()
        
        self.stdout.write('\nUSERS REQUIRING ATTENTION:')
        self.stdout.write(f'Unverified >7 days: {unverified_old}')
        self.stdout.write(f'Multiple failed attempts: {multiple_failed}')
        
        self.stdout.write('\n' + '=' * 50)
        self.stdout.write('Report completed successfully!')


# File: backend/users/management/commands/send_verification_reminders.py
# Send reminder emails to unverified users

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from users.models import User, EmailVerificationToken
from datetime import timedelta


class Command(BaseCommand):
    help = 'Send email verification reminders to unverified users'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=3,
            help='Send reminders to users registered X days ago (default: 3)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show who would receive reminders without sending emails'
        )

    def handle(self, *args, **options):
        days_ago = options['days']
        dry_run = options['dry_run']
        
        # Find users who registered X days ago and haven't verified email
        target_date = timezone.now() - timedelta(days=days_ago)
        start_of_day = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = target_date.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        unverified_users = User.objects.filter(
            created_at__range=(start_of_day, end_of_day),
            email_verified=False,
            is_active=True
        )
        
        self.stdout.write(
            f'Found {unverified_users.count()} unverified users from {days_ago} days ago'
        )
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('DRY RUN MODE - No emails will be sent')
            )
            for user in unverified_users:
                self.stdout.write(f'Would send reminder to: {user.email}')
            return
        
        sent_count = 0
        error_count = 0
        
        for user in unverified_users:
            try:
                # Get or create verification token
                verification_token = EmailVerificationToken.objects.filter(
                    user=user, used=False
                ).first()
                
                if not verification_token or verification_token.is_expired:
                    verification_token = EmailVerificationToken.objects.create(user=user)
                
                # Send reminder email
                self.send_reminder_email(user, verification_token)
                sent_count += 1
                
                self.stdout.write(f'Sent reminder to: {user.email}')
                
            except Exception as e:
                error_count += 1
                self.stdout.write(
                    self.style.ERROR(f'Failed to send to {user.email}: {str(e)}')
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Reminder emails sent: {sent_count}, Errors: {error_count}'
            )
        )

    def send_reminder_email(self, user, verification_token):
        """Send verification reminder email"""
        # Build verification URL (you may need to adjust this)
        verification_url = f"{settings.FRONTEND_URL}/verify-email?token={verification_token.token}"
        
        context = {
            'user': user,
            'verification_url': verification_url,
            'site_name': 'TradeProHub',
            'days_since_registration': (timezone.now() - user.created_at).days,
        }
        
        # Render email template
        subject = f'Reminder: Verify your {context["site_name"]} account'
        html_message = render_to_string('emails/verification_reminder.html', context)
        plain_message = strip_tags(html_message)
        
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )


# File: backend/users/management/commands/create_test_users.py
# Create test users for development

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


class Command(BaseCommand):
    help = 'Create test users for development and testing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=10,
            help='Number of test users to create (default: 10)'
        )
        parser.add_argument(
            '--verified',
            action='store_true',
            help='Create users with verified emails'
        )

    def handle(self, *args, **options):
        count = options['count']
        verified = options['verified']
        
        self.stdout.write(f'Creating {count} test users...')
        
        created_count = 0
        for i in range(1, count + 1):
            username = f'testuser{i}'
            email = f'testuser{i}@example.com'
            
            if User.objects.filter(username=username).exists():
                self.stdout.write(f'User {username} already exists, skipping...')
                continue
            
            user = User.objects.create_user(
                username=username,
                email=email,
                password='testpass123',
                first_name=f'Test{i}',
                last_name='User',
                account_type='individual' if i % 2 == 0 else 'business',
                email_verified=verified,
            )
            
            created_count += 1
            self.stdout.write(f'Created user: {username} ({email})')
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully created {created_count} test users!')
        )
        
        if not verified:
            self.stdout.write(
                self.style.WARNING('Test users created with unverified emails. '
                                 'Use --verified flag to create verified users.')
            )