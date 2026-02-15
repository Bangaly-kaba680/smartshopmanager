from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, UploadFile, File, Header
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
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

# ========================
# IN-MEMORY DATABASE (PostgreSQL simulation with dictionaries)
# ========================
# Using in-memory storage for demo - in production, use actual PostgreSQL

db_users = {}
db_shops = {}
db_products = {}
db_batches = {}
db_sales = {}
db_sale_items = {}
db_employees = {}
db_documents = {}
db_accounts = {}

# Email notification function
async def send_access_notification_email(request_name: str, request_email: str, request_reason: str, request_id: str):
    """Send email notification to admin when someone requests access"""
    try:
        if not resend.api_key or resend.api_key == 're_your_api_key_here':
            logging.warning("Resend API key not configured - skipping email notification")
            return False
        
        app_url = os.environ.get('APP_URL', 'https://shopflow-208.preview.emergentagent.com')
        api_url = f"{app_url}/api"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
            <div style="background: linear-gradient(135deg, #6366f1 0%, #f97316 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">🔔 Nouvelle Demande d'Accès</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">StartupManager Pro</p>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <p style="color: #333; font-size: 16px; margin-bottom: 20px;">
                    Bonjour <strong>Bangaly Kaba</strong>,
                </p>
                
                <p style="color: #666; font-size: 14px;">
                    Une nouvelle personne souhaite accéder à votre application :
                </p>
                
                <div style="background: #f8f9fa; border-left: 4px solid #6366f1; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                    <p style="margin: 0 0 10px 0;"><strong>👤 Nom :</strong> {request_name}</p>
                    <p style="margin: 0 0 10px 0;"><strong>📧 Email :</strong> {request_email}</p>
                    <p style="margin: 0;"><strong>📝 Motif :</strong> {request_reason or 'Non spécifié'}</p>
                </div>
                
                <p style="color: #333; font-size: 16px; font-weight: bold; margin: 25px 0 15px 0; text-align: center;">
                    ⚡ Choisissez une action :
                </p>
                
                <div style="text-align: center; margin: 20px 0;">
                    <a href="{api_url}/access/quick-approve/{request_id}/permanent" 
                       style="display: inline-block; background: #10B981; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; margin: 8px; font-size: 14px;">
                        ✅ PERMANENT
                    </a>
                </div>
                
                <div style="text-align: center; margin: 20px 0;">
                    <a href="{api_url}/access/quick-approve/{request_id}/temporary" 
                       style="display: inline-block; background: #3B82F6; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; margin: 8px; font-size: 14px;">
                        ⏱️ 20 MINUTES
                    </a>
                </div>
                
                <div style="text-align: center; margin: 20px 0;">
                    <a href="{api_url}/access/quick-deny/{request_id}" 
                       style="display: inline-block; background: #EF4444; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; margin: 8px; font-size: 14px;">
                        ❌ REFUSER
                    </a>
                </div>
                
                <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                    Cliquez sur un bouton ci-dessus pour autoriser ou refuser l'accès.<br>
                    L'action sera appliquée immédiatement.
                </p>
            </div>
            
            <p style="color: #999; font-size: 11px; text-align: center; margin-top: 20px;">
                Développé par Bangaly Kaba | StartupManager Pro
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
        
        # Run sync SDK in thread to keep FastAPI non-blocking
        email_result = await asyncio.to_thread(resend.Emails.send, params)
        logging.info(f"Access notification email sent: {email_result}")
        return True
        
    except Exception as e:
        logging.error(f"Failed to send access notification email: {str(e)}")
        return False

