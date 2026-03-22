"""
Shared utilities for StartupManager Pro API
Collection accessors, serialization, JWT, OTP, AI content generation
"""
import os
import uuid
import random
import string
import logging
import jwt
import asyncio
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from database import get_collection
from emergentintegrations.llm.chat import LlmChat, UserMessage

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'super-secret-key')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Admin email
ADMIN_EMAIL = "bangalykaba635@gmail.com"

# OTP Storage (in production, use Redis)
otp_storage = {}

# Security dependency
security = HTTPBearer(auto_error=False)


# ========================
# COLLECTION ACCESSORS
# ========================
def users_col():
    return get_collection("users")

def shops_col():
    return get_collection("shops")

def products_col():
    return get_collection("products")

def batches_col():
    return get_collection("batches")

def sales_col():
    return get_collection("sales")

def sale_items_col():
    return get_collection("sale_items")

def employees_col():
    return get_collection("employees")

def documents_col():
    return get_collection("documents")

def accounts_col():
    return get_collection("accounts")

def access_requests_col():
    return get_collection("access_requests")

def authorized_users_col():
    return get_collection("authorized_users")

def payments_col():
    return get_collection("payments")

def whatsapp_messages_col():
    return get_collection("whatsapp_messages")

def incidents_col():
    return get_collection("incidents")

def returns_col():
    return get_collection("returns")

def subscription_plans_col():
    return get_collection("subscription_plans")


# ========================
# SERIALIZATION
# ========================
def serialize_doc(doc):
    if doc is None:
        return None
    if isinstance(doc, dict):
        doc = dict(doc)
        if '_id' in doc:
            del doc['_id']
        return doc
    return doc

def serialize_docs(docs):
    return [serialize_doc(d) for d in docs]


# ========================
# JWT FUNCTIONS
# ========================
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")


# ========================
# AUTH DEPENDENCY
# ========================
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user from JWT token"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Non authentifié")
    payload = verify_token(credentials.credentials)
    user = users_col().find_one({"id": payload.get("user_id")})
    if not user:
        raise HTTPException(status_code=401, detail="Utilisateur non trouvé")
    return serialize_doc(user)

def get_shop_filter(user: dict) -> dict:
    """Return a filter dict to scope queries by the user's shop.
    Super Admin / CEO roles see ALL data (no filter).
    Owners and below only see their own shop's data."""
    role = user.get("role", "")
    if role in ("super_admin", "ceo"):
        return {}
    shop_id = user.get("shop_id")
    if shop_id:
        return {"shop_id": shop_id}
    return {}

def is_admin_role(user: dict) -> bool:
    """Check if user has admin-level access (sees all data)."""
    return user.get("role") in ("super_admin", "ceo")


# ========================
# OTP FUNCTIONS
# ========================
def generate_otp(length=6):
    return ''.join(random.choices(string.digits, k=length))

def store_otp(email: str, otp: str, data: dict = None):
    otp_storage[email] = {
        "otp": otp,
        "data": data or {},
        "created_at": datetime.now(timezone.utc),
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=5)
    }

def verify_otp(email: str, otp: str):
    if email not in otp_storage:
        return None, "Code OTP non trouvé. Veuillez recommencer l'inscription."
    stored = otp_storage[email]
    if datetime.now(timezone.utc) > stored["expires_at"]:
        del otp_storage[email]
        return None, "Code OTP expiré. Veuillez demander un nouveau code."
    if stored["otp"] != otp:
        return None, "Code OTP incorrect."
    data = stored["data"]
    del otp_storage[email]
    return data, None


# ========================
# AI CONTENT GENERATION
# ========================
EMERGENT_API_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

async def generate_ai_content(prompt: str, system_message: str = "Tu es un assistant professionnel pour la gestion d'entreprise.") -> str:
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            return "Clé API non configurée. Contenu de démonstration généré."
        
        chat = LlmChat(
            api_key=api_key,
            session_id=str(uuid.uuid4()),
            system_message=system_message
        ).with_model("openai", "gpt-5.2")
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        return response
    except Exception as e:
        logging.error(f"AI Generation Error: {e}")
        return f"Erreur de génération IA. Contenu par défaut fourni."
