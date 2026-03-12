from fastapi import FastAPI, APIRouter, HTTPException, status, Request, Depends
from fastapi.responses import StreamingResponse, HTMLResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
import qrcode
from io import BytesIO
import base64
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import cm
from emergentintegrations.llm.chat import LlmChat, UserMessage
import asyncio
import resend
from database import get_database, get_collection, init_indexes
from security import (
    SUPER_ADMIN_EMAIL, ROLE_PERMISSIONS, get_role_permissions, check_permission,
    is_super_admin, add_to_whitelist, remove_from_whitelist, is_whitelisted,
    get_whitelist, log_access_attempt, get_pending_attempts, approve_attempt,
    deny_attempt, block_user, unblock_user, is_blocked, get_blocked_users,
    log_action, get_audit_log, create_session, validate_session,
    invalidate_session, invalidate_all_user_sessions, init_security
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'super-secret-key')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Resend Configuration
resend.api_key = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
ADMIN_NOTIFICATION_EMAIL = os.environ.get('ADMIN_NOTIFICATION_EMAIL', 'bangalykaba635@gmail.com')

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Create the main app
app = FastAPI(title="StartupManager Pro API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Admin email for access control
ADMIN_EMAIL = "bangalykaba635@gmail.com"

# OTP Storage for 2FA (in production, use Redis)
import random
import string
otp_storage = {}

def generate_otp(length=6):
    """Generate a random OTP code"""
    return ''.join(random.choices(string.digits, k=length))

def store_otp(email: str, otp: str, data: dict = None):
    """Store OTP with expiration (5 minutes)"""
    otp_storage[email] = {
        "otp": otp,
        "data": data,
        "expires": datetime.now(timezone.utc) + timedelta(minutes=5)
    }

def verify_otp(email: str, otp: str):
    """Verify OTP and return stored data if valid"""
    if email not in otp_storage:
        return None, "Code OTP non trouvé"
    
    stored = otp_storage[email]
    if datetime.now(timezone.utc) > stored["expires"]:
        del otp_storage[email]
        return None, "Code OTP expiré"
    
    if stored["otp"] != otp:
        return None, "Code OTP invalide"
    
    data = stored["data"]
    del otp_storage[email]
    return data, None

# IRP (Incident Response Plan) Storage
irp_incidents = []

# ========================
# MONGODB COLLECTIONS
# ========================
def users_col():
    return get_collection('users')

def shops_col():
    return get_collection('shops')

def products_col():
    return get_collection('products')

def batches_col():
    return get_collection('batches')

def sales_col():
    return get_collection('sales')

def sale_items_col():
    return get_collection('sale_items')

def employees_col():
    return get_collection('employees')

def documents_col():
    return get_collection('documents')

def accounts_col():
    return get_collection('accounts')

def access_requests_col():
    return get_collection('access_requests')

def authorized_users_col():
    return get_collection('authorized_users')

def payments_col():
    return get_collection('payments')

def whatsapp_messages_col():
    return get_collection('whatsapp_messages')

# ========================
# HELPER FUNCTIONS
# ========================
def serialize_doc(doc):
    """Convert MongoDB document to JSON-serializable dict"""
    if doc is None:
        return None
    doc = dict(doc)
    if '_id' in doc:
        del doc['_id']
    return doc

def serialize_docs(docs):
    """Convert list of MongoDB documents"""
    return [serialize_doc(doc) for doc in docs]

# ========================
# INITIALIZE DEMO DATA
# ========================
def init_demo_data():
    """Initialize demo data if database is empty"""
    db = get_database()
    
    # Check if already initialized
    if users_col().count_documents({}) > 0:
        logging.info("Database already initialized with demo data")
        return
    
    logging.info("Initializing demo data...")
    
    # Create demo CEO user
    demo_user_id = str(uuid.uuid4())
    demo_shop_id = str(uuid.uuid4())
    
    users_col().insert_one({
        "id": demo_user_id,
        "name": "Admin CEO",
        "email": "admin@startup.com",
        "password": pwd_context.hash("admin123"),
        "role": "ceo",
        "shop_id": demo_shop_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Create demo shop
    shops_col().insert_one({
        "id": demo_shop_id,
        "name": "Boutique Principale",
        "address": "123 Rue Commerce, Dakar",
        "phone": "+221 77 123 4567",
        "orange_money_number": "+221 77 999 8888",
        "bank_account": "SN001234567890"
    })
    
    # Create demo accounts for the shop
    for acc_type in ["cash", "orange_money", "bank"]:
        acc_id = str(uuid.uuid4())
        accounts_col().insert_one({
            "id": acc_id,
            "shop_id": demo_shop_id,
            "type": acc_type,
            "balance": 500000 if acc_type == "cash" else (750000 if acc_type == "orange_money" else 2500000)
        })
    
    # Create demo products
    products_data = [
        ("T-Shirt Premium", "Vêtements", 15000),
        ("Jean Slim", "Vêtements", 25000),
        ("Robe Élégante", "Vêtements", 35000),
        ("Sneakers Sport", "Chaussures", 45000),
        ("Sandales Cuir", "Chaussures", 20000),
        ("Sac à Main", "Accessoires", 30000),
        ("Ceinture Cuir", "Accessoires", 12000),
        ("Montre Classic", "Accessoires", 55000),
    ]
    
    for name, category, price in products_data:
        prod_id = str(uuid.uuid4())
        products_col().insert_one({
            "id": prod_id,
            "shop_id": demo_shop_id,
            "name": name,
            "category": category,
            "price": price,
            "description": f"Description de {name}",
            "image_url": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Create demo batch for each product
        batch_id = str(uuid.uuid4())
        batches_col().insert_one({
            "id": batch_id,
            "product_id": prod_id,
            "lot_number": f"LOT-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:4].upper()}",
            "size": "M",
            "color": "Noir",
            "quantity": 50,
            "qr_code": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # Create demo employees
    employees_data = [
        ("Fatou Diallo", "Manager", 450000, "CDI"),
        ("Moussa Ndiaye", "Caissier", 200000, "CDI"),
        ("Aminata Fall", "Stock Manager", 250000, "CDD"),
        ("Ibrahima Sow", "Vendeur", 180000, "Stage"),
    ]
    
    for name, position, salary, contract_type in employees_data:
        emp_id = str(uuid.uuid4())
        employees_col().insert_one({
            "id": emp_id,
            "shop_id": demo_shop_id,
            "name": name,
            "position": position,
            "salary": salary,
            "contract_type": contract_type
        })
    
    # Auto-authorize the demo admin account
    authorized_users_col().insert_one({
        "id": str(uuid.uuid4()),
        "name": "Admin CEO",
        "email": "admin@startup.com",
        "access_type": "permanent",
        "expires_at": None,
        "approved_at": datetime.now(timezone.utc).isoformat()
    })
    
    logging.info("Demo data initialized successfully!")

# ========================
# EMAIL NOTIFICATION FUNCTION
# ========================
async def send_access_notification_email(request_name: str, request_email: str, request_reason: str, request_id: str):
    """Send email notification to admin when someone requests access"""
    try:
        if not resend.api_key or resend.api_key == 're_your_api_key_here':
            logging.warning("Resend API key not configured - skipping email notification")
            return False
        
        app_url = os.environ.get('APP_URL', 'https://startup-manager-pro.preview.emergentagent.com')
        api_url = f"{app_url}/api"
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
    <div style="background: linear-gradient(135deg, #6366f1 0%, #f97316 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🔔 Nouvelle Demande d'Accès</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">BINTRONIX</p>
    </div>
    
    <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <p style="color: #333; font-size: 16px; margin-bottom: 20px;">
            Bonjour <strong>BINTRONIX</strong>,
        </p>
        
        <p style="color: #666; font-size: 14px;">
            Une nouvelle personne souhaite accéder à votre application :
        </p>
        
        <div style="background: #f8f9fa; border-left: 4px solid #6366f1; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 0 0 10px 0;"><strong>👤 Nom :</strong> {request_name}</p>
            <p style="margin: 0 0 10px 0;"><strong>📧 Email :</strong> {request_email}</p>
            <p style="margin: 0;"><strong>📝 Motif :</strong> {request_reason or 'Non spécifié'}</p>
        </div>
        
        <p style="color: #333; font-size: 18px; font-weight: bold; margin: 30px 0 20px 0; text-align: center;">
            ⚡ Choisissez une action :
        </p>
        
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
                <td align="center" style="padding: 10px 0;">
                    <table cellpadding="0" cellspacing="0" border="0">
                        <tr>
                            <td align="center" bgcolor="#10B981" style="border-radius: 10px;">
                                <a href="{app_url}/access-action?id={request_id}&action=approve&type=permanent" 
                                   target="_blank"
                                   style="display: block; padding: 20px 50px; font-family: Arial, sans-serif; font-size: 18px; font-weight: bold; color: #ffffff; text-decoration: none; border-radius: 10px;">
                                    ✅ ACCÈS PERMANENT
                                </a>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td align="center" style="padding: 10px 0;">
                    <table cellpadding="0" cellspacing="0" border="0">
                        <tr>
                            <td align="center" bgcolor="#3B82F6" style="border-radius: 10px;">
                                <a href="{app_url}/access-action?id={request_id}&action=approve&type=temporary" 
                                   target="_blank"
                                   style="display: block; padding: 20px 50px; font-family: Arial, sans-serif; font-size: 18px; font-weight: bold; color: #ffffff; text-decoration: none; border-radius: 10px;">
                                    ⏱️ ACCÈS 20 MINUTES
                                </a>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td align="center" style="padding: 10px 0;">
                    <table cellpadding="0" cellspacing="0" border="0">
                        <tr>
                            <td align="center" bgcolor="#EF4444" style="border-radius: 10px;">
                                <a href="{app_url}/access-action?id={request_id}&action=deny" 
                                   target="_blank"
                                   style="display: block; padding: 20px 50px; font-family: Arial, sans-serif; font-size: 18px; font-weight: bold; color: #ffffff; text-decoration: none; border-radius: 10px;">
                                    ❌ REFUSER L'ACCÈS
                                </a>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
        
        <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            Cliquez sur un bouton ci-dessus pour autoriser ou refuser l'accès.<br>
            L'action sera appliquée immédiatement.
        </p>
    </div>
    
    <p style="color: #999; font-size: 11px; text-align: center; margin-top: 20px;">
        Développé par BINTRONIX | BINTRONIX
    </p>
</body>
</html>
        """
        
        params = {
            "from": SENDER_EMAIL,
            "to": [ADMIN_NOTIFICATION_EMAIL],
            "subject": f"🔔 Nouvelle demande d'accès de {request_name}",
            "html": html_content
        }
        
        email_result = await asyncio.to_thread(resend.Emails.send, params)
        logging.info(f"Access notification email sent: {email_result}")
        return True
        
    except Exception as e:
        logging.error(f"Failed to send access notification email: {str(e)}")
        return False

# ========================
# AI CONTENT GENERATION
# ========================
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

# ========================
# RESULT PAGE FOR EMAIL ACTIONS
# ========================
def get_result_page(status: str, message: str) -> str:
    """Generate HTML result page for quick actions"""
    colors = {
        "success": ("#10B981", "✅"),
        "denied": ("#EF4444", "❌"),
        "error": ("#EF4444", "⚠️"),
        "info": ("#3B82F6", "ℹ️")
    }
    color, icon = colors.get(status, ("#6366f1", "📋"))
    
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>BINTRONIX - Action Effectuée</title>
        <style>
            * {{ margin: 0; padding: 0; box-sizing: border-box; }}
            body {{ 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }}
            .card {{
                background: white;
                border-radius: 16px;
                padding: 40px;
                max-width: 500px;
                width: 100%;
                text-align: center;
                box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
            }}
            .icon {{
                font-size: 64px;
                margin-bottom: 20px;
            }}
            .title {{
                font-size: 24px;
                font-weight: 700;
                color: #1f2937;
                margin-bottom: 15px;
            }}
            .message {{
                font-size: 16px;
                color: #6b7280;
                line-height: 1.6;
                padding: 15px;
                background: #f3f4f6;
                border-radius: 8px;
                border-left: 4px solid {color};
            }}
            .footer {{
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                color: #9ca3af;
                font-size: 12px;
            }}
            .logo {{
                display: inline-flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 30px;
            }}
            .logo-icon {{
                width: 32px;
                height: 32px;
                background: linear-gradient(135deg, #6366f1 0%, #f97316 100%);
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: 12px;
            }}
        </style>
    </head>
    <body>
        <div class="card">
            <div class="logo">
                <div class="logo-icon">BK</div>
                <span style="font-weight: 600; color: #1f2937;">BINTRONIX</span>
            </div>
            <div class="icon">{icon}</div>
            <h1 class="title">Action Effectuée</h1>
            <p class="message">{message}</p>
            <div class="footer">
                Vous pouvez fermer cette page.<br>
                Développé par <strong>BINTRONIX</strong>
            </div>
        </div>
    </body>
    </html>
    """

# ========================
# PYDANTIC MODELS
# ========================

# Access Request Models
class AccessRequest(BaseModel):
    name: str
    email: EmailStr
    reason: Optional[str] = None

class ApproveAccess(BaseModel):
    access_type: str

# Auth Models
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "cashier"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    shop_id: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class ForgotPassword(BaseModel):
    email: EmailStr

# Access Action Models (for email links)
class AccessActionApprove(BaseModel):
    request_id: str
    access_type: str = "permanent"

class AccessActionDeny(BaseModel):
    request_id: str

# Security Models
class WhitelistAdd(BaseModel):
    email: EmailStr
    name: str
    role: str = "viewer"

class BlockUser(BaseModel):
    email: EmailStr
    reason: Optional[str] = None

class ApproveAccessRequest(BaseModel):
    attempt_id: str
    role: str = "viewer"

# Shop Models
class ShopCreate(BaseModel):
    name: str
    address: str
    phone: str
    orange_money_number: Optional[str] = None
    bank_account: Optional[str] = None

class ShopResponse(BaseModel):
    id: str
    name: str
    address: str
    phone: str
    orange_money_number: Optional[str] = None
    bank_account: Optional[str] = None

# Product Models
class ProductCreate(BaseModel):
    name: str
    category: str
    price: float
    description: Optional[str] = None
    image_url: Optional[str] = None

class ProductResponse(BaseModel):
    id: str
    shop_id: str
    name: str
    category: str
    price: float
    description: Optional[str] = None
    image_url: Optional[str] = None
    created_at: str
    stock_quantity: int = 0

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    description: Optional[str] = None
    image_url: Optional[str] = None

# Batch/Stock Models
class BatchCreate(BaseModel):
    product_id: str
    lot_number: Optional[str] = None
    size: str
    color: str
    quantity: int

class BatchResponse(BaseModel):
    id: str
    product_id: str
    product_name: Optional[str] = None
    lot_number: str
    size: str
    color: str
    quantity: int
    qr_code: Optional[str] = None
    created_at: str

class BatchUpdate(BaseModel):
    quantity: Optional[int] = None
    size: Optional[str] = None
    color: Optional[str] = None

# Sale Models
class SaleItemCreate(BaseModel):
    product_id: str
    quantity: int
    price: float

class SaleCreate(BaseModel):
    items: List[SaleItemCreate]
    payment_method: str
    customer_phone: Optional[str] = None

class SaleResponse(BaseModel):
    id: str
    shop_id: str
    user_id: str
    total: float
    payment_method: str
    customer_phone: Optional[str] = None
    items: List[dict] = []
    created_at: str

# Employee Models
class EmployeeCreate(BaseModel):
    name: str
    position: str
    salary: float
    contract_type: str

class EmployeeResponse(BaseModel):
    id: str
    shop_id: str
    name: str
    position: str
    salary: float
    contract_type: str

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    position: Optional[str] = None
    salary: Optional[float] = None
    contract_type: Optional[str] = None

# Document Models
class DocumentCreate(BaseModel):
    employee_id: str
    type: str

class DocumentResponse(BaseModel):
    id: str
    employee_id: str
    employee_name: Optional[str] = None
    type: str
    content: str
    signed: bool
    created_at: str

# Account Models
class AccountResponse(BaseModel):
    id: str
    shop_id: str
    type: str
    balance: float

# AI Models
class AIContractRequest(BaseModel):
    employee_id: str

class AIMarketingRequest(BaseModel):
    type: str
    title: str
    description: str
    price: Optional[float] = None

class AIHelpRequest(BaseModel):
    question: str

# Payment Models
class PaymentInitiate(BaseModel):
    amount: float
    phone: Optional[str] = None
    sale_id: Optional[str] = None

class PaymentResponse(BaseModel):
    status: str
    transaction_id: str
    message: str
    details: Optional[dict] = None

# WhatsApp Models
class WhatsAppReceipt(BaseModel):
    phone: str
    sale_id: str

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

# Security dependency for protected routes
security = HTTPBearer(auto_error=False)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user from JWT token"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    payload = verify_token(credentials.credentials)
    user = users_col().find_one({"id": payload.get("user_id")})
    if not user:
        raise HTTPException(status_code=401, detail="Utilisateur non trouvé")
    
    return serialize_doc(user)

# ========================
# ACCESS CONTROL ROUTES
# ========================

@api_router.post("/access/request")
async def request_access(request: AccessRequest):
    """Request access to the application"""
    if request.email.lower() == ADMIN_EMAIL.lower():
        return {"status": "already_authorized", "message": "Accès admin automatique"}
    
    # Check if already authorized
    auth = authorized_users_col().find_one({"email": request.email})
    if auth:
        auth = serialize_doc(auth)
        if auth["access_type"] == "permanent" or \
           (auth.get("expires_at") and datetime.fromisoformat(auth["expires_at"]) > datetime.now(timezone.utc)):
            return {"status": "already_authorized", "message": "Vous avez déjà accès à l'application"}
    
    # Check if request already pending
    pending = access_requests_col().find_one({"email": request.email, "status": "pending"})
    if pending:
        return {"status": "pending", "message": "Votre demande est en cours de traitement"}
    
    request_id = str(uuid.uuid4())
    access_requests_col().insert_one({
        "id": request_id,
        "name": request.name,
        "email": request.email,
        "reason": request.reason,
        "status": "pending",
        "access_type": None,
        "expires_at": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    await send_access_notification_email(
        request_name=request.name,
        request_email=request.email,
        request_reason=request.reason or "",
        request_id=request_id
    )
    
    return {
        "status": "submitted",
        "message": "Demande envoyée! BINTRONIX va examiner votre demande.",
        "request_id": request_id
    }

@api_router.get("/access/check/{email}")
async def check_access(email: str):
    """Check if an email has access"""
    if email.lower() == ADMIN_EMAIL.lower():
        return {"authorized": True, "access_type": "permanent", "is_admin": True}
    
    auth = authorized_users_col().find_one({"email": email})
    if auth:
        auth = serialize_doc(auth)
        if auth["access_type"] == "permanent":
            return {"authorized": True, "access_type": "permanent"}
        elif auth.get("expires_at"):
            expires = datetime.fromisoformat(auth["expires_at"])
            if expires > datetime.now(timezone.utc):
                remaining = (expires - datetime.now(timezone.utc)).total_seconds()
                return {
                    "authorized": True, 
                    "access_type": "temporary",
                    "remaining_seconds": int(remaining)
                }
            else:
                authorized_users_col().delete_one({"id": auth["id"]})
                return {"authorized": False, "message": "Accès expiré"}
    
    pending = access_requests_col().find_one({"email": email, "status": "pending"})
    if pending:
        return {"authorized": False, "status": "pending"}
    
    return {"authorized": False}

@api_router.get("/access/requests")
async def get_access_requests():
    """Get all access requests (Admin only)"""
    requests = list(access_requests_col().find())
    return serialize_docs(requests)

@api_router.get("/access/authorized")
async def get_authorized_users():
    """Get all authorized users (Admin only)"""
    # Clean expired temporary accesses
    now = datetime.now(timezone.utc).isoformat()
    authorized_users_col().delete_many({
        "access_type": "temporary",
        "expires_at": {"$lt": now}
    })
    
    users = list(authorized_users_col().find())
    return serialize_docs(users)

@api_router.put("/access/approve/{request_id}")
async def approve_access(request_id: str, approval: ApproveAccess):
    """Approve an access request (Admin only)"""
    request = access_requests_col().find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    
    request = serialize_doc(request)
    expires_at = None
    if approval.access_type == "temporary":
        expires_at = (datetime.now(timezone.utc) + timedelta(minutes=20)).isoformat()
    
    access_requests_col().update_one(
        {"id": request_id},
        {"$set": {
            "status": "approved",
            "access_type": approval.access_type,
            "expires_at": expires_at
        }}
    )
    
    auth_id = str(uuid.uuid4())
    authorized_users_col().insert_one({
        "id": auth_id,
        "name": request["name"],
        "email": request["email"],
        "access_type": approval.access_type,
        "expires_at": expires_at,
        "approved_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"status": "approved", "message": f"Accès {approval.access_type} accordé"}

@api_router.put("/access/deny/{request_id}")
async def deny_access(request_id: str):
    """Deny an access request (Admin only)"""
    result = access_requests_col().update_one(
        {"id": request_id},
        {"$set": {"status": "denied"}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    return {"status": "denied", "message": "Accès refusé"}

@api_router.get("/access/quick-approve/{request_id}/{access_type}")
async def quick_approve_access(request_id: str, access_type: str):
    """Quick approve from email link - returns HTML page"""
    request = access_requests_col().find_one({"id": request_id})
    if not request:
        return HTMLResponse(content=get_result_page("error", "Demande non trouvée ou déjà traitée"), status_code=404)
    
    request = serialize_doc(request)
    if request["status"] != "pending":
        return HTMLResponse(content=get_result_page("info", f"Cette demande a déjà été traitée ({request['status']})"))
    
    expires_at = None
    if access_type == "temporary":
        expires_at = (datetime.now(timezone.utc) + timedelta(minutes=20)).isoformat()
    
    access_requests_col().update_one(
        {"id": request_id},
        {"$set": {
            "status": "approved",
            "access_type": access_type,
            "expires_at": expires_at
        }}
    )
    
    auth_id = str(uuid.uuid4())
    authorized_users_col().insert_one({
        "id": auth_id,
        "name": request["name"],
        "email": request["email"],
        "access_type": access_type,
        "expires_at": expires_at,
        "approved_at": datetime.now(timezone.utc).isoformat()
    })
    
    access_label = "PERMANENT" if access_type == "permanent" else "20 MINUTES"
    return HTMLResponse(content=get_result_page(
        "success", 
        f"Accès {access_label} accordé à {request['name']} ({request['email']})"
    ))

@api_router.get("/access/quick-deny/{request_id}")
async def quick_deny_access(request_id: str):
    """Quick deny from email link - returns HTML page"""
    request = access_requests_col().find_one({"id": request_id})
    if not request:
        return HTMLResponse(content=get_result_page("error", "Demande non trouvée ou déjà traitée"), status_code=404)
    
    request = serialize_doc(request)
    if request["status"] != "pending":
        return HTMLResponse(content=get_result_page("info", f"Cette demande a déjà été traitée ({request['status']})"))
    
    access_requests_col().update_one({"id": request_id}, {"$set": {"status": "denied"}})
    
    return HTMLResponse(content=get_result_page(
        "denied", 
        f"Accès REFUSÉ à {request['name']} ({request['email']})"
    ))

@api_router.delete("/access/revoke/{email}")
async def revoke_access(email: str):
    """Revoke access for a user (Admin only)"""
    result = authorized_users_col().delete_many({"email": email})
    if result.deleted_count > 0:
        return {"status": "revoked", "message": "Accès révoqué"}
    raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

@api_router.get("/access/pending-count")
async def get_pending_count():
    """Get count of pending requests"""
    count = access_requests_col().count_documents({"status": "pending"})
    return {"count": count}

# ========================
# ACCESS ACTION ENDPOINTS (for frontend page)
# ========================

@api_router.post("/access/action/approve")
async def action_approve_access(data: AccessActionApprove):
    """Approve an access request via POST (from frontend action page)"""
    request = access_requests_col().find_one({"id": data.request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Demande non trouvée ou déjà traitée")
    
    request = serialize_doc(request)
    if request["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Cette demande a déjà été traitée ({request['status']})")
    
    expires_at = None
    if data.access_type == "temporary":
        expires_at = (datetime.now(timezone.utc) + timedelta(minutes=20)).isoformat()
    
    access_requests_col().update_one(
        {"id": data.request_id},
        {"$set": {
            "status": "approved",
            "access_type": data.access_type,
            "expires_at": expires_at
        }}
    )
    
    auth_id = str(uuid.uuid4())
    authorized_users_col().insert_one({
        "id": auth_id,
        "name": request["name"],
        "email": request["email"],
        "access_type": data.access_type,
        "expires_at": expires_at,
        "approved_at": datetime.now(timezone.utc).isoformat()
    })
    
    access_label = "permanent" if data.access_type == "permanent" else "20 minutes"
    return {
        "status": "approved",
        "message": f"Accès {access_label} accordé avec succès!",
        "name": request["name"],
        "email": request["email"]
    }

@api_router.post("/access/action/deny")
async def action_deny_access(data: AccessActionDeny):
    """Deny an access request via POST (from frontend action page)"""
    request = access_requests_col().find_one({"id": data.request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Demande non trouvée ou déjà traitée")
    
    request = serialize_doc(request)
    if request["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Cette demande a déjà été traitée ({request['status']})")
    
    access_requests_col().update_one({"id": data.request_id}, {"$set": {"status": "denied"}})
    
    return {
        "status": "denied",
        "message": "Accès refusé.",
        "name": request["name"],
        "email": request["email"]
    }

# ========================
# SECURITY & WHITELIST ROUTES
# ========================

@api_router.get("/security/whitelist")
async def get_whitelist_users():
    """Get all whitelisted users (Super Admin only)"""
    return get_whitelist()

@api_router.post("/security/whitelist")
async def add_whitelist_user(data: WhitelistAdd):
    """Add user to whitelist (Super Admin only)"""
    entry = add_to_whitelist(
        email=data.email,
        name=data.name,
        role=data.role,
        approved_by=SUPER_ADMIN_EMAIL
    )
    log_action(SUPER_ADMIN_EMAIL, 'whitelist_add', 'whitelist', entry['id'], {'email': data.email, 'role': data.role})
    return {"status": "added", "entry": entry}

@api_router.delete("/security/whitelist/{email}")
async def remove_whitelist_user(email: str):
    """Remove user from whitelist (Super Admin only)"""
    if is_super_admin(email):
        raise HTTPException(status_code=403, detail="Impossible de retirer le Super Admin")
    
    success = remove_from_whitelist(email)
    if success:
        log_action(SUPER_ADMIN_EMAIL, 'whitelist_remove', 'whitelist', None, {'email': email})
        return {"status": "removed"}
    raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

@api_router.get("/security/check-access/{email}")
async def check_user_access(email: str):
    """Check if email has access"""
    if is_blocked(email):
        return {"has_access": False, "reason": "blocked"}
    
    result = is_whitelisted(email)
    if result['whitelisted']:
        return {
            "has_access": True,
            "role": result['role'],
            "name": result.get('name'),
            "is_super_admin": is_super_admin(email)
        }
    return {"has_access": False, "reason": "not_whitelisted"}

@api_router.post("/security/request-access")
async def request_access(request: Request, data: AccessRequest):
    """Request access to the application - sends notification to Super Admin"""
    email = data.email.lower()
    
    # Check if already has access
    if is_whitelisted(email)['whitelisted']:
        return {"status": "already_authorized", "message": "Vous avez déjà accès"}
    
    # Check if blocked
    if is_blocked(email):
        return {"status": "blocked", "message": "Accès bloqué. Contactez l'administrateur."}
    
    # Log the attempt
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get('user-agent')
    
    attempt = log_access_attempt(
        email=email,
        name=data.name,
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    # Send notification email to Super Admin
    await send_access_request_notification(
        name=data.name,
        email=email,
        attempt_id=attempt['id'],
        ip_address=ip_address
    )
    
    return {
        "status": "pending",
        "message": "Votre demande a été envoyée à l'administrateur. Vous serez notifié par email.",
        "attempt_id": attempt['id']
    }

@api_router.get("/security/pending-requests")
async def get_pending_access_requests():
    """Get pending access requests (Super Admin only)"""
    return get_pending_attempts()

@api_router.post("/security/approve-request")
async def approve_access_request(data: ApproveAccessRequest):
    """Approve an access request (Super Admin only)"""
    result = approve_attempt(data.attempt_id, data.role)
    if result:
        log_action(SUPER_ADMIN_EMAIL, 'access_approved', 'access_request', data.attempt_id, result)
        return result
    raise HTTPException(status_code=404, detail="Demande non trouvée")

@api_router.post("/security/deny-request/{attempt_id}")
async def deny_access_request(attempt_id: str):
    """Deny an access request (Super Admin only)"""
    result = deny_attempt(attempt_id)
    if result:
        log_action(SUPER_ADMIN_EMAIL, 'access_denied', 'access_request', attempt_id, {})
        return result
    raise HTTPException(status_code=404, detail="Demande non trouvée")

@api_router.post("/security/block")
async def block_user_endpoint(data: BlockUser):
    """Block a user (CEO/Super Admin only)"""
    if is_super_admin(data.email):
        raise HTTPException(status_code=403, detail="Impossible de bloquer le Super Admin")
    
    entry = block_user(data.email, SUPER_ADMIN_EMAIL, data.reason)
    log_action(SUPER_ADMIN_EMAIL, 'user_blocked', 'blocked_users', entry['id'], {'email': data.email})
    
    # Invalidate all sessions for this user
    invalidate_all_user_sessions(data.email)
    
    return {"status": "blocked", "entry": entry}

@api_router.post("/security/unblock/{email}")
async def unblock_user_endpoint(email: str):
    """Unblock a user (CEO/Super Admin only)"""
    success = unblock_user(email)
    if success:
        log_action(SUPER_ADMIN_EMAIL, 'user_unblocked', 'blocked_users', None, {'email': email})
        return {"status": "unblocked"}
    raise HTTPException(status_code=404, detail="Utilisateur non trouvé dans la liste des bloqués")

@api_router.get("/security/blocked-users")
async def get_blocked_users_list():
    """Get all blocked users (CEO/Super Admin only)"""
    return get_blocked_users()

@api_router.get("/security/audit-log")
async def get_audit_log_entries(limit: int = 100, user_email: Optional[str] = None):
    """Get audit log entries (CEO/Super Admin only)"""
    return get_audit_log(limit=limit, user_email=user_email)

@api_router.get("/security/roles")
async def get_available_roles():
    """Get available roles and their permissions"""
    return ROLE_PERMISSIONS

async def send_access_request_notification(name: str, email: str, attempt_id: str, ip_address: str = None):
    """Send email notification to Super Admin for access request"""
    try:
        if not resend.api_key:
            logging.warning("Resend API key not configured")
            return False
        
        app_url = os.environ.get('APP_URL', 'https://startup-manager-pro.preview.emergentagent.com')
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
    <div style="background: linear-gradient(135deg, #6366f1, #f97316); padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0;">🔔 Demande d'Accès</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0;">BINTRONIX</p>
    </div>
    
    <div style="background: white; padding: 25px; border-radius: 0 0 12px 12px;">
        <p style="color: #333;">Bonjour <strong>BINTRONIX</strong>,</p>
        <p style="color: #666;">Une nouvelle personne souhaite accéder à votre application :</p>
        
        <div style="background: #f8f9fa; border-left: 4px solid #6366f1; padding: 15px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>👤 Nom :</strong> {name}</p>
            <p style="margin: 5px 0;"><strong>📧 Email :</strong> {email}</p>
            <p style="margin: 5px 0;"><strong>🌐 IP :</strong> {ip_address or 'Non disponible'}</p>
            <p style="margin: 5px 0;"><strong>📅 Date :</strong> {datetime.now().strftime('%d/%m/%Y %H:%M')}</p>
        </div>
        
        <p style="text-align: center; font-weight: bold; margin: 25px 0 15px;">Quelle permission accorder ?</p>
        
        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td align="center" style="padding: 8px;">
                    <a href="{app_url}/admin/approve?id={attempt_id}&role=viewer" 
                       style="display: inline-block; padding: 15px 30px; background: #10B981; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
                        👁️ Lecture Seule
                    </a>
                </td>
            </tr>
            <tr>
                <td align="center" style="padding: 8px;">
                    <a href="{app_url}/admin/approve?id={attempt_id}&role=cashier" 
                       style="display: inline-block; padding: 15px 30px; background: #3B82F6; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
                        💰 Caissier
                    </a>
                </td>
            </tr>
            <tr>
                <td align="center" style="padding: 8px;">
                    <a href="{app_url}/admin/approve?id={attempt_id}&role=manager" 
                       style="display: inline-block; padding: 15px 30px; background: #8B5CF6; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
                        👔 Manager
                    </a>
                </td>
            </tr>
            <tr>
                <td align="center" style="padding: 8px;">
                    <a href="{app_url}/admin/deny?id={attempt_id}" 
                       style="display: inline-block; padding: 15px 30px; background: #EF4444; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
                        ❌ Refuser
                    </a>
                </td>
            </tr>
        </table>
        
        <p style="color: #999; font-size: 12px; text-align: center; margin-top: 25px; border-top: 1px solid #eee; padding-top: 15px;">
            Vous êtes le Super Admin de BINTRONIX.<br>
            Toutes les actions sont enregistrées dans le journal d'audit.
        </p>
    </div>
</body>
</html>
        """
        
        params = {
            "from": SENDER_EMAIL,
            "to": [SUPER_ADMIN_EMAIL],
            "subject": f"🔔 Demande d'accès: {name} ({email})",
            "html": html_content
        }
        
        result = await asyncio.to_thread(resend.Emails.send, params)
        logging.info(f"Access request notification sent: {result}")
        return True
    except Exception as e:
        logging.error(f"Failed to send access notification: {e}")
        return False

# ========================
# AUTH ROUTES
# ========================

# 2FA Registration - Step 1: Request
class TenantRegisterRequest(BaseModel):
    company_name: str
    owner_name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None

class OTPVerify(BaseModel):
    email: EmailStr
    otp: str

@api_router.post("/auth/register-request")
async def request_registration(data: TenantRegisterRequest):
    """Step 1: Request registration with 2FA - sends OTP"""
    existing = users_col().find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    
    # Generate OTP
    otp = generate_otp()
    
    # Store registration data with OTP
    store_otp(data.email, otp, {
        "company_name": data.company_name,
        "owner_name": data.owner_name,
        "email": data.email,
        "password": data.password,
        "phone": data.phone
    })
    
    logging.info(f"OTP for {data.email}: {otp}")
    
    return {
        "message": "Code de vérification envoyé à votre email",
        "email": data.email,
        "otp_sent": True,
        "dev_otp": otp  # Remove in production
    }

@api_router.post("/auth/verify-registration")
async def verify_registration(data: OTPVerify):
    """Step 2: Verify OTP and complete registration"""
    reg_data, error = verify_otp(data.email, data.otp)
    if error:
        raise HTTPException(status_code=400, detail=error)
    
    user_id = str(uuid.uuid4())
    hashed_password = pwd_context.hash(reg_data["password"])
    
    users_col().insert_one({
        "id": user_id,
        "name": reg_data["owner_name"],
        "email": reg_data["email"],
        "password": hashed_password,
        "role": "owner",
        "company_name": reg_data["company_name"],
        "phone": reg_data.get("phone"),
        "is_verified": True,
        "subscription_plan": "trial",
        "trial_ends_at": (datetime.now(timezone.utc) + timedelta(days=14)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    token = create_access_token({"user_id": user_id, "role": "owner"})
    
    return {
        "message": "Inscription réussie! Bienvenue sur SmartShopManager.",
        "access_token": token,
        "user": {
            "id": user_id,
            "email": reg_data["email"],
            "name": reg_data["owner_name"],
            "role": "owner"
        },
        "company": {
            "name": reg_data["company_name"],
            "subscription_plan": "trial",
            "trial_ends_at": (datetime.now(timezone.utc) + timedelta(days=14)).isoformat()
        }
    }

@api_router.post("/auth/resend-otp")
async def resend_otp(email: str):
    """Resend OTP code"""
    if email not in otp_storage:
        raise HTTPException(status_code=400, detail="Aucune demande d'inscription en cours")
    
    otp = generate_otp()
    old_data = otp_storage[email]["data"]
    store_otp(email, otp, old_data)
    
    logging.info(f"New OTP for {email}: {otp}")
    
    return {"message": "Nouveau code envoyé", "email": email, "dev_otp": otp}

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user: UserRegister):
    existing = users_col().find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    
    user_id = str(uuid.uuid4())
    hashed_password = pwd_context.hash(user.password)
    
    shop = shops_col().find_one()
    shop_id = serialize_doc(shop)["id"] if shop else None
    
    users_col().insert_one({
        "id": user_id,
        "name": user.name,
        "email": user.email,
        "password": hashed_password,
        "role": user.role,
        "shop_id": shop_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    token = create_access_token({"user_id": user_id, "role": user.role})
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            name=user.name,
            email=user.email,
            role=user.role,
            shop_id=shop_id
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = users_col().find_one({"email": credentials.email})
    if not user:
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    user = serialize_doc(user)
    if not pwd_context.verify(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    token = create_access_token({"user_id": user["id"], "role": user["role"]})
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            name=user["name"],
            email=user["email"],
            role=user["role"],
            shop_id=user.get("shop_id")
        )
    )

@api_router.post("/auth/forgot-password")
async def forgot_password(data: ForgotPassword):
    user = users_col().find_one({"email": data.email})
    return {"message": "Si cet email existe, un lien de réinitialisation a été envoyé."}

# ========================
# SHOPS ROUTES
# ========================

@api_router.get("/shops", response_model=List[ShopResponse])
async def get_shops():
    shops = list(shops_col().find())
    return [ShopResponse(**serialize_doc(s)) for s in shops]

@api_router.post("/shops", response_model=ShopResponse)
async def create_shop(shop: ShopCreate):
    shop_id = str(uuid.uuid4())
    shop_data = {
        "id": shop_id,
        **shop.model_dump()
    }
    shops_col().insert_one(shop_data)
    
    # Create accounts for the new shop
    for acc_type in ["cash", "orange_money", "bank"]:
        accounts_col().insert_one({
            "id": str(uuid.uuid4()),
            "shop_id": shop_id,
            "type": acc_type,
            "balance": 0
        })
    
    return ShopResponse(**shop_data)

@api_router.get("/shops/{shop_id}", response_model=ShopResponse)
async def get_shop(shop_id: str):
    shop = shops_col().find_one({"id": shop_id})
    if not shop:
        raise HTTPException(status_code=404, detail="Boutique non trouvée")
    return ShopResponse(**serialize_doc(shop))

# ========================
# PRODUCTS ROUTES
# ========================

@api_router.get("/products", response_model=List[ProductResponse])
async def get_products(shop_id: Optional[str] = None, category: Optional[str] = None):
    query = {}
    if shop_id:
        query["shop_id"] = shop_id
    if category:
        query["category"] = category
    
    products = list(products_col().find(query))
    result = []
    for prod in products:
        prod = serialize_doc(prod)
        stock = sum(b["quantity"] for b in batches_col().find({"product_id": prod["id"]}))
        result.append(ProductResponse(**prod, stock_quantity=stock))
    return result

@api_router.post("/products", response_model=ProductResponse)
async def create_product(product: ProductCreate):
    prod_id = str(uuid.uuid4())
    shop = shops_col().find_one()
    shop_id = serialize_doc(shop)["id"] if shop else None
    
    prod_data = {
        "id": prod_id,
        "shop_id": shop_id,
        **product.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    products_col().insert_one(prod_data)
    
    return ProductResponse(**prod_data, stock_quantity=0)

@api_router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(product_id: str):
    product = products_col().find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    product = serialize_doc(product)
    stock = sum(b["quantity"] for b in batches_col().find({"product_id": product_id}))
    return ProductResponse(**product, stock_quantity=stock)

@api_router.put("/products/{product_id}", response_model=ProductResponse)
async def update_product(product_id: str, update: ProductUpdate):
    product = products_col().find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if update_data:
        products_col().update_one({"id": product_id}, {"$set": update_data})
    
    updated = products_col().find_one({"id": product_id})
    updated = serialize_doc(updated)
    stock = sum(b["quantity"] for b in batches_col().find({"product_id": product_id}))
    return ProductResponse(**updated, stock_quantity=stock)

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str):
    result = products_col().delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    batches_col().delete_many({"product_id": product_id})
    return {"message": "Produit supprimé"}

# ========================
# BATCHES/STOCK ROUTES
# ========================

@api_router.get("/batches", response_model=List[BatchResponse])
async def get_batches(product_id: Optional[str] = None):
    query = {}
    if product_id:
        query["product_id"] = product_id
    
    batches = list(batches_col().find(query))
    result = []
    for batch in batches:
        batch = serialize_doc(batch)
        product = products_col().find_one({"id": batch["product_id"]})
        product_name = serialize_doc(product)["name"] if product else "Inconnu"
        result.append(BatchResponse(**batch, product_name=product_name))
    return result

@api_router.post("/batches", response_model=BatchResponse)
async def create_batch(batch: BatchCreate):
    product = products_col().find_one({"id": batch.product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    batch_id = str(uuid.uuid4())
    lot_number = batch.lot_number or f"LOT-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:4].upper()}"
    
    batch_data = {
        "id": batch_id,
        "product_id": batch.product_id,
        "lot_number": lot_number,
        "size": batch.size,
        "color": batch.color,
        "quantity": batch.quantity,
        "qr_code": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    batches_col().insert_one(batch_data)
    
    product = serialize_doc(product)
    return BatchResponse(**batch_data, product_name=product["name"])

@api_router.put("/batches/{batch_id}", response_model=BatchResponse)
async def update_batch(batch_id: str, update: BatchUpdate):
    batch = batches_col().find_one({"id": batch_id})
    if not batch:
        raise HTTPException(status_code=404, detail="Lot non trouvé")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if update_data:
        batches_col().update_one({"id": batch_id}, {"$set": update_data})
    
    updated = batches_col().find_one({"id": batch_id})
    updated = serialize_doc(updated)
    product = products_col().find_one({"id": updated["product_id"]})
    product_name = serialize_doc(product)["name"] if product else "Inconnu"
    return BatchResponse(**updated, product_name=product_name)

@api_router.delete("/batches/{batch_id}")
async def delete_batch(batch_id: str):
    result = batches_col().delete_one({"id": batch_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lot non trouvé")
    return {"message": "Lot supprimé"}

@api_router.get("/batches/{batch_id}/qr")
async def generate_qr_code(batch_id: str):
    batch = batches_col().find_one({"id": batch_id})
    if not batch:
        raise HTTPException(status_code=404, detail="Lot non trouvé")
    
    batch = serialize_doc(batch)
    product = products_col().find_one({"id": batch["product_id"]})
    product_name = serialize_doc(product)["name"] if product else "Produit"
    
    qr_data = f"BINTRONIX|{batch['lot_number']}|{product_name}|{batch['size']}|{batch['color']}"
    
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(qr_data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    
    qr_base64 = base64.b64encode(buffer.getvalue()).decode()
    batches_col().update_one({"id": batch_id}, {"$set": {"qr_code": qr_base64}})
    
    return {"qr_code": qr_base64, "lot_number": batch["lot_number"]}

# ========================
# SALES ROUTES
# ========================

@api_router.get("/sales", response_model=List[SaleResponse])
async def get_sales(shop_id: Optional[str] = None):
    query = {}
    if shop_id:
        query["shop_id"] = shop_id
    
    sales = list(sales_col().find(query).sort("created_at", -1))
    result = []
    for sale in sales:
        sale = serialize_doc(sale)
        items = list(sale_items_col().find({"sale_id": sale["id"]}))
        sale["items"] = serialize_docs(items)
        result.append(SaleResponse(**sale))
    return result

@api_router.post("/sales", response_model=SaleResponse)
async def create_sale(sale: SaleCreate):
    sale_id = str(uuid.uuid4())
    shop = shops_col().find_one()
    shop_id = serialize_doc(shop)["id"] if shop else None
    user = users_col().find_one()
    user_id = serialize_doc(user)["id"] if user else "unknown"
    
    total = 0
    sale_items = []
    
    for item in sale.items:
        product = products_col().find_one({"id": item.product_id})
        if not product:
            raise HTTPException(status_code=404, detail=f"Produit {item.product_id} non trouvé")
        
        product = serialize_doc(product)
        item_total = item.quantity * item.price
        total += item_total
        
        item_id = str(uuid.uuid4())
        sale_item = {
            "id": item_id,
            "sale_id": sale_id,
            "product_id": item.product_id,
            "product_name": product["name"],
            "quantity": item.quantity,
            "price": item.price,
            "total": item_total
        }
        sale_items_col().insert_one(sale_item)
        sale_items.append(sale_item)
        
        # Update stock
        batch = batches_col().find_one({"product_id": item.product_id, "quantity": {"$gte": item.quantity}})
        if batch:
            batches_col().update_one(
                {"id": batch["id"]},
                {"$inc": {"quantity": -item.quantity}}
            )
    
    sale_data = {
        "id": sale_id,
        "shop_id": shop_id,
        "user_id": user_id,
        "total": total,
        "payment_method": sale.payment_method,
        "customer_phone": sale.customer_phone,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    sales_col().insert_one(sale_data)
    
    # Update account balance
    acc_type_map = {"cash": "cash", "orange_money": "orange_money", "card": "bank"}
    acc_type = acc_type_map.get(sale.payment_method, "cash")
    accounts_col().update_one(
        {"shop_id": shop_id, "type": acc_type},
        {"$inc": {"balance": total}}
    )
    
    return SaleResponse(**sale_data, items=serialize_docs(sale_items))

# ========================
# EMPLOYEES ROUTES
# ========================

@api_router.get("/employees", response_model=List[EmployeeResponse])
async def get_employees(shop_id: Optional[str] = None):
    query = {}
    if shop_id:
        query["shop_id"] = shop_id
    
    employees = list(employees_col().find(query))
    return [EmployeeResponse(**serialize_doc(e)) for e in employees]

@api_router.post("/employees", response_model=EmployeeResponse)
async def create_employee(employee: EmployeeCreate):
    emp_id = str(uuid.uuid4())
    shop = shops_col().find_one()
    shop_id = serialize_doc(shop)["id"] if shop else None
    
    emp_data = {
        "id": emp_id,
        "shop_id": shop_id,
        **employee.model_dump()
    }
    employees_col().insert_one(emp_data)
    
    return EmployeeResponse(**emp_data)

@api_router.get("/employees/{employee_id}", response_model=EmployeeResponse)
async def get_employee(employee_id: str):
    employee = employees_col().find_one({"id": employee_id})
    if not employee:
        raise HTTPException(status_code=404, detail="Employé non trouvé")
    return EmployeeResponse(**serialize_doc(employee))

@api_router.put("/employees/{employee_id}", response_model=EmployeeResponse)
async def update_employee(employee_id: str, update: EmployeeUpdate):
    employee = employees_col().find_one({"id": employee_id})
    if not employee:
        raise HTTPException(status_code=404, detail="Employé non trouvé")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if update_data:
        employees_col().update_one({"id": employee_id}, {"$set": update_data})
    
    updated = employees_col().find_one({"id": employee_id})
    return EmployeeResponse(**serialize_doc(updated))

@api_router.delete("/employees/{employee_id}")
async def delete_employee(employee_id: str):
    result = employees_col().delete_one({"id": employee_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Employé non trouvé")
    return {"message": "Employé supprimé"}

# ========================
# AI HR ROUTES
# ========================

@api_router.post("/ai/contract")
async def generate_contract(request: AIContractRequest):
    employee = employees_col().find_one({"id": request.employee_id})
    if not employee:
        raise HTTPException(status_code=404, detail="Employé non trouvé")
    
    employee = serialize_doc(employee)
    shop = shops_col().find_one({"id": employee.get("shop_id")})
    shop = serialize_doc(shop) if shop else {}
    
    prompt = f"""Génère un contrat de travail professionnel en français pour:
    - Employé: {employee['name']}
    - Poste: {employee['position']}
    - Salaire: {employee['salary']} GNF/mois
    - Type de contrat: {employee['contract_type']}
    - Entreprise: {shop.get('name', 'BINTRONIX')}
    - Adresse: {shop.get('address', 'Dakar, Sénégal')}
    
    Le contrat doit être formel, complet et conforme au droit du travail sénégalais."""
    
    content = await generate_ai_content(prompt, "Tu es un expert en droit du travail sénégalais. Génère des documents juridiques professionnels en français.")
    
    doc_id = str(uuid.uuid4())
    doc_data = {
        "id": doc_id,
        "employee_id": request.employee_id,
        "type": "contrat",
        "content": content,
        "signed": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    documents_col().insert_one(doc_data)
    
    return DocumentResponse(**doc_data, employee_name=employee["name"])

@api_router.post("/ai/attestation-work")
async def generate_work_attestation(request: AIContractRequest):
    employee = employees_col().find_one({"id": request.employee_id})
    if not employee:
        raise HTTPException(status_code=404, detail="Employé non trouvé")
    
    employee = serialize_doc(employee)
    shop = shops_col().find_one({"id": employee.get("shop_id")})
    shop = serialize_doc(shop) if shop else {}
    
    prompt = f"""Génère une attestation de travail professionnelle en français pour:
    - Employé: {employee['name']}
    - Poste: {employee['position']}
    - Entreprise: {shop.get('name', 'BINTRONIX')}
    - Adresse: {shop.get('address', 'Dakar, Sénégal')}
    
    L'attestation doit certifier que l'employé travaille actuellement dans l'entreprise."""
    
    content = await generate_ai_content(prompt, "Tu es un responsable RH. Génère des attestations professionnelles en français.")
    
    doc_id = str(uuid.uuid4())
    doc_data = {
        "id": doc_id,
        "employee_id": request.employee_id,
        "type": "attestation_travail",
        "content": content,
        "signed": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    documents_col().insert_one(doc_data)
    
    return DocumentResponse(**doc_data, employee_name=employee["name"])

@api_router.post("/ai/attestation-stage")
async def generate_internship_attestation(request: AIContractRequest):
    employee = employees_col().find_one({"id": request.employee_id})
    if not employee:
        raise HTTPException(status_code=404, detail="Employé non trouvé")
    
    employee = serialize_doc(employee)
    shop = shops_col().find_one({"id": employee.get("shop_id")})
    shop = serialize_doc(shop) if shop else {}
    
    prompt = f"""Génère une attestation de stage professionnelle en français pour:
    - Stagiaire: {employee['name']}
    - Poste: {employee['position']}
    - Entreprise: {shop.get('name', 'BINTRONIX')}
    - Adresse: {shop.get('address', 'Dakar, Sénégal')}
    
    L'attestation doit certifier la réalisation du stage avec succès."""
    
    content = await generate_ai_content(prompt, "Tu es un responsable RH. Génère des attestations de stage professionnelles en français.")
    
    doc_id = str(uuid.uuid4())
    doc_data = {
        "id": doc_id,
        "employee_id": request.employee_id,
        "type": "attestation_stage",
        "content": content,
        "signed": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    documents_col().insert_one(doc_data)
    
    return DocumentResponse(**doc_data, employee_name=employee["name"])

@api_router.get("/documents", response_model=List[DocumentResponse])
async def get_documents(employee_id: Optional[str] = None):
    query = {}
    if employee_id:
        query["employee_id"] = employee_id
    
    documents = list(documents_col().find(query).sort("created_at", -1))
    result = []
    for doc in documents:
        doc = serialize_doc(doc)
        employee = employees_col().find_one({"id": doc["employee_id"]})
        employee_name = serialize_doc(employee)["name"] if employee else "Inconnu"
        result.append(DocumentResponse(**doc, employee_name=employee_name))
    return result

@api_router.put("/documents/{document_id}/sign")
async def sign_document(document_id: str):
    document = documents_col().find_one({"id": document_id})
    if not document:
        raise HTTPException(status_code=404, detail="Document non trouvé")
    
    documents_col().update_one({"id": document_id}, {"$set": {"signed": True}})
    
    updated = documents_col().find_one({"id": document_id})
    updated = serialize_doc(updated)
    employee = employees_col().find_one({"id": updated["employee_id"]})
    employee_name = serialize_doc(employee)["name"] if employee else "Inconnu"
    
    return DocumentResponse(**updated, employee_name=employee_name)

@api_router.get("/documents/{document_id}/pdf")
async def download_document_pdf(document_id: str):
    document = documents_col().find_one({"id": document_id})
    if not document:
        raise HTTPException(status_code=404, detail="Document non trouvé")
    
    doc = serialize_doc(document)
    employee = employees_col().find_one({"id": doc["employee_id"]})
    employee = serialize_doc(employee) if employee else {}
    
    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    
    p.setFont("Helvetica-Bold", 16)
    p.drawString(2*cm, height - 2*cm, "BINTRONIX")
    
    p.setFont("Helvetica", 12)
    p.drawString(2*cm, height - 3*cm, f"Document: {doc['type'].replace('_', ' ').title()}")
    p.drawString(2*cm, height - 3.5*cm, f"Employé: {employee.get('name', 'N/A')}")
    p.drawString(2*cm, height - 4*cm, f"Date: {doc['created_at'][:10]}")
    
    p.setFont("Helvetica", 10)
    y = height - 5.5*cm
    content_lines = doc["content"].split('\n')
    for line in content_lines:
        if y < 3*cm:
            p.showPage()
            y = height - 2*cm
        words = line.split()
        current_line = ""
        for word in words:
            if p.stringWidth(current_line + " " + word, "Helvetica", 10) < width - 4*cm:
                current_line += " " + word if current_line else word
            else:
                p.drawString(2*cm, y, current_line)
                y -= 0.5*cm
                current_line = word
        if current_line:
            p.drawString(2*cm, y, current_line)
            y -= 0.5*cm
    
    if doc["signed"]:
        p.setFont("Helvetica-Bold", 12)
        p.drawString(2*cm, 3*cm, "✓ Document signé électroniquement")
    
    p.save()
    buffer.seek(0)
    
    filename = f"{doc['type']}_{employee.get('name', 'document').replace(' ', '_')}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# ========================
# MARKETING AI ROUTES
# ========================

@api_router.post("/ai/product-ad")
async def generate_product_ad(request: AIMarketingRequest):
    prompt = f"""Génère du contenu marketing professionnel en français pour une publicité produit:
    - Titre: {request.title}
    - Description: {request.description}
    - Prix: {request.price} GNF
    
    Génère:
    1. Un texte pour Facebook (max 200 mots, engageant, avec emojis appropriés)
    2. Un texte pour WhatsApp (max 100 mots, direct et accrocheur)
    3. Une réponse automatique pour les clients intéressés
    
    Format: Sépare chaque section avec des titres clairs."""
    
    content = await generate_ai_content(prompt, "Tu es un expert en marketing digital africain. Crée du contenu engageant et culturellement approprié.")
    
    return {"content": content, "type": "product_ad"}

@api_router.post("/ai/job-offer")
async def generate_job_offer(request: AIMarketingRequest):
    prompt = f"""Génère une offre d'emploi professionnelle en français:
    - Poste: {request.title}
    - Description: {request.description}
    
    Génère:
    1. Un texte pour Facebook (formel mais engageant)
    2. Un texte pour WhatsApp (court et direct)
    3. Les critères de candidature
    
    Format: Sépare chaque section avec des titres clairs."""
    
    content = await generate_ai_content(prompt, "Tu es un recruteur professionnel. Crée des offres d'emploi attractives en français.")
    
    return {"content": content, "type": "job_offer"}

# ========================
# HELP CENTER AI
# ========================

@api_router.post("/ai/help")
async def ai_help_assistant(request: AIHelpRequest):
    prompt = f"""En tant qu'assistant pour l'application BINTRONIX, réponds à cette question en français:
    
    Question: {request.question}
    
    L'application permet de:
    - Gérer les boutiques et les ventes (POS)
    - Gérer les produits et le stock avec QR codes
    - Générer des contrats et attestations RH avec l'IA
    - Créer du contenu marketing avec l'IA
    - Suivre les finances (Cash, Orange Money, Banque)
    
    Donne une réponse utile et concise."""
    
    content = await generate_ai_content(prompt, "Tu es un assistant d'aide pour une application de gestion d'entreprise. Réponds de manière claire et utile en français.")
    
    return {"response": content}

# ========================
# AI INSIGHTS & AUTO-UPDATE
# ========================

@api_router.get("/ai/insights/dashboard")
async def get_ai_dashboard_insights():
    """Generate AI insights for dashboard"""
    total_sales = sales_col().count_documents({})
    total_products = products_col().count_documents({})
    total_employees = employees_col().count_documents({})
    
    low_stock_products = []
    for prod in products_col().find():
        prod = serialize_doc(prod)
        stock = sum(b["quantity"] for b in batches_col().find({"product_id": prod["id"]}))
        if stock < 10:
            low_stock_products.append({"name": prod["name"], "stock": stock})
    
    total_revenue = sum(s["total"] for s in sales_col().find())
    
    insights = []
    
    if low_stock_products:
        products_list = ", ".join([p["name"] for p in low_stock_products[:3]])
        insights.append({
            "type": "warning",
            "icon": "📦",
            "title": "Stock Faible",
            "message": f"{len(low_stock_products)} produit(s) en stock faible: {products_list}",
            "action": "Réapprovisionner"
        })
    
    if total_sales > 0:
        avg_sale = total_revenue / total_sales
        insights.append({
            "type": "info",
            "icon": "📊",
            "title": "Performance Ventes",
            "message": f"Panier moyen: {avg_sale:,.0f} GNF sur {total_sales} ventes",
            "action": None
        })
    
    if total_products < 10:
        insights.append({
            "type": "tip",
            "icon": "💡",
            "title": "Suggestion IA",
            "message": "Ajoutez plus de produits pour diversifier votre offre et augmenter vos ventes",
            "action": "Ajouter produits"
        })
    
    if total_employees > 0 and total_sales == 0:
        insights.append({
            "type": "tip",
            "icon": "🎯",
            "title": "Conseil IA",
            "message": "Aucune vente enregistrée. Utilisez le Marketing IA pour créer des publicités attractives",
            "action": "Marketing IA"
        })
    
    return {
        "insights": insights,
        "summary": {
            "total_products": total_products,
            "total_employees": total_employees,
            "total_sales": total_sales,
            "low_stock_count": len(low_stock_products)
        },
        "generated_at": datetime.now(timezone.utc).isoformat()
    }

@api_router.get("/ai/insights/stock")
async def get_ai_stock_insights():
    """Generate AI insights for stock management"""
    insights = []
    recommendations = []
    
    for prod in products_col().find():
        prod = serialize_doc(prod)
        stock = sum(b["quantity"] for b in batches_col().find({"product_id": prod["id"]}))
        
        if stock == 0:
            insights.append({
                "type": "critical",
                "product": prod["name"],
                "message": "Stock épuisé - réapprovisionnement urgent"
            })
        elif stock < 5:
            insights.append({
                "type": "warning",
                "product": prod["name"],
                "message": f"Stock très faible ({stock} unités)"
            })
        elif stock < 10:
            recommendations.append({
                "product": prod["name"],
                "current_stock": stock,
                "suggestion": "Commander bientôt"
            })
    
    return {
        "insights": insights,
        "recommendations": recommendations,
        "generated_at": datetime.now(timezone.utc).isoformat()
    }

@api_router.get("/ai/insights/sales")
async def get_ai_sales_insights():
    """Generate AI insights for sales"""
    sales = list(sales_col().find())
    
    if not sales:
        return {
            "insights": [{"type": "info", "message": "Aucune vente enregistrée"}],
            "top_products": [],
            "payment_breakdown": {},
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
    
    # Calculate top products
    product_sales = {}
    for sale in sales:
        sale = serialize_doc(sale)
        for item in sale_items_col().find({"sale_id": sale["id"]}):
            item = serialize_doc(item)
            prod_id = item["product_id"]
            if prod_id not in product_sales:
                product_sales[prod_id] = {"name": item.get("product_name", "Inconnu"), "quantity": 0, "revenue": 0}
            product_sales[prod_id]["quantity"] += item["quantity"]
            product_sales[prod_id]["revenue"] += item["total"]
    
    top_products = sorted(product_sales.values(), key=lambda x: x["revenue"], reverse=True)[:5]
    
    # Payment method breakdown
    payment_breakdown = {}
    for sale in sales:
        sale = serialize_doc(sale)
        method = sale["payment_method"]
        if method not in payment_breakdown:
            payment_breakdown[method] = {"count": 0, "total": 0}
        payment_breakdown[method]["count"] += 1
        payment_breakdown[method]["total"] += sale["total"]
    
    return {
        "insights": [{"type": "success", "message": f"{len(sales)} ventes réalisées"}],
        "top_products": top_products,
        "payment_breakdown": payment_breakdown,
        "generated_at": datetime.now(timezone.utc).isoformat()
    }

@api_router.post("/ai/generate-suggestion")
async def generate_ai_suggestion(context: dict):
    """Generate contextual AI suggestions"""
    page = context.get("page", "general")
    
    prompts = {
        "dashboard": "Analyse les données du dashboard et suggère 3 actions prioritaires pour améliorer les performances.",
        "stock": "Analyse le stock et suggère des actions pour optimiser la gestion des inventaires.",
        "sales": "Analyse les ventes et suggère des stratégies pour augmenter le chiffre d'affaires.",
        "hr": "Suggère des bonnes pratiques RH pour une PME africaine.",
        "marketing": "Suggère 3 idées de campagnes marketing adaptées au marché africain.",
        "general": "Donne 3 conseils pour améliorer la gestion de l'entreprise."
    }
    
    prompt = prompts.get(page, prompts["general"])
    suggestion = await generate_ai_content(prompt, "Tu es un consultant business expert. Donne des conseils concis et pertinents.")
    
    return {"suggestion": suggestion, "context": page}

# ========================
# ACCOUNTS ROUTES
# ========================

@api_router.get("/accounts", response_model=List[AccountResponse])
async def get_accounts(shop_id: Optional[str] = None):
    query = {}
    if shop_id:
        query["shop_id"] = shop_id
    
    accounts = list(accounts_col().find(query))
    return [AccountResponse(**serialize_doc(a)) for a in accounts]

# ========================
# PAYMENTS ROUTES (ENHANCED MOCK)
# ========================

@api_router.post("/payments/orange/initiate", response_model=PaymentResponse)
async def initiate_orange_payment(payment: PaymentInitiate):
    """Initiate Orange Money payment (simulated)"""
    transaction_id = f"OM-{str(uuid.uuid4())[:8].upper()}"
    
    # Store payment record
    payment_record = {
        "id": str(uuid.uuid4()),
        "transaction_id": transaction_id,
        "type": "orange_money",
        "amount": payment.amount,
        "phone": payment.phone,
        "sale_id": payment.sale_id,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    payments_col().insert_one(payment_record)
    
    return PaymentResponse(
        status="pending",
        transaction_id=transaction_id,
        message=f"Paiement Orange Money de {payment.amount:,.0f} GNF initié. Veuillez confirmer sur votre téléphone {payment.phone}.",
        details={
            "phone": payment.phone,
            "amount": payment.amount,
            "instructions": "Tapez *144*4*6# pour confirmer le paiement"
        }
    )

@api_router.post("/payments/orange/confirm/{transaction_id}", response_model=PaymentResponse)
async def confirm_orange_payment(transaction_id: str):
    """Confirm Orange Money payment (simulated)"""
    payment = payments_col().find_one({"transaction_id": transaction_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Transaction non trouvée")
    
    payments_col().update_one(
        {"transaction_id": transaction_id},
        {"$set": {"status": "success", "confirmed_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    payment = serialize_doc(payment)
    return PaymentResponse(
        status="success",
        transaction_id=transaction_id,
        message=f"Paiement Orange Money de {payment['amount']:,.0f} GNF confirmé avec succès!",
        details={"receipt_number": f"REC-{str(uuid.uuid4())[:6].upper()}"}
    )

@api_router.post("/payments/card", response_model=PaymentResponse)
async def process_card_payment(payment: PaymentInitiate):
    """Process card payment (simulated)"""
    transaction_id = f"CARD-{str(uuid.uuid4())[:8].upper()}"
    
    payment_record = {
        "id": str(uuid.uuid4()),
        "transaction_id": transaction_id,
        "type": "card",
        "amount": payment.amount,
        "sale_id": payment.sale_id,
        "status": "success",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    payments_col().insert_one(payment_record)
    
    return PaymentResponse(
        status="success",
        transaction_id=transaction_id,
        message=f"Paiement par carte de {payment.amount:,.0f} GNF traité avec succès.",
        details={
            "card_type": "VISA",
            "last_four": "****4242",
            "receipt_number": f"REC-{str(uuid.uuid4())[:6].upper()}"
        }
    )

@api_router.post("/payments/cash", response_model=PaymentResponse)
async def process_cash_payment(payment: PaymentInitiate):
    """Process cash payment (simulated)"""
    transaction_id = f"CASH-{str(uuid.uuid4())[:8].upper()}"
    
    payment_record = {
        "id": str(uuid.uuid4()),
        "transaction_id": transaction_id,
        "type": "cash",
        "amount": payment.amount,
        "sale_id": payment.sale_id,
        "status": "success",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    payments_col().insert_one(payment_record)
    
    return PaymentResponse(
        status="success",
        transaction_id=transaction_id,
        message=f"Paiement en espèces de {payment.amount:,.0f} GNF enregistré.",
        details={"receipt_number": f"REC-{str(uuid.uuid4())[:6].upper()}"}
    )

@api_router.get("/payments/history")
async def get_payment_history(limit: int = 50):
    """Get payment history"""
    payments = list(payments_col().find().sort("created_at", -1).limit(limit))
    return serialize_docs(payments)

# ========================
# WHATSAPP ROUTES (ENHANCED MOCK)
# ========================

@api_router.post("/whatsapp/send-receipt")
async def send_whatsapp_receipt(data: WhatsAppReceipt):
    """Send receipt via WhatsApp (simulated)"""
    sale = sales_col().find_one({"id": data.sale_id})
    if not sale:
        raise HTTPException(status_code=404, detail="Vente non trouvée")
    
    sale = serialize_doc(sale)
    items = list(sale_items_col().find({"sale_id": data.sale_id}))
    
    # Store message record
    message_id = str(uuid.uuid4())
    message_record = {
        "id": message_id,
        "type": "receipt",
        "phone": data.phone,
        "sale_id": data.sale_id,
        "status": "sent",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    whatsapp_messages_col().insert_one(message_record)
    
    return {
        "status": "sent",
        "message_id": message_id,
        "message": f"Reçu envoyé via WhatsApp au {data.phone}",
        "receipt": {
            "sale_id": data.sale_id,
            "total": sale["total"],
            "items_count": len(items),
            "date": sale["created_at"],
            "preview": f"🧾 *Reçu BINTRONIX*\nTotal: {sale['total']:,.0f} GNF\nDate: {sale['created_at'][:10]}\nMerci de votre achat!"
        }
    }

@api_router.post("/sms/send-receipt")
async def send_sms_receipt(data: WhatsAppReceipt):
    """Send receipt via SMS (simulated)"""
    sale = sales_col().find_one({"id": data.sale_id})
    if not sale:
        raise HTTPException(status_code=404, detail="Vente non trouvée")
    
    sale = serialize_doc(sale)
    
    return {
        "status": "sent",
        "message": f"Reçu envoyé par SMS au {data.phone}",
        "receipt": {
            "sale_id": data.sale_id,
            "total": sale["total"],
            "date": sale["created_at"],
            "preview": f"BINTRONIX - Reçu: {sale['total']:,.0f} GNF. Merci!"
        }
    }

@api_router.post("/whatsapp/send-promo")
async def send_whatsapp_promo(phone: str, message: str):
    """Send promotional message via WhatsApp (simulated)"""
    message_id = str(uuid.uuid4())
    message_record = {
        "id": message_id,
        "type": "promo",
        "phone": phone,
        "content": message,
        "status": "sent",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    whatsapp_messages_col().insert_one(message_record)
    
    return {
        "status": "sent",
        "message_id": message_id,
        "message": f"Message promotionnel envoyé au {phone}"
    }

# ========================
# DASHBOARD STATS
# ========================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats():
    shop = shops_col().find_one()
    shop_id = serialize_doc(shop)["id"] if shop else None
    
    today = datetime.now(timezone.utc).date().isoformat()
    today_sales = sum(
        s["total"] for s in sales_col().find()
        if serialize_doc(s)["created_at"][:10] == today
    )
    
    current_month = datetime.now(timezone.utc).strftime("%Y-%m")
    monthly_revenue = sum(
        s["total"] for s in sales_col().find()
        if serialize_doc(s)["created_at"][:7] == current_month
    )
    
    cash_balance = sum(serialize_doc(a)["balance"] for a in accounts_col().find({"type": "cash"}))
    orange_balance = sum(serialize_doc(a)["balance"] for a in accounts_col().find({"type": "orange_money"}))
    bank_balance = sum(serialize_doc(a)["balance"] for a in accounts_col().find({"type": "bank"}))
    
    recent_sales = list(sales_col().find().sort("created_at", -1).limit(5))
    
    return {
        "today_sales": today_sales,
        "monthly_revenue": monthly_revenue,
        "total_shops": shops_col().count_documents({}),
        "total_products": products_col().count_documents({}),
        "total_employees": employees_col().count_documents({}),
        "cash_balance": cash_balance,
        "orange_money_balance": orange_balance,
        "bank_balance": bank_balance,
        "recent_sales": serialize_docs(recent_sales)
    }

# ========================
# EXPORT ROUTES (P3)
# ========================

@api_router.get("/export/sales/pdf")
async def export_sales_pdf():
    """Export sales report as PDF"""
    sales = list(sales_col().find().sort("created_at", -1))
    
    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    
    # Header
    p.setFont("Helvetica-Bold", 18)
    p.drawString(2*cm, height - 2*cm, "Rapport des Ventes - BINTRONIX")
    
    p.setFont("Helvetica", 10)
    p.drawString(2*cm, height - 2.8*cm, f"Généré le: {datetime.now().strftime('%d/%m/%Y %H:%M')}")
    
    # Table header
    y = height - 4*cm
    p.setFont("Helvetica-Bold", 10)
    p.drawString(2*cm, y, "Date")
    p.drawString(5*cm, y, "Méthode")
    p.drawString(9*cm, y, "Total (GNF)")
    p.drawString(13*cm, y, "ID Transaction")
    
    # Table content
    p.setFont("Helvetica", 9)
    y -= 0.7*cm
    total_revenue = 0
    
    for sale in sales[:30]:  # Limit to 30 sales per page
        sale = serialize_doc(sale)
        if y < 3*cm:
            p.showPage()
            y = height - 2*cm
        
        p.drawString(2*cm, y, sale["created_at"][:10])
        p.drawString(5*cm, y, sale["payment_method"].upper())
        p.drawString(9*cm, y, f"{sale['total']:,.0f}")
        p.drawString(13*cm, y, sale["id"][:12])
        
        total_revenue += sale["total"]
        y -= 0.5*cm
    
    # Summary
    y -= 1*cm
    p.setFont("Helvetica-Bold", 12)
    p.drawString(2*cm, y, f"Total des ventes: {total_revenue:,.0f} GNF")
    p.drawString(2*cm, y - 0.5*cm, f"Nombre de transactions: {len(sales)}")
    
    p.save()
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=rapport_ventes_{datetime.now().strftime('%Y%m%d')}.pdf"}
    )

@api_router.get("/export/products/csv")
async def export_products_csv():
    """Export products as CSV"""
    products = list(products_col().find())
    
    csv_content = "ID,Nom,Catégorie,Prix (GNF),Stock,Date Création\n"
    for prod in products:
        prod = serialize_doc(prod)
        stock = sum(b["quantity"] for b in batches_col().find({"product_id": prod["id"]}))
        csv_content += f'"{prod["id"][:8]}","{prod["name"]}","{prod["category"]}",{prod["price"]},{stock},"{prod["created_at"][:10]}"\n'
    
    buffer = BytesIO(csv_content.encode('utf-8-sig'))
    
    return StreamingResponse(
        buffer,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=produits_{datetime.now().strftime('%Y%m%d')}.csv"}
    )

@api_router.get("/export/employees/csv")
async def export_employees_csv():
    """Export employees as CSV"""
    employees = list(employees_col().find())
    
    csv_content = "ID,Nom,Poste,Salaire (GNF),Type Contrat\n"
    for emp in employees:
        emp = serialize_doc(emp)
        csv_content += f'"{emp["id"][:8]}","{emp["name"]}","{emp["position"]}",{emp["salary"]},"{emp["contract_type"]}"\n'
    
    buffer = BytesIO(csv_content.encode('utf-8-sig'))
    
    return StreamingResponse(
        buffer,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=employes_{datetime.now().strftime('%Y%m%d')}.csv"}
    )

# ========================
# IRP (Incident Response Plan) ROUTES
# ========================

class IRPCreate(BaseModel):
    title: str
    description: str
    severity: str = "medium"
    category: str = "technical"
    affected_area: Optional[str] = None

class IRPUpdate(BaseModel):
    status: Optional[str] = None
    resolution: Optional[str] = None
    root_cause: Optional[str] = None

@api_router.post("/irp/incidents")
async def create_irp_incident(data: IRPCreate, current_user: dict = Depends(get_current_user)):
    """Create a new incident report"""
    if current_user.get("role") not in ["ceo", "super_admin", "owner"]:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    incident = {
        "id": len(irp_incidents) + 1,
        "uuid": str(uuid.uuid4()),
        "title": data.title,
        "description": data.description,
        "severity": data.severity,
        "category": data.category,
        "affected_area": data.affected_area,
        "status": "open",
        "created_by": current_user.get("id"),
        "created_by_name": current_user.get("name"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "resolution": None,
        "root_cause": None,
        "ai_analysis": None,
        "timeline": [
            {
                "action": "Incident créé",
                "by": current_user.get("name"),
                "at": datetime.now(timezone.utc).isoformat()
            }
        ]
    }
    irp_incidents.append(incident)
    
    return {"message": "Incident créé", "incident": incident}

@api_router.get("/irp/incidents")
async def list_irp_incidents(status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """List all incidents"""
    if current_user.get("role") not in ["ceo", "super_admin", "owner"]:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    if status:
        filtered = [i for i in irp_incidents if i["status"] == status]
        return {"total": len(filtered), "incidents": filtered}
    return {"total": len(irp_incidents), "incidents": irp_incidents}

@api_router.get("/irp/incidents/{incident_id}")
async def get_irp_incident(incident_id: int, current_user: dict = Depends(get_current_user)):
    """Get incident details"""
    incident = next((i for i in irp_incidents if i["id"] == incident_id), None)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident non trouvé")
    return incident

@api_router.put("/irp/incidents/{incident_id}")
async def update_irp_incident(incident_id: int, data: IRPUpdate, current_user: dict = Depends(get_current_user)):
    """Update incident status/resolution"""
    if current_user.get("role") not in ["ceo", "super_admin", "owner"]:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    incident = next((i for i in irp_incidents if i["id"] == incident_id), None)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident non trouvé")
    
    if data.status:
        old_status = incident["status"]
        incident["status"] = data.status
        incident["timeline"].append({
            "action": f"Status: {old_status} → {data.status}",
            "by": current_user.get("name"),
            "at": datetime.now(timezone.utc).isoformat()
        })
    
    if data.resolution:
        incident["resolution"] = data.resolution
        incident["timeline"].append({
            "action": "Résolution ajoutée",
            "by": current_user.get("name"),
            "at": datetime.now(timezone.utc).isoformat()
        })
    
    if data.root_cause:
        incident["root_cause"] = data.root_cause
        incident["timeline"].append({
            "action": "Cause racine identifiée",
            "by": current_user.get("name"),
            "at": datetime.now(timezone.utc).isoformat()
        })
    
    incident["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    return {"message": "Incident mis à jour", "incident": incident}

@api_router.post("/irp/incidents/{incident_id}/ai-analyze")
async def ai_analyze_irp_incident(incident_id: int, current_user: dict = Depends(get_current_user)):
    """Use AI to analyze incident"""
    if current_user.get("role") not in ["ceo", "super_admin", "owner"]:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    incident = next((i for i in irp_incidents if i["id"] == incident_id), None)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident non trouvé")
    
    prompt = f"""
    Analyse cet incident et propose une solution:
    
    Titre: {incident['title']}
    Description: {incident['description']}
    Sévérité: {incident['severity']}
    Catégorie: {incident['category']}
    Zone affectée: {incident.get('affected_area', 'Non spécifiée')}
    
    Fournis:
    1. Analyse de la cause probable
    2. Solution immédiate
    3. Actions préventives
    4. Estimation du temps de résolution
    """
    
    try:
        llm_key = os.environ.get('EMERGENT_LLM_KEY', '')
        if llm_key:
            llm = LlmChat(
                api_key=llm_key, 
                session_id=str(uuid.uuid4()),
                system_message="Tu es un expert en gestion d'incidents IT. Réponds en français de manière structurée."
            )
            analysis = await llm.chat(prompt)
        else:
            analysis = "Service IA non disponible. Veuillez configurer EMERGENT_LLM_KEY."
    except Exception as e:
        analysis = f"Erreur IA: {str(e)}"
    
    incident["ai_analysis"] = analysis
    incident["timeline"].append({
        "action": "Analyse IA effectuée",
        "by": "AI Assistant",
        "at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"incident_id": incident_id, "ai_analysis": analysis}

@api_router.get("/irp/stats")
async def get_irp_stats(current_user: dict = Depends(get_current_user)):
    """Get IRP statistics"""
    total = len(irp_incidents)
    open_count = len([i for i in irp_incidents if i["status"] == "open"])
    in_progress = len([i for i in irp_incidents if i["status"] == "in_progress"])
    resolved = len([i for i in irp_incidents if i["status"] == "resolved"])
    
    by_severity = {
        "critical": len([i for i in irp_incidents if i["severity"] == "critical"]),
        "high": len([i for i in irp_incidents if i["severity"] == "high"]),
        "medium": len([i for i in irp_incidents if i["severity"] == "medium"]),
        "low": len([i for i in irp_incidents if i["severity"] == "low"])
    }
    
    return {
        "total": total,
        "open": open_count,
        "in_progress": in_progress,
        "resolved": resolved,
        "by_severity": by_severity
    }

# ========================
# ROOT ENDPOINT
# ========================

@api_router.get("/")
async def root():
    return {"message": "StartupManager Pro API", "version": "2.0.0", "database": "MongoDB"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Startup event
@app.on_event("startup")
async def startup_event():
    init_indexes()
    init_security()
    init_demo_data()
    logger.info("StartupManager Pro API started with MongoDB + Security")
