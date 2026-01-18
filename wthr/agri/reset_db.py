import os
import shutil

# 1. Delete the Database File
if os.path.exists("db.sqlite3"):
    os.remove("db.sqlite3")
    print("🗑️ Deleted old db.sqlite3")

# 2. Delete Old Migrations (But keep the folder)
migration_path = os.path.join("agri_supply", "migrations")
if os.path.exists(migration_path):
    shutil.rmtree(migration_path)
    os.makedirs(migration_path)
    # Create empty __init__.py
    with open(os.path.join(migration_path, "__init__.py"), "w") as f:
        pass
    print("🗑️ Cleared migration history")

print("\n✅ CLEANUP COMPLETE.")
print("Now run exactly these 3 commands:")
print("1. python manage.py makemigrations")
print("2. python manage.py migrate")
print("3. python manage.py runserver")
