"""
SmartShopManager SaaS - Multi-Tenant Backend Server
BINTRONIX - Building the Future
"""

from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone
from uuid import uuid4
import os
import jwt
import logging

# Database imports
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_, or_
from database_pg import (
    get_db, create_tables, init_subscription_plans, init_super_admin,
    User, Tenant, Shop, Product, Sale, SaleItem, Employee, Document,
    Subscription, SupportTicket, TicketMessage, AuditLog, Batch,
    SubscriptionPlanConfig, SystemConfig,
    UserRole, SubscriptionPlan, SubscriptionStatus, TicketStatus, PaymentMethod,
    SessionLocal
)

# Password hashing
from passlib.context import CryptContext

# AI Integration
from emergentintegrations.llm.chat import chat, LlmModel

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ========================
# APP CONFIGURATION
# ========================

app = FastAPI(
    title="SmartShopManager SaaS API",
    description="Multi-tenant SaaS platform by BINTRONIX",
    version="3.0.0"
)

api_router = APIRouter(prefix="/api")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)
JWT_SECRET = os.environ.get("JWT_SECRET", "bintronix-saas-secret-2026")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# LLM Key
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

# Super Admin Email
SUPER_ADMIN_EMAIL = "bangalykaba635@gmail.com"

# ========================
# PYDANTIC MODELS
# ========================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TenantCreate(BaseModel):
    company_name: str
    owner_name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None

class ShopCreate(BaseModel):
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None

class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    selling_price: float
    purchase_price: Optional[float] = 0
    stock_quantity: Optional[int] = 0
    min_stock_alert: Optional[int] = 5
    supplier_name: Optional[str] = None

class SaleCreate(BaseModel):
    shop_id: int
    items: List[Dict[str, Any]]
    payment_method: str = "cash"
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None

class TicketCreate(BaseModel):
    subject: str
    description: str
    category: Optional[str] = "technical"
    priority: Optional[str] = "medium"
    shop_id: Optional[int] = None

class TicketMessageCreate(BaseModel):
    message: str

class EmployeeCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    position: Optional[str] = None
    contract_type: Optional[str] = "CDI"
    salary: Optional[float] = None
    shop_id: int

# ========================
# AUTHENTICATION
# ========================

def create_token(user_id: int, email: str, role: str, tenant_id: Optional[int] = None) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "tenant_id": tenant_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> Dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    if not credentials:
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    payload = decode_token(credentials.credentials)
    user = db.query(User).filter(User.id == payload["user_id"]).first()
    
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Utilisateur non trouvé ou inactif")
    
    return user

async def require_super_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Accès réservé au Super Admin")
    return user

async def require_owner_or_above(user: User = Depends(get_current_user)) -> User:
    if user.role not in [UserRole.SUPER_ADMIN, UserRole.OWNER]:
        raise HTTPException(status_code=403, detail="Accès réservé aux propriétaires")
    return user

