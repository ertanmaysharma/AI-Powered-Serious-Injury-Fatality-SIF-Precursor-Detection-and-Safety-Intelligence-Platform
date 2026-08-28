import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sifguard.db")
SECRET_KEY = os.getenv("SECRET_KEY", "sifguard-dev-secret-key-change-in-production")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))
MODEL_MODE = os.getenv("MODEL_MODE", "demo")
APP_NAME = os.getenv("APP_NAME", "SIF-GUARD")
