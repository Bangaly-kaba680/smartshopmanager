from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends
from fastapi.responses import StreamingResponse, HTMLResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import qrcode
from io import BytesIO
import base64
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import cm
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

# Import models and utilities from modules
from models.schemas import (
    AccessRequest, ApproveAccess, UserRegister, UserLogin, UserResponse,
    TokenResponse, ForgotPassword, TenantRegisterRequest, OTPVerify,
    AccessActionApprove, AccessActionDeny, WhitelistAdd, BlockUser,
    ApproveAccessRequest, ShopCreate, ShopUpdate, ShopResponse, ProductCreate,
    ProductResponse, ProductUpdate, BatchCreate, BatchResponse, BatchUpdate,
    SaleItemCreate, SaleCreate, SaleResponse, EmployeeCreate, EmployeeResponse,
    EmployeeUpdate, DocumentCreate, DocumentResponse, AccountResponse,
    AIContractRequest, AIMarketingRequest, AIHelpRequest, PaymentInitiate,
    PaymentResponse, WhatsAppReceipt, IRPCreate, IRPUpdate,
    AdminCreateUser, AdminUpdateUser, AdminUserResponse,
    SubscriptionPlanCreate, SubscriptionPlanResponse,
    ProductReturnCreate, ProductReturnResponse
)
from utils import (
    pwd_context, ADMIN_EMAIL, otp_storage, generate_otp, store_otp, verify_otp,
    users_col, shops_col, products_col, batches_col, sales_col, sale_items_col,
    employees_col, documents_col, accounts_col, access_requests_col,
    authorized_users_col, payments_col, whatsapp_messages_col, incidents_col,
    returns_col, subscription_plans_col,
    serialize_doc, serialize_docs, create_access_token, verify_token,
    get_current_user, get_shop_filter, is_admin_role, generate_ai_content,
    security, EMERGENT_API_KEY
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Resend Configuration
resend.api_key = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
ADMIN_NOTIFICATION_EMAIL = os.environ.get('ADMIN_NOTIFICATION_EMAIL', 'bangalykaba635@gmail.com')

# Create the main app
app = FastAPI(title="StartupManager Pro API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# IRP (Incident Response Plan) Storage
irp_incidents = []

# ========================
# INITIALIZE DEMO DATA
# ========================
def init_demo_data():
    """Initialize demo data if database is empty"""
    get_database()
    
    # Always ensure super admin exists
    super_admin = users_col().find_one({"email": ADMIN_EMAIL})
    if not super_admin:
        users_col().insert_one({
            "id": str(uuid.uuid4()),
            "name": "CEO BINTRONIX",
            "email": ADMIN_EMAIL,
            "password": pwd_context.hash("admin123"),
            "role": "super_admin",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logging.info(f"Super admin created: {ADMIN_EMAIL}")
    
    # Init default subscription plans
    if subscription_plans_col().count_documents({}) == 0:
        for plan in [
            {"id": str(uuid.uuid4()), "name": "Gratuit", "price": 0, "duration_days": 0, "features": ["5 produits", "1 employé", "Ventes de base"], "max_products": 5, "max_employees": 1, "is_active": True},
            {"id": str(uuid.uuid4()), "name": "Professionnel", "price": 50000, "duration_days": 30, "features": ["100 produits", "10 employés", "Rapports avancés", "Support prioritaire"], "max_products": 100, "max_employees": 10, "is_active": True},
            {"id": str(uuid.uuid4()), "name": "Premium", "price": 150000, "duration_days": 30, "features": ["Produits illimités", "Employés illimités", "IA intégrée", "Support 24/7", "Multi-boutiques"], "max_products": 9999, "max_employees": 9999, "is_active": True},
        ]:
            subscription_plans_col().insert_one(plan)
        logging.info("Default subscription plans created")
    
    # Check if demo data already exists
    if users_col().count_documents({}) > 1:
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
        
        app_url = os.environ.get('APP_URL', 'https://admin-strategic-hub.preview.emergentagent.com')
        
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
async def security_request_access(request: Request, data: AccessRequest):
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
        
        app_url = os.environ.get('APP_URL', 'https://admin-strategic-hub.preview.emergentagent.com')
        
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

@api_router.post("/auth/register-request")
async def request_registration(data: TenantRegisterRequest):
    """Step 1: Request registration with 2FA - sends OTP via email"""
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
    
    logging.info(f"OTP generated for {data.email}")
    
    # Send OTP via Resend email
    email_sent = False
    try:
        if resend.api_key and resend.api_key != 're_your_api_key_here':
            html_content = f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
    <div style="background: linear-gradient(135deg, #0a2e5c 0%, #10B981 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">BINTRONIX</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">StartupManager Pro - Vérification 2FA</p>
    </div>
    <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <p style="color: #333; font-size: 16px;">Bonjour <strong>{data.owner_name}</strong>,</p>
        <p style="color: #666; font-size: 14px;">Voici votre code de vérification pour créer votre compte <strong>{data.company_name}</strong> :</p>
        <div style="background: #f0fdf4; border: 2px solid #10B981; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
            <p style="font-size: 36px; font-weight: bold; color: #10B981; letter-spacing: 8px; margin: 0;">{otp}</p>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center;">Ce code expire dans <strong>5 minutes</strong>. Ne le partagez avec personne.</p>
    </div>
    <p style="color: #999; font-size: 11px; text-align: center; margin-top: 20px;">BINTRONIX - Building the Future</p>
</body>
</html>"""
            params = {
                "from": SENDER_EMAIL,
                "to": [data.email],
                "subject": f"Code de vérification BINTRONIX - {otp}",
                "html": html_content
            }
            await asyncio.to_thread(resend.Emails.send, params)
            email_sent = True
            logging.info(f"OTP email sent to {data.email}")
    except Exception as e:
        logging.error(f"Failed to send OTP email: {e}")
    
    response = {
        "message": "Code de vérification envoyé à votre email",
        "email": data.email,
        "otp_sent": True,
        "email_delivered": email_sent
    }
    
    # Include dev OTP only if email was not sent (fallback for development)
    if not email_sent:
        response["dev_otp"] = otp
        response["message"] = "Email non envoyé. Code de développement affiché ci-dessous."
    
    return response

@api_router.post("/auth/verify-registration")
async def verify_registration(data: OTPVerify):
    """Step 2: Verify OTP and complete registration - creates tenant + shop"""
    reg_data, error = verify_otp(data.email, data.otp)
    if error:
        raise HTTPException(status_code=400, detail=error)
    
    user_id = str(uuid.uuid4())
    tenant_id = str(uuid.uuid4())
    shop_id = str(uuid.uuid4())
    hashed_password = pwd_context.hash(reg_data["password"])
    
    # Create the user with tenant_id and shop_id
    users_col().insert_one({
        "id": user_id,
        "name": reg_data["owner_name"],
        "email": reg_data["email"],
        "password": hashed_password,
        "role": "owner",
        "company_name": reg_data["company_name"],
        "phone": reg_data.get("phone"),
        "tenant_id": tenant_id,
        "shop_id": shop_id,
        "is_verified": True,
        "subscription_plan": "trial",
        "trial_ends_at": (datetime.now(timezone.utc) + timedelta(days=14)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Create a default shop for the new owner
    shops_col().insert_one({
        "id": shop_id,
        "name": reg_data["company_name"],
        "address": "",
        "phone": reg_data.get("phone", ""),
        "owner_id": user_id,
        "tenant_id": tenant_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Create default financial accounts for the shop
    for acc_type in ["cash", "orange_money", "bank"]:
        accounts_col().insert_one({
            "id": str(uuid.uuid4()),
            "shop_id": shop_id,
            "tenant_id": tenant_id,
            "type": acc_type,
            "balance": 0
        })
    
    token = create_access_token({"user_id": user_id, "role": "owner"})
    
    return {
        "message": "Inscription réussie! Bienvenue sur SmartShopManager.",
        "access_token": token,
        "user": {
            "id": user_id,
            "email": reg_data["email"],
            "name": reg_data["owner_name"],
            "role": "owner",
            "shop_id": shop_id,
            "tenant_id": tenant_id
        },
        "tenant": {
            "company_name": reg_data["company_name"],
            "subscription_plan": "trial",
            "trial_ends_at": (datetime.now(timezone.utc) + timedelta(days=14)).isoformat()
        }
    }

@api_router.post("/auth/resend-otp")
async def resend_otp_endpoint(email: str):
    """Resend OTP code via email"""
    if email not in otp_storage:
        raise HTTPException(status_code=400, detail="Aucune demande d'inscription en cours")
    
    otp = generate_otp()
    old_data = otp_storage[email]["data"]
    store_otp(email, otp, old_data)
    
    logging.info(f"New OTP generated for {email}")
    
    # Send via Resend
    email_sent = False
    try:
        if resend.api_key and resend.api_key != 're_your_api_key_here':
            owner_name = old_data.get("owner_name", "Utilisateur")
            params = {
                "from": SENDER_EMAIL,
                "to": [email],
                "subject": f"Nouveau code BINTRONIX - {otp}",
                "html": f"""<div style="font-family: Arial; max-width: 400px; margin: 0 auto; padding: 20px; text-align: center;">
                    <h2 style="color: #10B981;">BINTRONIX</h2>
                    <p>Bonjour {owner_name}, voici votre nouveau code :</p>
                    <div style="background: #f0fdf4; border: 2px solid #10B981; border-radius: 12px; padding: 20px; margin: 20px 0;">
                        <p style="font-size: 36px; font-weight: bold; color: #10B981; letter-spacing: 8px; margin: 0;">{otp}</p>
                    </div>
                    <p style="color: #999; font-size: 12px;">Ce code expire dans 5 minutes.</p>
                </div>"""
            }
            await asyncio.to_thread(resend.Emails.send, params)
            email_sent = True
    except Exception as e:
        logging.error(f"Failed to resend OTP email: {e}")
    
    response = {"message": "Nouveau code envoyé", "email": email}
    if not email_sent:
        response["dev_otp"] = otp
    return response

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
            shop_id=user.get("shop_id"),
            tenant_id=user.get("tenant_id")
        )
    )

@api_router.post("/auth/forgot-password")
async def forgot_password(data: ForgotPassword):
    users_col().find_one({"email": data.email})
    return {"message": "Si cet email existe, un lien de réinitialisation a été envoyé."}

# ========================
# SHOPS ROUTES
# ========================

@api_router.get("/shops", response_model=List[ShopResponse])
async def get_shops(current_user: dict = Depends(get_current_user)):
    if is_admin_role(current_user):
        shops = list(shops_col().find())
    else:
        shops = list(shops_col().find({"owner_id": current_user["id"]}))
        if not shops:
            shops = list(shops_col().find(get_shop_filter(current_user)))
    return [ShopResponse(**serialize_doc(s)) for s in shops]

@api_router.post("/shops", response_model=ShopResponse)
async def create_shop(shop: ShopCreate, current_user: dict = Depends(get_current_user)):
    shop_id = str(uuid.uuid4())
    shop_data = {
        "id": shop_id,
        "owner_id": current_user["id"],
        "tenant_id": current_user.get("tenant_id", ""),
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
async def get_products(shop_id: Optional[str] = None, category: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = get_shop_filter(current_user)
    if shop_id:
        query["shop_id"] = shop_id
    if category:
        query["category"] = category
    
    products = list(products_col().find(query))
    result = []
    for prod in products:
        prod = serialize_doc(prod)
        stock = sum(int(serialize_doc(b).get("quantity", 0)) for b in batches_col().find({"product_id": prod["id"]}))
        # Ensure buy_price/sell_price exist
        if "sell_price" not in prod:
            prod["sell_price"] = prod.get("price", 0)
        if "buy_price" not in prod:
            prod["buy_price"] = 0
        prod["price"] = prod.get("sell_price", prod.get("price", 0))
        threshold = int(prod.get("low_stock_threshold", 5))
        result.append(ProductResponse(**prod, stock_quantity=stock, low_stock_alert=stock <= threshold))
    return result

@api_router.post("/products", response_model=ProductResponse)
async def create_product(product: ProductCreate, current_user: dict = Depends(get_current_user)):
    prod_id = str(uuid.uuid4())
    user_shop_id = current_user.get("shop_id")
    if not user_shop_id:
        shop = shops_col().find_one()
        user_shop_id = serialize_doc(shop)["id"] if shop else None
    
    prod_dict = product.model_dump()
    # Handle price aliases: if price given but not sell_price, use price as sell_price
    if prod_dict.get("price") and not prod_dict.get("sell_price"):
        prod_dict["sell_price"] = prod_dict["price"]
    if not prod_dict.get("price"):
        prod_dict["price"] = prod_dict.get("sell_price", 0)
    
    prod_data = {
        "id": prod_id,
        "shop_id": user_shop_id,
        **prod_dict,
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
async def get_batches(product_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    # Get products for this user's shop to filter batches
    shop_filter = get_shop_filter(current_user)
    if product_id:
        query = {"product_id": product_id}
    elif shop_filter:
        user_products = [serialize_doc(p)["id"] for p in products_col().find(shop_filter)]
        query = {"product_id": {"$in": user_products}} if user_products else {}
    else:
        query = {}
    
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
async def get_sales(shop_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = get_shop_filter(current_user)
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
async def create_sale(sale: SaleCreate, current_user: dict = Depends(get_current_user)):
    sale_id = str(uuid.uuid4())
    user_shop_id = current_user.get("shop_id")
    if not user_shop_id:
        shop = shops_col().find_one()
        user_shop_id = serialize_doc(shop)["id"] if shop else None
    user_id = current_user["id"]
    seller_name = current_user.get("name", "")
    
    total = 0
    total_profit = 0
    sale_items = []
    
    for item in sale.items:
        product = products_col().find_one({"id": item.product_id})
        if not product:
            raise HTTPException(status_code=404, detail=f"Produit {item.product_id} non trouvé")
        
        product = serialize_doc(product)
        item_total = item.quantity * item.price
        total += item_total
        
        # Calculate profit
        buy_price = float(product.get("buy_price", 0))
        item_profit = (item.price - buy_price) * item.quantity
        total_profit += item_profit
        
        item_id = str(uuid.uuid4())
        sale_item = {
            "id": item_id,
            "sale_id": sale_id,
            "product_id": item.product_id,
            "product_name": product["name"],
            "quantity": item.quantity,
            "price": item.price,
            "buy_price": buy_price,
            "total": item_total,
            "profit": item_profit
        }
        sale_items_col().insert_one(sale_item)
        sale_items.append(sale_item)
        
        # Update stock
        batch = batches_col().find_one({"product_id": item.product_id})
        if batch:
            batch = serialize_doc(batch)
            new_qty = max(0, int(batch.get("quantity", 0)) - item.quantity)
            batches_col().update_one({"id": batch["id"]}, {"$set": {"quantity": new_qty}})
    
    sale_data = {
        "id": sale_id,
        "shop_id": user_shop_id,
        "user_id": user_id,
        "seller_name": seller_name,
        "total": total,
        "profit": total_profit,
        "payment_method": sale.payment_method,
        "customer_phone": sale.customer_phone,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    sales_col().insert_one(sale_data)
    
    # Update account balance
    acc_type_map = {"cash": "cash", "orange_money": "orange_money", "card": "bank"}
    acc_type = acc_type_map.get(sale.payment_method, "cash")
    accounts_col().update_one(
        {"shop_id": user_shop_id, "type": acc_type},
        {"$inc": {"balance": total}}
    )
    
    return SaleResponse(**sale_data, items=serialize_docs(sale_items))

# ========================
# EMPLOYEES ROUTES
# ========================

@api_router.get("/employees", response_model=List[EmployeeResponse])
async def get_employees(shop_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = get_shop_filter(current_user)
    if shop_id:
        query["shop_id"] = shop_id
    
    employees = list(employees_col().find(query))
    return [EmployeeResponse(**serialize_doc(e)) for e in employees]

@api_router.post("/employees", response_model=EmployeeResponse)
async def create_employee(employee: EmployeeCreate, current_user: dict = Depends(get_current_user)):
    emp_id = str(uuid.uuid4())
    user_shop_id = current_user.get("shop_id")
    if not user_shop_id:
        shop = shops_col().find_one()
        user_shop_id = serialize_doc(shop)["id"] if shop else None
    
    emp_data = {
        "id": emp_id,
        "shop_id": user_shop_id,
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
async def get_documents(employee_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
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
async def get_accounts(shop_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = get_shop_filter(current_user)
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
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    shop_filter = get_shop_filter(current_user)
    
    today = datetime.now(timezone.utc).date().isoformat()
    today_sales = sum(
        s["total"] for s in sales_col().find(shop_filter)
        if serialize_doc(s)["created_at"][:10] == today
    )
    
    current_month = datetime.now(timezone.utc).strftime("%Y-%m")
    monthly_revenue = sum(
        s["total"] for s in sales_col().find(shop_filter)
        if serialize_doc(s)["created_at"][:7] == current_month
    )
    
    acc_filter = shop_filter.copy()
    cash_balance = sum(serialize_doc(a)["balance"] for a in accounts_col().find({**acc_filter, "type": "cash"}))
    orange_balance = sum(serialize_doc(a)["balance"] for a in accounts_col().find({**acc_filter, "type": "orange_money"}))
    bank_balance = sum(serialize_doc(a)["balance"] for a in accounts_col().find({**acc_filter, "type": "bank"}))
    
    recent_sales = list(sales_col().find(shop_filter).sort("created_at", -1).limit(5))
    
    # Shop count: owners see their own shops, admins see all
    if is_admin_role(current_user):
        shop_count = shops_col().count_documents({})
    else:
        shop_count = shops_col().count_documents({"owner_id": current_user["id"]})
        if shop_count == 0:
            shop_count = shops_col().count_documents(shop_filter)
    
    return {
        "today_sales": today_sales,
        "monthly_revenue": monthly_revenue,
        "total_shops": shop_count,
        "total_products": products_col().count_documents(shop_filter),
        "total_employees": employees_col().count_documents(shop_filter),
        "cash_balance": cash_balance,
        "orange_money_balance": orange_balance,
        "bank_balance": bank_balance,
        "recent_sales": serialize_docs(recent_sales)
    }

# ========================
# EXPORT ROUTES (P3)
# ========================

@api_router.get("/export/sales/pdf")
async def export_sales_pdf(current_user: dict = Depends(get_current_user)):
    """Export sales report as PDF"""
    shop_filter = get_shop_filter(current_user)
    sales = list(sales_col().find(shop_filter).sort("created_at", -1))
    
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
async def export_products_csv(current_user: dict = Depends(get_current_user)):
    """Export products as CSV"""
    shop_filter = get_shop_filter(current_user)
    products = list(products_col().find(shop_filter))
    
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
async def export_employees_csv(current_user: dict = Depends(get_current_user)):
    """Export employees as CSV"""
    shop_filter = get_shop_filter(current_user)
    employees = list(employees_col().find(shop_filter))
    
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
async def list_irp_incidents(filter_status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """List all incidents"""
    if current_user.get("role") not in ["ceo", "super_admin", "owner"]:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    if filter_status:
        filtered = [i for i in irp_incidents if i["status"] == filter_status]
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
        analysis = await generate_ai_content(
            prompt,
            "Tu es un expert en gestion d'incidents IT. Réponds en français de manière structurée."
        )
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

# ========================
# ADMIN - USER MANAGEMENT ROUTES
# ========================

@api_router.get("/admin/users")
async def admin_list_users(role: Optional[str] = None, is_active: Optional[bool] = None, current_user: dict = Depends(get_current_user)):
    """Admin: List all users with optional filters"""
    if not is_admin_role(current_user):
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    query = {}
    if role:
        query["role"] = role
    if is_active is not None:
        query["is_active"] = str(is_active).lower()
    users = list(users_col().find(query))
    result = []
    for u in users:
        u = serialize_doc(u)
        u.pop("password", None)
        result.append(u)
    return result

@api_router.post("/admin/users")
async def admin_create_user(data: AdminCreateUser, current_user: dict = Depends(get_current_user)):
    """Admin: Create a new user (owner, manager, seller)"""
    if not is_admin_role(current_user):
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    existing = users_col().find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    
    user_id = str(uuid.uuid4())
    tenant_id = str(uuid.uuid4())
    shop_id = str(uuid.uuid4()) if data.role == "owner" else None
    
    user_data = {
        "id": user_id,
        "name": data.name,
        "email": data.email,
        "password": pwd_context.hash(data.password),
        "role": data.role,
        "company_name": data.company_name,
        "phone": data.phone,
        "tenant_id": tenant_id,
        "shop_id": shop_id,
        "is_active": True,
        "subscription_plan": "free",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    users_col().insert_one(user_data)
    
    # Create default shop for owners
    if data.role == "owner" and shop_id:
        shops_col().insert_one({
            "id": shop_id,
            "name": data.company_name or f"Boutique de {data.name}",
            "address": "",
            "phone": data.phone or "",
            "owner_id": user_id,
            "tenant_id": tenant_id,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        for acc_type in ["cash", "orange_money", "bank"]:
            accounts_col().insert_one({
                "id": str(uuid.uuid4()),
                "shop_id": shop_id,
                "tenant_id": tenant_id,
                "type": acc_type,
                "balance": 0
            })
    
    user_data.pop("password")
    return {"message": f"Utilisateur {data.name} créé avec succès", "user": serialize_doc(user_data)}

@api_router.put("/admin/users/{user_id}")
async def admin_update_user(user_id: str, data: AdminUpdateUser, current_user: dict = Depends(get_current_user)):
    """Admin: Update user info"""
    if not is_admin_role(current_user):
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    user = users_col().find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        users_col().update_one({"id": user_id}, {"$set": update_data})
    return {"message": "Utilisateur mis à jour"}

@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Admin: Delete a user"""
    if not is_admin_role(current_user):
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    user = users_col().find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    user = serialize_doc(user)
    if user.get("role") == "super_admin":
        raise HTTPException(status_code=403, detail="Impossible de supprimer le super administrateur")
    users_col().delete_one({"id": user_id})
    return {"message": "Utilisateur supprimé"}

@api_router.post("/admin/users/{user_id}/suspend")
async def admin_suspend_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Admin: Suspend a user"""
    if not is_admin_role(current_user):
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    user = users_col().find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    users_col().update_one({"id": user_id}, {"$set": {"is_active": False}})
    return {"message": "Utilisateur suspendu"}

@api_router.post("/admin/users/{user_id}/activate")
async def admin_activate_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Admin: Re-activate a suspended user"""
    if not is_admin_role(current_user):
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    users_col().update_one({"id": user_id}, {"$set": {"is_active": True}})
    return {"message": "Utilisateur réactivé"}

# ========================
# ADMIN - SHOP MANAGEMENT
# ========================

@api_router.get("/admin/shops")
async def admin_list_shops(current_user: dict = Depends(get_current_user)):
    """Admin: List all shops with owner info"""
    if not is_admin_role(current_user):
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    shops = list(shops_col().find())
    result = []
    for s in shops:
        s = serialize_doc(s)
        owner = users_col().find_one({"id": s.get("owner_id", "")})
        s["owner_name"] = serialize_doc(owner).get("name", "N/A") if owner else "N/A"
        s["owner_email"] = serialize_doc(owner).get("email", "N/A") if owner else "N/A"
        result.append(s)
    return result

@api_router.put("/admin/shops/{shop_id}")
async def admin_update_shop(shop_id: str, data: ShopUpdate, current_user: dict = Depends(get_current_user)):
    """Admin: Update shop info"""
    if not is_admin_role(current_user):
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    shop = shops_col().find_one({"id": shop_id})
    if not shop:
        raise HTTPException(status_code=404, detail="Boutique non trouvée")
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        shops_col().update_one({"id": shop_id}, {"$set": update_data})
    return {"message": "Boutique mise à jour"}

@api_router.post("/admin/shops/{shop_id}/deactivate")
async def admin_deactivate_shop(shop_id: str, current_user: dict = Depends(get_current_user)):
    """Admin: Deactivate a shop"""
    if not is_admin_role(current_user):
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    shops_col().update_one({"id": shop_id}, {"$set": {"is_active": False}})
    return {"message": "Boutique désactivée"}

@api_router.post("/admin/shops/{shop_id}/activate")
async def admin_activate_shop(shop_id: str, current_user: dict = Depends(get_current_user)):
    """Admin: Re-activate a shop"""
    if not is_admin_role(current_user):
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    shops_col().update_one({"id": shop_id}, {"$set": {"is_active": True}})
    return {"message": "Boutique réactivée"}

# ========================
# ADMIN - SUBSCRIPTION PLANS
# ========================

@api_router.get("/admin/subscriptions")
async def admin_list_subscriptions(current_user: dict = Depends(get_current_user)):
    """Admin: List all subscription plans"""
    if not is_admin_role(current_user):
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    plans = list(subscription_plans_col().find())
    return serialize_docs(plans)

@api_router.post("/admin/subscriptions")
async def admin_create_subscription(data: SubscriptionPlanCreate, current_user: dict = Depends(get_current_user)):
    """Admin: Create a subscription plan"""
    if not is_admin_role(current_user):
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    plan = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "price": data.price,
        "duration_days": data.duration_days,
        "features": data.features,
        "max_products": data.max_products,
        "max_employees": data.max_employees,
        "is_active": data.is_active,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    subscription_plans_col().insert_one(plan)
    return {"message": f"Plan '{data.name}' créé", "plan": plan}

@api_router.put("/admin/subscriptions/{plan_id}")
async def admin_update_subscription(plan_id: str, data: SubscriptionPlanCreate, current_user: dict = Depends(get_current_user)):
    """Admin: Update a subscription plan"""
    if not is_admin_role(current_user):
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    subscription_plans_col().update_one({"id": plan_id}, {"$set": update_data})
    return {"message": "Plan mis à jour"}

@api_router.post("/admin/users/{user_id}/subscription")
async def admin_set_user_subscription(user_id: str, plan_name: str, current_user: dict = Depends(get_current_user)):
    """Admin: Assign subscription plan to user"""
    if not is_admin_role(current_user):
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    users_col().update_one({"id": user_id}, {"$set": {"subscription_plan": plan_name}})
    return {"message": f"Abonnement '{plan_name}' assigné"}

# ========================
# ADMIN - PLATFORM STATS
# ========================

@api_router.get("/admin/platform-stats")
async def admin_platform_stats(current_user: dict = Depends(get_current_user)):
    """Admin: Global platform statistics"""
    if not is_admin_role(current_user):
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    
    total_users = users_col().count_documents({})
    suspended_users = users_col().count_documents({"is_active": "false"})
    active_users = total_users - suspended_users
    total_shops = shops_col().count_documents({})
    suspended_shops = shops_col().count_documents({"is_active": "false"})
    active_shops = total_shops - suspended_shops
    total_products = products_col().count_documents({})
    total_sales = sales_col().count_documents({})
    
    all_sales = list(sales_col().find())
    total_revenue = sum(float(serialize_doc(s).get("total", 0)) for s in all_sales)
    
    today = datetime.now(timezone.utc).date().isoformat()
    today_sales = [s for s in all_sales if serialize_doc(s).get("created_at", "")[:10] == today]
    today_revenue = sum(float(serialize_doc(s).get("total", 0)) for s in today_sales)
    
    current_month = datetime.now(timezone.utc).strftime("%Y-%m")
    monthly_sales = [s for s in all_sales if serialize_doc(s).get("created_at", "")[:7] == current_month]
    monthly_revenue = sum(float(serialize_doc(s).get("total", 0)) for s in monthly_sales)
    
    # Users by role
    owners = users_col().count_documents({"role": "owner"})
    sellers = users_col().count_documents({"role": "seller"})
    managers = users_col().count_documents({"role": "manager"})
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "users_by_role": {"owners": owners, "sellers": sellers, "managers": managers},
        "total_shops": total_shops,
        "active_shops": active_shops,
        "total_products": total_products,
        "total_sales": total_sales,
        "total_revenue": total_revenue,
        "today_revenue": today_revenue,
        "today_sales_count": len(today_sales),
        "monthly_revenue": monthly_revenue,
        "monthly_sales_count": len(monthly_sales)
    }

# ========================
# OWNER - SHOP MANAGEMENT
# ========================

@api_router.put("/shop/settings")
async def owner_update_shop(data: ShopUpdate, current_user: dict = Depends(get_current_user)):
    """Owner: Update own shop settings"""
    shop_id = current_user.get("shop_id")
    if not shop_id:
        raise HTTPException(status_code=404, detail="Aucune boutique associée")
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        shops_col().update_one({"id": shop_id}, {"$set": update_data})
    shop = shops_col().find_one({"id": shop_id})
    return {"message": "Boutique mise à jour", "shop": serialize_doc(shop)}

@api_router.get("/shop/info")
async def owner_get_shop_info(current_user: dict = Depends(get_current_user)):
    """Owner: Get own shop info"""
    shop_id = current_user.get("shop_id")
    if not shop_id and is_admin_role(current_user):
        shop = shops_col().find_one()
    else:
        shop = shops_col().find_one({"id": shop_id})
    if not shop:
        raise HTTPException(status_code=404, detail="Aucune boutique trouvée")
    return serialize_doc(shop)

# ========================
# OWNER - ADD SELLER / EMPLOYEE ACCOUNT
# ========================

@api_router.post("/owner/add-seller")
async def owner_add_seller(data: EmployeeCreate, current_user: dict = Depends(get_current_user)):
    """Owner: Add a seller/employee to the shop with an account"""
    shop_id = current_user.get("shop_id")
    tenant_id = current_user.get("tenant_id")
    if not shop_id:
        raise HTTPException(status_code=403, detail="Pas de boutique associée")
    
    emp_id = str(uuid.uuid4())
    seller_user_id = None
    
    # Create user account for the seller if email is provided
    if data.email:
        existing = users_col().find_one({"email": data.email})
        if existing:
            raise HTTPException(status_code=400, detail="Email déjà utilisé")
        seller_user_id = str(uuid.uuid4())
        users_col().insert_one({
            "id": seller_user_id,
            "name": data.name,
            "email": data.email,
            "password": pwd_context.hash("changeme123"),
            "role": "seller",
            "shop_id": shop_id,
            "tenant_id": tenant_id,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # Create employee record
    emp_data = {
        "id": emp_id,
        "shop_id": shop_id,
        "name": data.name,
        "email": data.email,
        "position": data.position,
        "salary": data.salary,
        "contract_type": data.contract_type,
        "phone": data.phone,
        "can_sell": data.can_sell,
        "can_modify_stock": data.can_modify_stock,
        "can_view_reports": data.can_view_reports,
        "can_manage_returns": data.can_manage_returns,
        "user_id": seller_user_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    employees_col().insert_one(emp_data)
    
    response = {"message": f"Vendeur {data.name} ajouté avec succès", "employee": emp_data}
    if seller_user_id:
        response["account_created"] = True
        response["default_password"] = "changeme123"
    return response

# ========================
# OWNER - FINANCIAL ANALYSIS
# ========================

@api_router.get("/owner/financial-analysis")
async def owner_financial_analysis(period: str = "today", current_user: dict = Depends(get_current_user)):
    """Owner: Get financial analysis with profit calculations"""
    shop_filter = get_shop_filter(current_user)
    all_sales = list(sales_col().find(shop_filter))
    
    now = datetime.now(timezone.utc)
    today = now.date().isoformat()
    current_month = now.strftime("%Y-%m")
    
    today_sales = []
    monthly_sales = []
    for s in all_sales:
        s = serialize_doc(s)
        created = s.get("created_at", "")
        if created[:10] == today:
            today_sales.append(s)
        if created[:7] == current_month:
            monthly_sales.append(s)
    
    today_revenue = sum(float(s.get("total", 0)) for s in today_sales)
    monthly_revenue = sum(float(s.get("total", 0)) for s in monthly_sales)
    today_profit = sum(float(s.get("profit", 0)) for s in today_sales)
    monthly_profit = sum(float(s.get("profit", 0)) for s in monthly_sales)
    
    # Sales by payment method
    by_payment = {}
    target = today_sales if period == "today" else monthly_sales
    for s in target:
        method = s.get("payment_method", "cash")
        by_payment[method] = by_payment.get(method, 0) + float(s.get("total", 0))
    
    return {
        "today": {
            "revenue": today_revenue,
            "profit": today_profit,
            "sales_count": len(today_sales)
        },
        "monthly": {
            "revenue": monthly_revenue,
            "profit": monthly_profit,
            "sales_count": len(monthly_sales)
        },
        "by_payment_method": by_payment,
        "total_all_time": {
            "revenue": sum(float(serialize_doc(s).get("total", 0)) for s in all_sales),
            "profit": sum(float(serialize_doc(s).get("profit", 0)) for s in all_sales),
            "sales_count": len(all_sales)
        }
    }

# ========================
# OWNER - SALES BY SELLER / PRODUCT
# ========================

@api_router.get("/owner/sales-by-seller")
async def owner_sales_by_seller(current_user: dict = Depends(get_current_user)):
    """Owner: View sales grouped by seller"""
    shop_filter = get_shop_filter(current_user)
    sales = list(sales_col().find(shop_filter))
    by_seller = {}
    for s in sales:
        s = serialize_doc(s)
        seller_id = s.get("user_id", "unknown")
        seller_name = s.get("seller_name", "")
        if not seller_name:
            seller_user = users_col().find_one({"id": seller_id})
            seller_name = serialize_doc(seller_user).get("name", "Inconnu") if seller_user else "Inconnu"
        if seller_id not in by_seller:
            by_seller[seller_id] = {"name": seller_name, "total": 0, "count": 0, "profit": 0}
        by_seller[seller_id]["total"] += float(s.get("total", 0))
        by_seller[seller_id]["count"] += 1
        by_seller[seller_id]["profit"] += float(s.get("profit", 0))
    return list(by_seller.values())

@api_router.get("/owner/sales-by-product")
async def owner_sales_by_product(current_user: dict = Depends(get_current_user)):
    """Owner: View sales grouped by product"""
    shop_filter = get_shop_filter(current_user)
    sale_items = list(sale_items_col().find())
    # Filter by shop's sales
    shop_sales = {serialize_doc(s)["id"] for s in sales_col().find(shop_filter)}
    
    by_product = {}
    for item in sale_items:
        item = serialize_doc(item)
        if item.get("sale_id") not in shop_sales and shop_filter:
            continue
        pid = item.get("product_id", "unknown")
        pname = item.get("product_name", "")
        if pid not in by_product:
            by_product[pid] = {"name": pname, "quantity_sold": 0, "revenue": 0}
        by_product[pid]["quantity_sold"] += int(item.get("quantity", 0))
        by_product[pid]["revenue"] += float(item.get("subtotal", 0))
    return list(by_product.values())

# ========================
# OWNER - STOCK ALERTS
# ========================

@api_router.get("/owner/stock-alerts")
async def owner_stock_alerts(current_user: dict = Depends(get_current_user)):
    """Owner: Get products with low stock"""
    shop_filter = get_shop_filter(current_user)
    products = list(products_col().find(shop_filter))
    alerts = []
    for p in products:
        p = serialize_doc(p)
        stock = sum(int(serialize_doc(b).get("quantity", 0)) for b in batches_col().find({"product_id": p["id"]}))
        threshold = int(p.get("low_stock_threshold", 5))
        if stock <= threshold:
            alerts.append({
                "product_id": p["id"],
                "product_name": p.get("name", ""),
                "current_stock": stock,
                "threshold": threshold,
                "status": "critical" if stock == 0 else "low"
            })
    return {"alerts": alerts, "total_alerts": len(alerts)}

# ========================
# PRODUCT RETURNS ROUTES
# ========================

@api_router.post("/returns")
async def create_return(data: ProductReturnCreate, current_user: dict = Depends(get_current_user)):
    """Create a product return"""
    sale = sales_col().find_one({"id": data.sale_id})
    if not sale:
        raise HTTPException(status_code=404, detail="Vente non trouvée")
    
    product = products_col().find_one({"id": data.product_id})
    product_name = serialize_doc(product).get("name", "") if product else ""
    
    return_id = str(uuid.uuid4())
    return_data = {
        "id": return_id,
        "sale_id": data.sale_id,
        "product_id": data.product_id,
        "product_name": product_name,
        "quantity": data.quantity,
        "reason": data.reason,
        "status": "pending",
        "processed_by": current_user.get("name"),
        "shop_id": current_user.get("shop_id", ""),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    returns_col().insert_one(return_data)
    
    # Re-add returned quantity to stock
    batch = batches_col().find_one({"product_id": data.product_id})
    if batch:
        batch = serialize_doc(batch)
        batches_col().update_one({"id": batch["id"]}, {"$set": {"quantity": int(batch.get("quantity", 0)) + data.quantity}})
    
    return {"message": "Retour enregistré", "return": return_data}

@api_router.get("/returns")
async def list_returns(current_user: dict = Depends(get_current_user)):
    """List returns for the shop"""
    shop_filter = get_shop_filter(current_user)
    returns = list(returns_col().find(shop_filter))
    return serialize_docs(returns)

@api_router.post("/returns/{return_id}/approve")
async def approve_return(return_id: str, current_user: dict = Depends(get_current_user)):
    """Approve a product return"""
    returns_col().update_one({"id": return_id}, {"$set": {"status": "approved"}})
    return {"message": "Retour approuvé"}

@api_router.post("/returns/{return_id}/reject")
async def reject_return(return_id: str, current_user: dict = Depends(get_current_user)):
    """Reject a product return"""
    returns_col().update_one({"id": return_id}, {"$set": {"status": "rejected"}})
    return {"message": "Retour rejeté"}

# ========================
# SELLER - PERFORMANCE
# ========================

@api_router.get("/seller/my-performance")
async def seller_my_performance(current_user: dict = Depends(get_current_user)):
    """Seller: View own sales performance"""
    user_id = current_user["id"]
    all_sales = list(sales_col().find({"user_id": user_id}))
    
    now = datetime.now(timezone.utc)
    today = now.date().isoformat()
    
    today_sales = [s for s in all_sales if serialize_doc(s).get("created_at", "")[:10] == today]
    today_revenue = sum(float(serialize_doc(s).get("total", 0)) for s in today_sales)
    total_revenue = sum(float(serialize_doc(s).get("total", 0)) for s in all_sales)
    
    return {
        "today": {
            "sales_count": len(today_sales),
            "revenue": today_revenue
        },
        "all_time": {
            "sales_count": len(all_sales),
            "revenue": total_revenue
        }
    }

@api_router.get("/seller/available-products")
async def seller_available_products(current_user: dict = Depends(get_current_user)):
    """Seller: View available products with stock levels"""
    shop_filter = get_shop_filter(current_user)
    products = list(products_col().find(shop_filter))
    result = []
    for p in products:
        p = serialize_doc(p)
        stock = sum(int(serialize_doc(b).get("quantity", 0)) for b in batches_col().find({"product_id": p["id"]}))
        if stock > 0:
            result.append({
                "id": p["id"],
                "name": p.get("name", ""),
                "sell_price": float(p.get("sell_price", p.get("price", 0))),
                "category": p.get("category", ""),
                "stock_quantity": stock
            })
    return result


# ROOT ENDPOINT
# ========================

@api_router.get("/")
async def root():
    return {"message": "StartupManager Pro API", "version": "3.0.0", "database": "PostgreSQL"}

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
    logger.info("StartupManager Pro API started with PostgreSQL + Security")
