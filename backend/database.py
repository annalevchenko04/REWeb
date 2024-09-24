import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

from dotenv import load_dotenv
load_dotenv()

URL_DATABASE = os.getenv("DATABASE_URL")

if not URL_DATABASE:
    raise ValueError("DATABASE_URL is not set in environment variables.")

engine = create_engine(URL_DATABASE)
SessionLocal = sessionmaker(autocommit=False,autoflush=False,bind=engine)
Base = declarative_base()