# Initialize with demo data
def init_demo_data():
    # Create demo CEO user
    demo_user_id = str(uuid.uuid4())
    db_users[demo_user_id] = {
        "id": demo_user_id,
        "name": "Admin CEO",
        "email": "admin@startup.com",
        "password": pwd_context.hash("admin123"),
        "role": "ceo",
        "shop_id": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Create demo shop
    demo_shop_id = str(uuid.uuid4())
    db_shops[demo_shop_id] = {
        "id": demo_shop_id,
        "name": "Boutique Principale",
        "address": "123 Rue Commerce, Dakar",
        "phone": "+221 77 123 4567",
        "orange_money_number": "+221 77 999 8888",
        "bank_account": "SN001234567890"
    }
    
    # Update CEO with shop
    db_users[demo_user_id]["shop_id"] = demo_shop_id
    
    # Create demo accounts for the shop
    for acc_type in ["cash", "orange_money", "bank"]:
        acc_id = str(uuid.uuid4())
        db_accounts[acc_id] = {
            "id": acc_id,
            "shop_id": demo_shop_id,
            "type": acc_type,
            "balance": 500000 if acc_type == "cash" else (750000 if acc_type == "orange_money" else 2500000)
        }
    
    # Create demo products
    categories = ["Vêtements", "Chaussures", "Accessoires"]
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
        db_products[prod_id] = {
            "id": prod_id,
            "shop_id": demo_shop_id,
            "name": name,
            "category": category,
            "price": price,
            "description": f"Description de {name}",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Create demo batch for each product
        batch_id = str(uuid.uuid4())
        db_batches[batch_id] = {
            "id": batch_id,
            "product_id": prod_id,
            "lot_number": f"LOT-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:4].upper()}",
            "size": "M",
            "color": "Noir",
            "quantity": 50,
            "qr_code": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    
    # Create demo employees
    employees_data = [
        ("Fatou Diallo", "Manager", 450000, "CDI"),
        ("Moussa Ndiaye", "Caissier", 200000, "CDI"),
        ("Aminata Fall", "Stock Manager", 250000, "CDD"),
        ("Ibrahima Sow", "Vendeur", 180000, "Stage"),
    ]
    
    for name, position, salary, contract_type in employees_data:
        emp_id = str(uuid.uuid4())
        db_employees[emp_id] = {
            "id": emp_id,
            "shop_id": demo_shop_id,
            "name": name,
            "position": position,
            "salary": salary,
            "contract_type": contract_type
        }

init_demo_data()

# ========================
# PYDANTIC MODELS
# ========================

# Access Control System
db_access_requests = {}  # Pending access requests
db_authorized_users = {}  # Authorized users
ADMIN_EMAIL = "bangalykaba635@gmail.com"

# Access Request Models
class AccessRequest(BaseModel):
    name: str
    email: EmailStr
    reason: Optional[str] = None

class AccessRequestResponse(BaseModel):
    id: str
    name: str
    email: str
    reason: Optional[str] = None
    status: str  # pending, approved, denied
    access_type: Optional[str] = None  # permanent, temporary
    expires_at: Optional[str] = None
    created_at: str

class ApproveAccess(BaseModel):
    access_type: str  # permanent, temporary

# ========================
# ACCESS CONTROL ROUTES
# ========================

@api_router.post("/access/request")
async def request_access(request: AccessRequest):
    """Request access to the application"""
    # Admin always has access
    if request.email.lower() == ADMIN_EMAIL.lower():
        return {"status": "already_authorized", "message": "Accès admin automatique"}
    
    # Check if already authorized
    for auth in db_authorized_users.values():
        if auth["email"] == request.email:
            if auth["access_type"] == "permanent" or \
               (auth["expires_at"] and datetime.fromisoformat(auth["expires_at"]) > datetime.now(timezone.utc)):
                return {"status": "already_authorized", "message": "Vous avez déjà accès à l'application"}
    
    # Check if request already pending
    for req in db_access_requests.values():
        if req["email"] == request.email and req["status"] == "pending":
            return {"status": "pending", "message": "Votre demande est en cours de traitement"}
    
    request_id = str(uuid.uuid4())
    db_access_requests[request_id] = {
        "id": request_id,
        "name": request.name,
        "email": request.email,
        "reason": request.reason,
        "status": "pending",
        "access_type": None,
        "expires_at": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Send email notification to admin
    await send_access_notification_email(
        request_name=request.name,
        request_email=request.email,
        request_reason=request.reason or "",
        request_id=request_id
    )
    
    return {
        "status": "submitted",
        "message": "Demande envoyée! Bangaly Kaba va examiner votre demande.",
        "request_id": request_id
    }

@api_router.get("/access/check/{email}")
async def check_access(email: str):
    """Check if an email has access"""
    # Admin always has access
    if email.lower() == ADMIN_EMAIL.lower():
        return {"authorized": True, "access_type": "permanent", "is_admin": True}
    
    for auth in db_authorized_users.values():
        if auth["email"] == email:
            if auth["access_type"] == "permanent":
                return {"authorized": True, "access_type": "permanent"}
            elif auth["expires_at"]:
                expires = datetime.fromisoformat(auth["expires_at"])
                if expires > datetime.now(timezone.utc):
                    remaining = (expires - datetime.now(timezone.utc)).total_seconds()
                    return {
                        "authorized": True, 
                        "access_type": "temporary",
                        "remaining_seconds": int(remaining)
                    }
                else:
                    # Access expired, remove it
                    del db_authorized_users[auth["id"]]
                    return {"authorized": False, "message": "Accès expiré"}
    
    # Check pending requests
    for req in db_access_requests.values():
        if req["email"] == email and req["status"] == "pending":
            return {"authorized": False, "status": "pending"}
    
    return {"authorized": False}

@api_router.get("/access/requests")
async def get_access_requests():
    """Get all access requests (Admin only)"""
    return list(db_access_requests.values())

@api_router.get("/access/authorized")
async def get_authorized_users():
    """Get all authorized users (Admin only)"""
    # Clean expired temporary accesses
    expired = []
    for auth_id, auth in db_authorized_users.items():
        if auth["access_type"] == "temporary" and auth["expires_at"]:
            if datetime.fromisoformat(auth["expires_at"]) < datetime.now(timezone.utc):
                expired.append(auth_id)
    for auth_id in expired:
        del db_authorized_users[auth_id]
    
    return list(db_authorized_users.values())

@api_router.put("/access/approve/{request_id}")
async def approve_access(request_id: str, approval: ApproveAccess):
    """Approve an access request (Admin only)"""
    if request_id not in db_access_requests:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    
    request = db_access_requests[request_id]
    request["status"] = "approved"
    request["access_type"] = approval.access_type
    
    if approval.access_type == "temporary":
        expires = datetime.now(timezone.utc) + timedelta(minutes=20)
        request["expires_at"] = expires.isoformat()
    
    # Add to authorized users
    auth_id = str(uuid.uuid4())
    db_authorized_users[auth_id] = {
        "id": auth_id,
        "name": request["name"],
        "email": request["email"],
        "access_type": approval.access_type,
        "expires_at": request.get("expires_at"),
        "approved_at": datetime.now(timezone.utc).isoformat()
    }
    
    return {"status": "approved", "message": f"Accès {approval.access_type} accordé"}

@api_router.put("/access/deny/{request_id}")
async def deny_access(request_id: str):
    """Deny an access request (Admin only)"""
    if request_id not in db_access_requests:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    
    db_access_requests[request_id]["status"] = "denied"
    return {"status": "denied", "message": "Accès refusé"}

@api_router.delete("/access/revoke/{email}")
async def revoke_access(email: str):
    """Revoke access for a user (Admin only)"""
    revoked = False
    to_delete = []
    for auth_id, auth in db_authorized_users.items():
        if auth["email"] == email:
            to_delete.append(auth_id)
            revoked = True
    
    for auth_id in to_delete:
        del db_authorized_users[auth_id]
    
    if revoked:
        return {"status": "revoked", "message": "Accès révoqué"}
    raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

@api_router.get("/access/pending-count")
async def get_pending_count():
    """Get count of pending requests"""
    count = sum(1 for req in db_access_requests.values() if req["status"] == "pending")
    return {"count": count}

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

class ProductResponse(BaseModel):
    id: str
    shop_id: str
    name: str
    category: str
    price: float
    description: Optional[str] = None
    created_at: str
    stock_quantity: int = 0

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    description: Optional[str] = None

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
    payment_method: str  # cash, orange_money, card
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
    contract_type: str  # CDI, CDD, Stage

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
    type: str  # contrat, attestation_travail, attestation_stage

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
    type: str  # job_offer, product_ad
    title: str
    description: str
    price: Optional[float] = None

class AIHelpRequest(BaseModel):
    question: str

# Payment Models (Mock)
class PaymentInitiate(BaseModel):
    amount: float
    phone: Optional[str] = None

class PaymentResponse(BaseModel):
    status: str
    transaction_id: str
    message: str

# WhatsApp Models (Mock)
class WhatsAppReceipt(BaseModel):
    phone: str
    sale_id: str

# ========================
# AUTH HELPERS
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

def get_current_user(authorization: str = None):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token manquant")
    token = authorization.replace("Bearer ", "")
    payload = verify_token(token)
    user_id = payload.get("user_id")
    if user_id not in db_users:
        raise HTTPException(status_code=401, detail="Utilisateur non trouvé")
    return db_users[user_id]

# ========================
# QR CODE HELPER
# ========================

def generate_qr_code(data: str) -> str:
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    return base64.b64encode(buffer.getvalue()).decode()

# ========================
# AI HELPER
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
# AUTH ROUTES
# ========================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user: UserRegister):
    # Check if email exists
    for u in db_users.values():
        if u["email"] == user.email:
            raise HTTPException(status_code=400, detail="Email déjà utilisé")
    
    user_id = str(uuid.uuid4())
    hashed_password = pwd_context.hash(user.password)
    
    # Get first shop for demo
    shop_id = list(db_shops.keys())[0] if db_shops else None
    
    db_users[user_id] = {
        "id": user_id,
        "name": user.name,
        "email": user.email,
        "password": hashed_password,
        "role": user.role,
        "shop_id": shop_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
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
    user = None
    for u in db_users.values():
        if u["email"] == credentials.email:
            user = u
            break
    
    if not user or not pwd_context.verify(credentials.password, user["password"]):
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
    # Mock implementation - in production, send email
    return {"message": "Si cet email existe, un lien de réinitialisation a été envoyé."}

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(authorization: str = Header(None)):
    # Get token from header
    if not authorization:
        raise HTTPException(status_code=401, detail="Token manquant")
    user = get_current_user(authorization)
    return UserResponse(
        id=user["id"],
        name=user["name"],
        email=user["email"],
        role=user["role"],
        shop_id=user.get("shop_id")
    )

# ========================
# SHOPS ROUTES
# ========================

@api_router.get("/shops", response_model=List[ShopResponse])
async def get_shops():
    return [ShopResponse(**shop) for shop in db_shops.values()]

@api_router.post("/shops", response_model=ShopResponse)
async def create_shop(shop: ShopCreate):
    shop_id = str(uuid.uuid4())
    db_shops[shop_id] = {
        "id": shop_id,
        **shop.model_dump()
    }
    
    # Create accounts for the new shop
    for acc_type in ["cash", "orange_money", "bank"]:
        acc_id = str(uuid.uuid4())
        db_accounts[acc_id] = {
            "id": acc_id,
            "shop_id": shop_id,
            "type": acc_type,
            "balance": 0
        }
    
    return ShopResponse(**db_shops[shop_id])

@api_router.get("/shops/{shop_id}", response_model=ShopResponse)
async def get_shop(shop_id: str):
    if shop_id not in db_shops:
        raise HTTPException(status_code=404, detail="Boutique non trouvée")
    return ShopResponse(**db_shops[shop_id])

# ========================
# PRODUCTS ROUTES
# ========================

@api_router.get("/products", response_model=List[ProductResponse])
async def get_products(shop_id: Optional[str] = None):
    products = []
    for prod in db_products.values():
        if shop_id and prod["shop_id"] != shop_id:
            continue
        # Calculate stock quantity
        stock_qty = sum(b["quantity"] for b in db_batches.values() if b["product_id"] == prod["id"])
        products.append(ProductResponse(**prod, stock_quantity=stock_qty))
    return products

@api_router.post("/products", response_model=ProductResponse)
async def create_product(product: ProductCreate):
    prod_id = str(uuid.uuid4())
    shop_id = list(db_shops.keys())[0] if db_shops else None
    
    db_products[prod_id] = {
        "id": prod_id,
        "shop_id": shop_id,
        **product.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    return ProductResponse(**db_products[prod_id], stock_quantity=0)

@api_router.put("/products/{product_id}", response_model=ProductResponse)
async def update_product(product_id: str, product: ProductUpdate):
    if product_id not in db_products:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    for key, value in product.model_dump(exclude_unset=True).items():
        if value is not None:
            db_products[product_id][key] = value
    
    stock_qty = sum(b["quantity"] for b in db_batches.values() if b["product_id"] == product_id)
    return ProductResponse(**db_products[product_id], stock_quantity=stock_qty)

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str):
    if product_id not in db_products:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    del db_products[product_id]
    # Delete related batches
    batches_to_delete = [bid for bid, b in db_batches.items() if b["product_id"] == product_id]
    for bid in batches_to_delete:
        del db_batches[bid]
    return {"message": "Produit supprimé"}

# ========================
# BATCHES/STOCK ROUTES
# ========================

@api_router.get("/batches", response_model=List[BatchResponse])
async def get_batches(product_id: Optional[str] = None):
    batches = []
    for batch in db_batches.values():
        if product_id and batch["product_id"] != product_id:
            continue
        product_name = db_products.get(batch["product_id"], {}).get("name", "Inconnu")
        batches.append(BatchResponse(**batch, product_name=product_name))
    return batches

@api_router.post("/batches", response_model=BatchResponse)
async def create_batch(batch: BatchCreate):
    if batch.product_id not in db_products:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    batch_id = str(uuid.uuid4())
    lot_number = batch.lot_number or f"LOT-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:4].upper()}"
    
    db_batches[batch_id] = {
        "id": batch_id,
        "product_id": batch.product_id,
        "lot_number": lot_number,
        "size": batch.size,
        "color": batch.color,
        "quantity": batch.quantity,
        "qr_code": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    product_name = db_products.get(batch.product_id, {}).get("name", "Inconnu")
    return BatchResponse(**db_batches[batch_id], product_name=product_name)

@api_router.put("/batches/{batch_id}", response_model=BatchResponse)
async def update_batch(batch_id: str, batch: BatchUpdate):
    if batch_id not in db_batches:
        raise HTTPException(status_code=404, detail="Lot non trouvé")
    
    for key, value in batch.model_dump(exclude_unset=True).items():
        if value is not None:
            db_batches[batch_id][key] = value
    
    product_name = db_products.get(db_batches[batch_id]["product_id"], {}).get("name", "Inconnu")
    return BatchResponse(**db_batches[batch_id], product_name=product_name)

@api_router.delete("/batches/{batch_id}")
async def delete_batch(batch_id: str):
    if batch_id not in db_batches:
        raise HTTPException(status_code=404, detail="Lot non trouvé")
    del db_batches[batch_id]
    return {"message": "Lot supprimé"}

@api_router.post("/batches/{batch_id}/generate-qr")
async def generate_batch_qr(batch_id: str):
    if batch_id not in db_batches:
        raise HTTPException(status_code=404, detail="Lot non trouvé")
    
    batch = db_batches[batch_id]
    product = db_products.get(batch["product_id"], {})
    
    qr_data = f"PRODUCT:{product.get('name', 'N/A')}|LOT:{batch['lot_number']}|SIZE:{batch['size']}|COLOR:{batch['color']}"
    qr_code = generate_qr_code(qr_data)
    
    db_batches[batch_id]["qr_code"] = qr_code
    
    return {"qr_code": qr_code, "batch_id": batch_id}

# ========================
# SALES ROUTES
# ========================

@api_router.get("/sales", response_model=List[SaleResponse])
async def get_sales(shop_id: Optional[str] = None):
    sales = []
    for sale in db_sales.values():
        if shop_id and sale["shop_id"] != shop_id:
            continue
        items = [item for item in db_sale_items.values() if item["sale_id"] == sale["id"]]
        sales.append(SaleResponse(**sale, items=items))
    return sorted(sales, key=lambda x: x.created_at, reverse=True)

@api_router.post("/sales", response_model=SaleResponse)
async def create_sale(sale: SaleCreate):
    sale_id = str(uuid.uuid4())
    shop_id = list(db_shops.keys())[0] if db_shops else None
    user_id = list(db_users.keys())[0] if db_users else None
    
    total = sum(item.price * item.quantity for item in sale.items)
    
    db_sales[sale_id] = {
        "id": sale_id,
        "shop_id": shop_id,
        "user_id": user_id,
        "total": total,
        "payment_method": sale.payment_method,
        "customer_phone": sale.customer_phone,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    items = []
    for item in sale.items:
        item_id = str(uuid.uuid4())
        product = db_products.get(item.product_id, {})
        db_sale_items[item_id] = {
            "id": item_id,
            "sale_id": sale_id,
            "product_id": item.product_id,
            "product_name": product.get("name", "Inconnu"),
            "quantity": item.quantity,
            "price": item.price
        }
        items.append(db_sale_items[item_id])
        
        # Update stock (reduce quantity from batches)
        remaining_qty = item.quantity
        for batch in db_batches.values():
            if batch["product_id"] == item.product_id and remaining_qty > 0:
                reduce_by = min(batch["quantity"], remaining_qty)
                batch["quantity"] -= reduce_by
                remaining_qty -= reduce_by
    
    # Update account balance
    for acc in db_accounts.values():
        if acc["shop_id"] == shop_id:
            if (sale.payment_method == "cash" and acc["type"] == "cash") or \
               (sale.payment_method == "orange_money" and acc["type"] == "orange_money") or \
               (sale.payment_method == "card" and acc["type"] == "bank"):
                acc["balance"] += total
                break
    
    return SaleResponse(**db_sales[sale_id], items=items)

@api_router.delete("/sales/{sale_id}")
async def delete_sale(sale_id: str):
    if sale_id not in db_sales:
        raise HTTPException(status_code=404, detail="Vente non trouvée")
    
    # Remove sale items
    items_to_delete = [iid for iid, item in db_sale_items.items() if item["sale_id"] == sale_id]
    for iid in items_to_delete:
        del db_sale_items[iid]
    
    del db_sales[sale_id]
    return {"message": "Vente supprimée"}

# ========================
# EMPLOYEES ROUTES
# ========================

@api_router.get("/employees", response_model=List[EmployeeResponse])
async def get_employees(shop_id: Optional[str] = None):
    employees = []
    for emp in db_employees.values():
        if shop_id and emp["shop_id"] != shop_id:
            continue
        employees.append(EmployeeResponse(**emp))
    return employees

@api_router.post("/employees", response_model=EmployeeResponse)
async def create_employee(employee: EmployeeCreate):
    emp_id = str(uuid.uuid4())
    shop_id = list(db_shops.keys())[0] if db_shops else None
    
    db_employees[emp_id] = {
        "id": emp_id,
        "shop_id": shop_id,
        **employee.model_dump()
    }
    return EmployeeResponse(**db_employees[emp_id])

@api_router.put("/employees/{employee_id}", response_model=EmployeeResponse)
async def update_employee(employee_id: str, employee: EmployeeUpdate):
    if employee_id not in db_employees:
        raise HTTPException(status_code=404, detail="Employé non trouvé")
    
    for key, value in employee.model_dump(exclude_unset=True).items():
        if value is not None:
            db_employees[employee_id][key] = value
    
    return EmployeeResponse(**db_employees[employee_id])

@api_router.delete("/employees/{employee_id}")
async def delete_employee(employee_id: str):
    if employee_id not in db_employees:
        raise HTTPException(status_code=404, detail="Employé non trouvé")
    del db_employees[employee_id]
    return {"message": "Employé supprimé"}

# ========================
# AI DOCUMENTS ROUTES
# ========================

@api_router.post("/ai/contract")
async def generate_contract(request: AIContractRequest):
    if request.employee_id not in db_employees:
        raise HTTPException(status_code=404, detail="Employé non trouvé")
    
    employee = db_employees[request.employee_id]
    shop = db_shops.get(employee["shop_id"], {})
    
    prompt = f"""Génère un contrat de travail professionnel en français pour:
    - Employé: {employee['name']}
    - Poste: {employee['position']}
    - Salaire: {employee['salary']} FCFA/mois
    - Type de contrat: {employee['contract_type']}
    - Entreprise: {shop.get('name', 'StartupManager Pro')}
    - Adresse: {shop.get('address', 'Dakar, Sénégal')}
    
    Le contrat doit être formel, complet et conforme au droit du travail sénégalais."""
    
    content = await generate_ai_content(prompt, "Tu es un expert en droit du travail sénégalais. Génère des documents juridiques professionnels en français.")
    
    doc_id = str(uuid.uuid4())
    db_documents[doc_id] = {
        "id": doc_id,
        "employee_id": request.employee_id,
        "type": "contrat",
        "content": content,
        "signed": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    return DocumentResponse(**db_documents[doc_id], employee_name=employee["name"])

@api_router.post("/ai/attestation-work")
async def generate_work_attestation(request: AIContractRequest):
    if request.employee_id not in db_employees:
        raise HTTPException(status_code=404, detail="Employé non trouvé")
    
    employee = db_employees[request.employee_id]
    shop = db_shops.get(employee["shop_id"], {})
    
    prompt = f"""Génère une attestation de travail professionnelle en français pour:
    - Employé: {employee['name']}
    - Poste: {employee['position']}
    - Entreprise: {shop.get('name', 'StartupManager Pro')}
    - Adresse: {shop.get('address', 'Dakar, Sénégal')}
    
    L'attestation doit certifier que l'employé travaille actuellement dans l'entreprise."""
    
    content = await generate_ai_content(prompt, "Tu es un responsable RH. Génère des attestations professionnelles en français.")
    
    doc_id = str(uuid.uuid4())
    db_documents[doc_id] = {
        "id": doc_id,
        "employee_id": request.employee_id,
        "type": "attestation_travail",
        "content": content,
        "signed": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    return DocumentResponse(**db_documents[doc_id], employee_name=employee["name"])

@api_router.post("/ai/attestation-stage")
async def generate_internship_attestation(request: AIContractRequest):
    if request.employee_id not in db_employees:
        raise HTTPException(status_code=404, detail="Employé non trouvé")
    
    employee = db_employees[request.employee_id]
    shop = db_shops.get(employee["shop_id"], {})
    
    prompt = f"""Génère une attestation de stage professionnelle en français pour:
    - Stagiaire: {employee['name']}
    - Poste: {employee['position']}
    - Entreprise: {shop.get('name', 'StartupManager Pro')}
    - Adresse: {shop.get('address', 'Dakar, Sénégal')}
    
    L'attestation doit certifier la réalisation du stage avec succès."""
    
    content = await generate_ai_content(prompt, "Tu es un responsable RH. Génère des attestations de stage professionnelles en français.")
    
    doc_id = str(uuid.uuid4())
    db_documents[doc_id] = {
        "id": doc_id,
        "employee_id": request.employee_id,
        "type": "attestation_stage",
        "content": content,
        "signed": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    return DocumentResponse(**db_documents[doc_id], employee_name=employee["name"])

@api_router.get("/documents", response_model=List[DocumentResponse])
async def get_documents(employee_id: Optional[str] = None):
    documents = []
    for doc in db_documents.values():
        if employee_id and doc["employee_id"] != employee_id:
            continue
        employee_name = db_employees.get(doc["employee_id"], {}).get("name", "Inconnu")
        documents.append(DocumentResponse(**doc, employee_name=employee_name))
    return sorted(documents, key=lambda x: x.created_at, reverse=True)

@api_router.put("/documents/{document_id}/sign")
async def sign_document(document_id: str):
    if document_id not in db_documents:
        raise HTTPException(status_code=404, detail="Document non trouvé")
    
    db_documents[document_id]["signed"] = True
    employee_name = db_employees.get(db_documents[document_id]["employee_id"], {}).get("name", "Inconnu")
    
    return DocumentResponse(**db_documents[document_id], employee_name=employee_name)

@api_router.get("/documents/{document_id}/pdf")
async def download_document_pdf(document_id: str):
    if document_id not in db_documents:
        raise HTTPException(status_code=404, detail="Document non trouvé")
    
    doc = db_documents[document_id]
    employee = db_employees.get(doc["employee_id"], {})
    
    # Generate PDF
    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    
    # Header
    p.setFont("Helvetica-Bold", 16)
    p.drawString(2*cm, height - 2*cm, "StartupManager Pro")
    
    p.setFont("Helvetica", 12)
    p.drawString(2*cm, height - 3*cm, f"Document: {doc['type'].replace('_', ' ').title()}")
    p.drawString(2*cm, height - 3.5*cm, f"Employé: {employee.get('name', 'N/A')}")
    p.drawString(2*cm, height - 4*cm, f"Date: {doc['created_at'][:10]}")
    
    # Content
    p.setFont("Helvetica", 10)
    y = height - 5.5*cm
    content_lines = doc["content"].split('\n')
    for line in content_lines:
        if y < 3*cm:
            p.showPage()
            y = height - 2*cm
        # Wrap long lines
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
    
    # Signature
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
    - Prix: {request.price} FCFA
    
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
    prompt = f"""En tant qu'assistant pour l'application StartupManager Pro, réponds à cette question en français:
    
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
# ACCOUNTS/FINANCES ROUTES
# ========================

@api_router.get("/accounts", response_model=List[AccountResponse])
async def get_accounts(shop_id: Optional[str] = None):
    accounts = []
    for acc in db_accounts.values():
        if shop_id and acc["shop_id"] != shop_id:
            continue
        accounts.append(AccountResponse(**acc))
    return accounts

# ========================
# PAYMENTS ROUTES (MOCK)
# ========================

@api_router.post("/payments/orange/initiate", response_model=PaymentResponse)
async def initiate_orange_payment(payment: PaymentInitiate):
    # Mock Orange Money payment
    transaction_id = f"OM-{str(uuid.uuid4())[:8].upper()}"
    return PaymentResponse(
        status="pending",
        transaction_id=transaction_id,
        message=f"Paiement Orange Money de {payment.amount} FCFA initié. Confirmez sur votre téléphone."
    )

@api_router.post("/payments/orange/confirm", response_model=PaymentResponse)
async def confirm_orange_payment(transaction_id: str):
    # Mock confirmation
    return PaymentResponse(
        status="success",
        transaction_id=transaction_id,
        message="Paiement Orange Money confirmé avec succès."
    )

@api_router.post("/payments/card", response_model=PaymentResponse)
async def process_card_payment(payment: PaymentInitiate):
    # Mock card payment
    transaction_id = f"CARD-{str(uuid.uuid4())[:8].upper()}"
    return PaymentResponse(
        status="success",
        transaction_id=transaction_id,
        message=f"Paiement par carte de {payment.amount} FCFA traité avec succès."
    )

# ========================
# WHATSAPP ROUTES (MOCK)
# ========================

@api_router.post("/whatsapp/send-receipt")
async def send_whatsapp_receipt(data: WhatsAppReceipt):
    if data.sale_id not in db_sales:
        raise HTTPException(status_code=404, detail="Vente non trouvée")
    
    sale = db_sales[data.sale_id]
    items = [item for item in db_sale_items.values() if item["sale_id"] == data.sale_id]
    
    # Mock WhatsApp send
    return {
        "status": "sent",
        "message": f"Reçu envoyé via WhatsApp au {data.phone}",
        "receipt": {
            "sale_id": data.sale_id,
            "total": sale["total"],
            "items_count": len(items),
            "date": sale["created_at"]
        }
    }

@api_router.post("/sms/send-receipt")
async def send_sms_receipt(data: WhatsAppReceipt):
    if data.sale_id not in db_sales:
        raise HTTPException(status_code=404, detail="Vente non trouvée")
    
    sale = db_sales[data.sale_id]
    
    # Mock SMS send
    return {
        "status": "sent",
        "message": f"Reçu envoyé par SMS au {data.phone}",
        "receipt": {
            "sale_id": data.sale_id,
            "total": sale["total"],
            "date": sale["created_at"]
        }
    }

# ========================
# DASHBOARD STATS
# ========================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats():
    shop_id = list(db_shops.keys())[0] if db_shops else None
    
    # Calculate today's sales
    today = datetime.now(timezone.utc).date().isoformat()
    today_sales = sum(
        s["total"] for s in db_sales.values() 
        if s["created_at"][:10] == today
    )
    
    # Calculate monthly revenue
    current_month = datetime.now(timezone.utc).strftime("%Y-%m")
    monthly_revenue = sum(
        s["total"] for s in db_sales.values() 
        if s["created_at"][:7] == current_month
    )
    
    # Get account balances
    cash_balance = sum(a["balance"] for a in db_accounts.values() if a["type"] == "cash")
    orange_balance = sum(a["balance"] for a in db_accounts.values() if a["type"] == "orange_money")
    bank_balance = sum(a["balance"] for a in db_accounts.values() if a["type"] == "bank")
    
    return {
        "today_sales": today_sales,
        "monthly_revenue": monthly_revenue,
        "total_shops": len(db_shops),
        "total_products": len(db_products),
        "total_employees": len(db_employees),
        "cash_balance": cash_balance,
        "orange_money_balance": orange_balance,
        "bank_balance": bank_balance,
        "recent_sales": list(db_sales.values())[-5:] if db_sales else []
    }

# ========================
# ROOT ENDPOINT
# ========================

@api_router.get("/")
async def root():
    return {"message": "StartupManager Pro API", "version": "1.0.0"}

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