async def require_manager_or_above(user: User = Depends(get_current_user)) -> User:
    if user.role not in [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Accès réservé aux managers et propriétaires")
    return user

# ========================
# MULTI-TENANT MIDDLEWARE
# ========================

def get_tenant_filter(user: User):
    """Return filter for tenant isolation"""
    if user.role == UserRole.SUPER_ADMIN:
        return None  # Super Admin sees all
    return user.tenant_id

def apply_tenant_filter(query, model, user: User):
    """Apply tenant filter to query"""
    if user.role != UserRole.SUPER_ADMIN and hasattr(model, 'tenant_id'):
        return query.filter(model.tenant_id == user.tenant_id)
    return query

# ========================
# AUDIT LOGGING
# ========================

def log_action(db: Session, user: User, action: str, resource_type: str = None, 
               resource_id: int = None, details: Dict = None, request: Request = None):
    log = AuditLog(
        tenant_id=user.tenant_id if user else None,
        user_id=user.id if user else None,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details,
        ip_address=request.client.host if request else None
    )
    db.add(log)
    db.commit()

# ========================
# AI FUNCTIONS
# ========================

async def generate_ai_response(prompt: str, system_prompt: str = None) -> str:
    if not EMERGENT_LLM_KEY:
        return "Service IA non disponible"
    
    try:
        response = await chat(
            api_key=EMERGENT_LLM_KEY,
            model=LlmModel.GEMINI_2_0_FLASH,
            user_prompt=prompt,
            system_prompt=system_prompt or "Tu es un assistant professionnel pour SmartShopManager, une plateforme SaaS de gestion de boutiques. Réponds en français de manière concise et utile."
        )
        return response
    except Exception as e:
        logger.error(f"AI Error: {e}")
        return f"Erreur IA: {str(e)}"

# ========================
# AUTH ROUTES
# ========================

@api_router.post("/auth/register-tenant")
async def register_tenant(data: TenantCreate, db: Session = Depends(get_db)):
    """Register a new tenant (business owner)"""
    # Check if email exists
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    
    # Create tenant
    tenant = Tenant(
        uuid=str(uuid4()),
        company_name=data.company_name,
        owner_name=data.owner_name,
        email=data.email,
        phone=data.phone,
        subscription_plan=SubscriptionPlan.TRIAL,
        subscription_status=SubscriptionStatus.TRIAL,
        trial_ends_at=datetime.now(timezone.utc) + timedelta(days=14),
        max_shops=1,
        max_users=2
    )
    db.add(tenant)
    db.flush()
    
    # Create owner user
    user = User(
        uuid=str(uuid4()),
        tenant_id=tenant.id,
        email=data.email,
        password_hash=pwd_context.hash(data.password),
        name=data.owner_name,
        phone=data.phone,
        role=UserRole.OWNER,
        is_active=True,
        is_verified=True
    )
    db.add(user)
    db.commit()
    
    token = create_token(user.id, user.email, user.role.value, tenant.id)
    
    return {
        "message": "Compte créé avec succès! Période d'essai de 14 jours activée.",
        "access_token": token,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role.value
        },
        "tenant": {
            "id": tenant.id,
            "company_name": tenant.company_name,
            "subscription_plan": tenant.subscription_plan.value,
            "trial_ends_at": tenant.trial_ends_at.isoformat() if tenant.trial_ends_at else None
        }
    }

@api_router.post("/auth/login")
async def login(data: UserLogin, db: Session = Depends(get_db)):
    """Login user"""
    user = db.query(User).filter(User.email == data.email).first()
    
    if not user or not pwd_context.verify(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    if not user.is_active:
        raise HTTPException(status_code=401, detail="Compte désactivé")
    
    # Update last login
    user.last_login = datetime.now(timezone.utc)
    db.commit()
    
    token = create_token(user.id, user.email, user.role.value, user.tenant_id)
    
    # Get tenant info
    tenant_info = None
    if user.tenant_id:
        tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
        if tenant:
            tenant_info = {
                "id": tenant.id,
                "company_name": tenant.company_name,
                "subscription_plan": tenant.subscription_plan.value,
                "subscription_status": tenant.subscription_status.value
            }
    
    return {
        "access_token": token,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role.value,
            "tenant_id": user.tenant_id
        },
        "tenant": tenant_info
    }

