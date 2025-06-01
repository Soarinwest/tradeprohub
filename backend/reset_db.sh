# File: backend/reset_db.sh
# Script to reset database and create fresh migrations

echo "⚠️  WARNING: This will delete all data and migrations!"
echo "Press Ctrl+C to cancel or Enter to continue..."
read

# Navigate to backend directory
cd "$(dirname "$0")"

echo "🗑️  Removing old migration files..."
find . -path "*/migrations/*.py" -not -name "__init__.py" -delete
find . -path "*/migrations/*.pyc" -delete

echo "🗑️  Removing database..."
rm -f db.sqlite3

echo "📝 Creating new migrations..."
python manage.py makemigrations users
python manage.py makemigrations profiles
python manage.py makemigrations

echo "🔄 Applying migrations..."
python manage.py migrate

echo "✅ Creating superuser..."
#python manage.py createsuperuser --email admin@tradeprohub.com

echo "✅ Database reset complete!"