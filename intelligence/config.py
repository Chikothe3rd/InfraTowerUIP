import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session

DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://infratel:infratel_secret@db:5432/infratel"
)
BACKEND_URL = os.getenv("BACKEND_URL", "http://backend:3001")

# Create connection engine
engine = create_engine(DATABASE_URL, pool_size=5, max_overflow=10)

# Scoped session maker
session_factory = sessionmaker(bind=engine)
Session = scoped_session(session_factory)
