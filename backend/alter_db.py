import os
import sys

# Add the backend root directory to sys.path
sys.path.insert(0, os.path.dirname(__file__))

from src.database import DATABASE_URL
from sqlalchemy import create_engine, text

engine = create_engine(DATABASE_URL)
with engine.connect() as conn:
    conn.execute(text("ALTER TABLE chat_sessions ALTER COLUMN project_id DROP NOT NULL;"))
    conn.commit()
print("Table altered successfully!")
