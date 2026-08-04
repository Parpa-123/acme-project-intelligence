import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# The DATABASE_URL is set in docker-compose.yml
# We use psycopg for synchronous ORM by default here.
# E.g. postgresql+psycopg://appuser:apppassword@postgres:5432/appdb
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql+psycopg://appuser:apppassword@localhost:5432/appdb")

engine = create_engine(
    DATABASE_URL,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True, # Prevent "MySQL/Postgres server has gone away" errors
    pool_recycle=3600   # Recycle connections every hour
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency for FastAPI endpoints
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