@api_router.get("/auth/me")
async def get_me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current user info"""
    tenant_info = None
    if user.tenant_id:
        tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
        if tenant:
            tenant_info = {
                "id": tenant.id,
                "company_name": tenant.company_name,
                "subscription_plan": tenant.subscription_plan.value,
                "subscription_status": tenant.subscription_status.value
            }
    
    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role.value,
            "tenant_id": user.tenant_id
        },
        "tenant": tenant_info
    }

# ========================
# CEO CONTROL CENTER ROUTES
# ========================

@api_router.get("/ceo/dashboard")
async def ceo_dashboard(user: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    """CEO Global Dashboard - All tenants statistics"""
    
    # Global stats
    total_tenants = db.query(func.count(Tenant.id)).scalar()
    active_tenants = db.query(func.count(Tenant.id)).filter(Tenant.is_active == True).scalar()
    total_shops = db.query(func.count(Shop.id)).scalar()
    total_users = db.query(func.count(User.id)).filter(User.role != UserRole.SUPER_ADMIN).scalar()
    
    # Today's stats
    today = datetime.now(timezone.utc).date()
    today_sales = db.query(func.count(Sale.id)).filter(
        func.date(Sale.created_at) == today
    ).scalar()
    today_revenue = db.query(func.sum(Sale.total)).filter(
        func.date(Sale.created_at) == today
    ).scalar() or 0
    
    # Monthly revenue
    month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0)
    monthly_revenue = db.query(func.sum(Sale.total)).filter(
        Sale.created_at >= month_start
    ).scalar() or 0
    
    # Subscriptions by plan
    subscription_stats = db.query(
        Tenant.subscription_plan,
        func.count(Tenant.id)
    ).group_by(Tenant.subscription_plan).all()
    
    # Open tickets
    open_tickets = db.query(func.count(SupportTicket.id)).filter(
        SupportTicket.status.in_([TicketStatus.OPEN, TicketStatus.IN_PROGRESS])
    ).scalar()
    
    # Recent tenants
    recent_tenants = db.query(Tenant).order_by(desc(Tenant.created_at)).limit(5).all()
    
    return {
        "global_stats": {
            "total_tenants": total_tenants,
            "active_tenants": active_tenants,
            "total_shops": total_shops,
            "total_users": total_users
        },
        "today": {
            "sales_count": today_sales,
            "revenue": today_revenue
        },
        "monthly_revenue": monthly_revenue,
        "subscriptions": {plan.value: count for plan, count in subscription_stats},
        "open_tickets": open_tickets,
        "recent_tenants": [
            {
                "id": t.id,
                "company_name": t.company_name,
                "owner_name": t.owner_name,
                "email": t.email,
                "subscription_plan": t.subscription_plan.value,
                "created_at": t.created_at.isoformat()
            }
            for t in recent_tenants
        ],
        "system_health": {
            "database": "OK",
            "api": "OK",
            "ai_service": "OK" if EMERGENT_LLM_KEY else "NO KEY"
        }
    }

@api_router.get("/ceo/tenants")
async def list_tenants(
    user: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None
):
    """List all tenants (CEO only)"""
    query = db.query(Tenant)
    
    if status:
        query = query.filter(Tenant.subscription_status == status)
    
    total = query.count()
    tenants = query.order_by(desc(Tenant.created_at)).offset(skip).limit(limit).all()
    
    return {
        "total": total,
        "tenants": [
            {
                "id": t.id,
                "uuid": t.uuid,
                "company_name": t.company_name,
                "owner_name": t.owner_name,
                "email": t.email,
                "phone": t.phone,
                "subscription_plan": t.subscription_plan.value,
                "subscription_status": t.subscription_status.value,
                "is_active": t.is_active,
                "created_at": t.created_at.isoformat(),
                "shops_count": db.query(func.count(Shop.id)).filter(Shop.tenant_id == t.id).scalar(),
                "users_count": db.query(func.count(User.id)).filter(User.tenant_id == t.id).scalar()
            }
            for t in tenants
        ]
    }

@api_router.get("/ceo/support-tickets")
async def list_all_tickets(
    user: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
):
    """List all support tickets (CEO only)"""
    query = db.query(SupportTicket)
    
    if status:
        query = query.filter(SupportTicket.status == status)
    
    total = query.count()
    tickets = query.order_by(desc(SupportTicket.created_at)).offset(skip).limit(limit).all()
    
    result = []
    for t in tickets:
        tenant = db.query(Tenant).filter(Tenant.id == t.tenant_id).first()
        result.append({
            "id": t.id,
            "uuid": t.uuid,
            "subject": t.subject,
            "description": t.description,
            "category": t.category,
            "priority": t.priority,
            "status": t.status.value,
            "tenant": {
                "id": tenant.id if tenant else None,
                "company_name": tenant.company_name if tenant else "Unknown"
            },
            "ai_analysis": t.ai_analysis,
            "ai_suggested_solution": t.ai_suggested_solution,
            "created_at": t.created_at.isoformat()
        })
    
    return {"total": total, "tickets": result}

@api_router.post("/ceo/support-tickets/{ticket_id}/ai-analyze")
async def ai_analyze_ticket(
    ticket_id: int,
    user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """Analyze support ticket with AI"""
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket non trouvé")
    
    tenant = db.query(Tenant).filter(Tenant.id == ticket.tenant_id).first()
    
    prompt = f"""
    Analyse ce ticket de support et propose une solution:
    
    Entreprise: {tenant.company_name if tenant else 'N/A'}
    Sujet: {ticket.subject}
    Description: {ticket.description}
    Catégorie: {ticket.category}
    Priorité: {ticket.priority}
    
    Fournis:
    1. Une analyse du problème
    2. Une solution proposée
    3. Les étapes à suivre
    """
    
    analysis = await generate_ai_response(prompt)
    
    ticket.ai_analysis = analysis
    ticket.ai_suggested_solution = analysis
    db.commit()
    
    return {
        "ticket_id": ticket_id,
        "ai_analysis": analysis
    }

@api_router.post("/ceo/support-tickets/{ticket_id}/respond")
async def respond_to_ticket(
    ticket_id: int,
    data: TicketMessageCreate,
    user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """Respond to support ticket"""
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket non trouvé")
    
    message = TicketMessage(
        ticket_id=ticket_id,
        user_id=user.id,
        message=data.message,
        is_from_support=True
    )
    db.add(message)
    
    ticket.status = TicketStatus.IN_PROGRESS
    db.commit()
    
    return {"message": "Réponse envoyée", "ticket_status": ticket.status.value}

@api_router.put("/ceo/support-tickets/{ticket_id}/resolve")
async def resolve_ticket(
    ticket_id: int,
    resolution_notes: Optional[str] = None,
    user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """Resolve a support ticket"""
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket non trouvé")
    
    ticket.status = TicketStatus.RESOLVED
    ticket.resolved_by = user.id
    ticket.resolved_at = datetime.now(timezone.utc)
    ticket.resolution_notes = resolution_notes
    db.commit()
    
    return {"message": "Ticket résolu", "ticket_id": ticket_id}

# ========================
# TENANT ROUTES (Owner)
# ========================

@api_router.get("/tenant/dashboard")
async def tenant_dashboard(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Dashboard for tenant owner"""
    if user.role == UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=400, detail="Utilisez /ceo/dashboard")
    
    tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant non trouvé")
    
    # Stats for this tenant only
    total_shops = db.query(func.count(Shop.id)).filter(Shop.tenant_id == tenant.id).scalar()
    total_products = db.query(func.count(Product.id)).filter(Product.tenant_id == tenant.id).scalar()
    total_employees = db.query(func.count(Employee.id)).filter(Employee.tenant_id == tenant.id).scalar()
    
    # Today's stats
    today = datetime.now(timezone.utc).date()
    today_sales = db.query(func.count(Sale.id)).filter(
        Sale.tenant_id == tenant.id,
        func.date(Sale.created_at) == today
    ).scalar()
    today_revenue = db.query(func.sum(Sale.total)).filter(
        Sale.tenant_id == tenant.id,
        func.date(Sale.created_at) == today
    ).scalar() or 0
    
    # Monthly revenue
    month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0)
    monthly_revenue = db.query(func.sum(Sale.total)).filter(
        Sale.tenant_id == tenant.id,
        Sale.created_at >= month_start
    ).scalar() or 0
    
    # Low stock products
    low_stock = db.query(Product).filter(
        Product.tenant_id == tenant.id,
        Product.stock_quantity <= Product.min_stock_alert
    ).count()
    
    return {
        "tenant": {
            "company_name": tenant.company_name,
            "subscription_plan": tenant.subscription_plan.value,
            "subscription_status": tenant.subscription_status.value,
            "trial_ends_at": tenant.trial_ends_at.isoformat() if tenant.trial_ends_at else None
        },
        "stats": {
            "total_shops": total_shops,
            "total_products": total_products,
            "total_employees": total_employees,
            "low_stock_alerts": low_stock
        },
        "today": {
            "sales_count": today_sales,
            "revenue": today_revenue
        },
        "monthly_revenue": monthly_revenue
    }

