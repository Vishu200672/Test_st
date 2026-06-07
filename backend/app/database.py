import os
import shutil
import glob
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# 1. Configurable Connection: Support Cloud Databases (PostgreSQL/Supabase)
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./proposal_agent.db")

if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Extract SQLite file path dynamically
is_sqlite = SQLALCHEMY_DATABASE_URL.startswith("sqlite")
db_file_path = None
if is_sqlite:
    db_file_path = SQLALCHEMY_DATABASE_URL.replace("sqlite:///", "", 1)
    if db_file_path.startswith("/"):
        db_file_path = db_file_path[1:]

BACKUP_DIR = "./db_backups"

# 2. Database Auto-Recovery System
def restore_db_if_missing():
    try:
        if db_file_path and not os.path.exists(db_file_path) and os.path.exists(BACKUP_DIR):
            db_name = os.path.basename(db_file_path)
            backups = sorted(glob.glob(os.path.join(BACKUP_DIR, f"{db_name}_*.db")))
            if backups:
                latest_backup = backups[-1]
                shutil.copy2(latest_backup, db_file_path)
                print(f"[DATABASE RECOVERY] Restored missing database from latest backup: {latest_backup}")
                return True
    except Exception as e:
        print(f"Error restoring database backup: {e}")
    return False

# 3. Database Auto-Backup System (Optimized for Write-Only commits)
def backup_db():
    try:
        if not db_file_path or not os.path.exists(db_file_path):
            return
        
        db_name = os.path.basename(db_file_path)
        db_mtime = os.path.getmtime(db_file_path)
        os.makedirs(BACKUP_DIR, exist_ok=True)
        backups = sorted(glob.glob(os.path.join(BACKUP_DIR, f"{db_name}_*.db")))
        
        # Avoid redundant backups if database hasn't changed
        if backups:
            latest_backup = backups[-1]
            if os.path.getmtime(latest_backup) >= db_mtime:
                return
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = os.path.join(BACKUP_DIR, f"{db_name}_{timestamp}.db")
        shutil.copy2(db_file_path, backup_path)
        
        # Keep last 5 rolling backups
        backups = sorted(glob.glob(os.path.join(BACKUP_DIR, f"{db_name}_*.db")))
        while len(backups) > 5:
            oldest = backups.pop(0)
            try:
                os.remove(oldest)
            except Exception:
                pass
    except Exception as e:
        print(f"Error backing up database: {e}")

# Recover database if SQLite is used and the main file was deleted
if is_sqlite:
    restore_db_if_missing()

# 4. Engine declaration with conditional connect_args
connect_args = {}
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args=connect_args
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        # Trigger rolling backup after database write operations complete
        if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
            backup_db()