# ========================
# SHOPS ROUTES
# ========================

@api_router.get("/shops")
async def list_shops(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """List shops (filtered by tenant)"""
    query = db.query(Shop)
    query = apply_tenant_filter(query, Shop, user)
    
    shops = query.all()
    return [
        {
            "id": s.id,
            "uuid": s.uuid,
            "name": s.name,
            "address": s.address,
            "phone": s.phone,
            "city": s.city,
            "is_active": s.is_active,
            "created_at": s.created_at.isoformat()
        }
        for s in shops
    ]

@api_router.post("/shops")
async def create_shop(
    data: ShopCreate,
    user: User = Depends(require_owner_or_above),
    db: Session = Depends(get_db)
):
    """Create a new shop"""
    if user.role != UserRole.SUPER_ADMIN:
        tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
        current_shops = db.query(func.count(Shop.id)).filter(Shop.tenant_id == user.tenant_id).scalar()
        
        if tenant.max_shops != -1 and current_shops >= tenant.max_shops:
            raise HTTPException(
                status_code=400, 
                detail=f"Limite de boutiques atteinte ({tenant.max_shops}). Passez à un plan supérieur."
            )
    
    shop = Shop(
        uuid=str(uuid4()),
        tenant_id=user.tenant_id,
        name=data.name,
        address=data.address,
        phone=data.phone,
        city=data.city
    )
    db.add(shop)
    db.commit()
    
    return {"message": "Boutique créée", "shop_id": shop.id}

# ========================
# PRODUCTS ROUTES
# ========================

@api_router.get("/products")
async def list_products(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    shop_id: Optional[int] = None
):
    """List products (filtered by tenant and optionally by shop)"""
    query = db.query(Product)
    query = apply_tenant_filter(query, Product, user)
    
    if shop_id:
        query = query.filter(Product.shop_id == shop_id)
    
    products = query.all()
    return [
        {
            "id": p.id,
            "uuid": p.uuid,
            "name": p.name,
            "category": p.category,
            "selling_price": p.selling_price,
            "purchase_price": p.purchase_price,
            "stock_quantity": p.stock_quantity,
            "min_stock_alert": p.min_stock_alert,
            "shop_id": p.shop_id,
            "is_active": p.is_active
        }
        for p in products
    ]

@api_router.post("/products")
async def create_product(
    data: ProductCreate,
    shop_id: int,
    user: User = Depends(require_manager_or_above),
    db: Session = Depends(get_db)
):
    """Create a new product"""
    # Verify shop belongs to tenant
    shop = db.query(Shop).filter(Shop.id == shop_id).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Boutique non trouvée")
    
    if user.role != UserRole.SUPER_ADMIN and shop.tenant_id != user.tenant_id:
        raise HTTPException(status_code=403, detail="Accès non autorisé à cette boutique")
    
    product = Product(
        uuid=str(uuid4()),
        tenant_id=shop.tenant_id,
        shop_id=shop_id,
        name=data.name,
        description=data.description,
        category=data.category,
        selling_price=data.selling_price,
        purchase_price=data.purchase_price or 0,
        stock_quantity=data.stock_quantity or 0,
        min_stock_alert=data.min_stock_alert or 5,
        supplier_name=data.supplier_name,
        qr_code=str(uuid4())[:8].upper()
    )
    db.add(product)
    db.commit()
    
    return {"message": "Produit créé", "product_id": product.id}

# ========================
# SALES ROUTES (POS)
# ========================

@api_router.post("/sales")
async def create_sale(
    data: SaleCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new sale (POS)"""
    # Verify shop
    shop = db.query(Shop).filter(Shop.id == data.shop_id).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Boutique non trouvée")
    
    if user.role != UserRole.SUPER_ADMIN and shop.tenant_id != user.tenant_id:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    # Calculate total
    subtotal = 0
    sale_items = []
    
    for item in data.items:
        product = db.query(Product).filter(Product.id == item["product_id"]).first()
        if not product:
            continue
        
        quantity = item.get("quantity", 1)
        item_total = product.selling_price * quantity
        subtotal += item_total
        
        # Update stock
        product.stock_quantity -= quantity
        
        sale_items.append({
            "product_id": product.id,
            "quantity": quantity,
            "unit_price": product.selling_price,
            "total_price": item_total
        })
    
    # Create sale
    sale = Sale(
        uuid=str(uuid4()),
        tenant_id=shop.tenant_id,
        shop_id=data.shop_id,
        cashier_id=user.id,
        transaction_id=f"TXN-{uuid4().hex[:8].upper()}",
        subtotal=subtotal,
        total=subtotal,
        payment_method=PaymentMethod(data.payment_method) if data.payment_method else PaymentMethod.CASH,
        customer_name=data.customer_name,
        customer_phone=data.customer_phone
    )
    db.add(sale)
    db.flush()
    
    # Create sale items
    for item in sale_items:
        sale_item = SaleItem(
            sale_id=sale.id,
            **item
        )
        db.add(sale_item)
    
    db.commit()
    
    return {
        "message": "Vente enregistrée",
        "sale_id": sale.id,
        "transaction_id": sale.transaction_id,
        "total": sale.total
    }

@api_router.get("/sales")
async def list_sales(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    shop_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 50
):
    """List sales"""
    query = db.query(Sale)
    query = apply_tenant_filter(query, Sale, user)
    
    if shop_id:
        query = query.filter(Sale.shop_id == shop_id)
    
    total = query.count()
    sales = query.order_by(desc(Sale.created_at)).offset(skip).limit(limit).all()
    
    return {
        "total": total,
        "sales": [
            {
                "id": s.id,
                "transaction_id": s.transaction_id,
                "total": s.total,
                "payment_method": s.payment_method.value,
                "customer_name": s.customer_name,
                "created_at": s.created_at.isoformat()
            }
            for s in sales
        ]
    }

# ========================
# SUPPORT TICKETS (Tenant)
# ========================

@api_router.post("/support/tickets")
async def create_ticket(
    data: TicketCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create support ticket"""
    if user.role == UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=400, detail="Super Admin ne peut pas créer de tickets")
    
    ticket = SupportTicket(
        uuid=str(uuid4()),
        tenant_id=user.tenant_id,
        user_id=user.id,
        shop_id=data.shop_id,
        subject=data.subject,
        description=data.description,
        category=data.category,
        priority=data.priority
    )
    db.add(ticket)
    db.commit()
    
    return {"message": "Ticket créé", "ticket_id": ticket.id}

@api_router.get("/support/tickets")
async def list_my_tickets(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List my tickets"""
    query = db.query(SupportTicket)
    query = apply_tenant_filter(query, SupportTicket, user)
    
    tickets = query.order_by(desc(SupportTicket.created_at)).all()
    
    return [
        {
            "id": t.id,
            "subject": t.subject,
            "status": t.status.value,
            "priority": t.priority,
            "created_at": t.created_at.isoformat()
        }
        for t in tickets
    ]

# ========================
# EMPLOYEES ROUTES
# ========================

@api_router.get("/employees")
async def list_employees(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    shop_id: Optional[int] = None
):
    """List employees"""
    query = db.query(Employee)
    query = apply_tenant_filter(query, Employee, user)
    
    if shop_id:
        query = query.filter(Employee.shop_id == shop_id)
    
    employees = query.all()
    return [
        {
            "id": e.id,
            "name": e.name,
            "email": e.email,
            "phone": e.phone,
            "position": e.position,
            "contract_type": e.contract_type,
            "shop_id": e.shop_id,
            "is_active": e.is_active
        }
        for e in employees
    ]

@api_router.post("/employees")
async def create_employee(
    data: EmployeeCreate,
    user: User = Depends(require_manager_or_above),
    db: Session = Depends(get_db)
):
    """Create employee"""
    shop = db.query(Shop).filter(Shop.id == data.shop_id).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Boutique non trouvée")
    
    if user.role != UserRole.SUPER_ADMIN and shop.tenant_id != user.tenant_id:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    employee = Employee(
        uuid=str(uuid4()),
        tenant_id=shop.tenant_id,
        shop_id=data.shop_id,
        name=data.name,
        email=data.email,
        phone=data.phone,
        position=data.position,
        contract_type=data.contract_type,
        salary=data.salary
    )
    db.add(employee)
    db.commit()
    
    return {"message": "Employé créé", "employee_id": employee.id}

# ========================
# SUBSCRIPTION PLANS
# ========================

@api_router.get("/subscription/plans")
async def list_plans(db: Session = Depends(get_db)):
    """List available subscription plans"""
    plans = db.query(SubscriptionPlanConfig).filter(SubscriptionPlanConfig.is_active == True).all()
    
    return [
        {
            "plan": p.plan.value,
            "name": p.name,
            "price_monthly": p.price_monthly,
            "price_yearly": p.price_yearly,
            "currency": p.currency,
            "max_shops": p.max_shops,
            "max_users": p.max_users,
            "features": p.features
        }
        for p in plans
    ]

# ========================
# AI ROUTES
# ========================

@api_router.post("/ai/chat")
async def ai_chat(
    message: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """AI Assistant chat"""
    response = await generate_ai_response(message)
    return {"response": response}

@api_router.get("/ai/insights")
async def ai_insights(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get AI-powered business insights"""
    if user.role == UserRole.SUPER_ADMIN:
        # Global insights for CEO
        total_revenue = db.query(func.sum(Sale.total)).scalar() or 0
        total_sales = db.query(func.count(Sale.id)).scalar()
        
        prompt = f"""
        En tant qu'analyste business, donne 3 insights sur ces données globales:
        - Revenu total: {total_revenue:,.0f} GNF
        - Nombre de ventes: {total_sales}
        
        Donne des conseils concrets pour améliorer la plateforme.
        """
    else:
        # Tenant-specific insights
        total_revenue = db.query(func.sum(Sale.total)).filter(
            Sale.tenant_id == user.tenant_id
        ).scalar() or 0
        
        prompt = f"""
        En tant qu'analyste business, donne 3 insights pour cette boutique:
        - Revenu: {total_revenue:,.0f} GNF
        
        Donne des conseils concrets pour augmenter les ventes.
        """
    
    insights = await generate_ai_response(prompt)
    return {"insights": insights}

# ========================
# HEALTH CHECK
# ========================

@api_router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "SmartShopManager SaaS",
        "version": "3.0.0",
        "company": "BINTRONIX"
    }

# ========================
# MOUNT ROUTER
# ========================

app.include_router(api_router)

# ========================
# STARTUP
# ========================

@app.on_event("startup")
async def startup():
    logger.info("Starting SmartShopManager SaaS API...")
    
    # Create tables
    create_tables()
    
    # Initialize data
    db = SessionLocal()
    try:
        init_subscription_plans(db)
        init_super_admin(db)
    finally:
        db.close()
    
    logger.info("SmartShopManager SaaS API started - BINTRONIX")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
