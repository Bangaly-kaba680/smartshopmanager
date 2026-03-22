"""
Pydantic models for StartupManager Pro API
"""
from pydantic import BaseModel, EmailStr
from typing import Optional, List


# ========================
# AUTH & ACCESS MODELS
# ========================
class AccessRequest(BaseModel):
    name: str
    email: EmailStr
    reason: Optional[str] = None

class ApproveAccess(BaseModel):
    access_type: str

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
    tenant_id: Optional[str] = None
    is_active: bool = True
    company_name: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class ForgotPassword(BaseModel):
    email: EmailStr

class TenantRegisterRequest(BaseModel):
    company_name: str
    owner_name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None

class OTPVerify(BaseModel):
    email: EmailStr
    otp: str

class AccessActionApprove(BaseModel):
    request_id: str
    access_type: str = "permanent"

class AccessActionDeny(BaseModel):
    request_id: str

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


# ========================
# ADMIN - USER MANAGEMENT
# ========================
class AdminCreateUser(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "owner"
    company_name: Optional[str] = None
    phone: Optional[str] = None

class AdminUpdateUser(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    company_name: Optional[str] = None
    phone: Optional[str] = None

class AdminUserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    is_active: bool = True
    company_name: Optional[str] = None
    phone: Optional[str] = None
    shop_id: Optional[str] = None
    tenant_id: Optional[str] = None
    subscription_plan: Optional[str] = None
    created_at: Optional[str] = None


# ========================
# ADMIN - SUBSCRIPTION PLANS
# ========================
class SubscriptionPlanCreate(BaseModel):
    name: str
    price: float
    duration_days: int = 30
    features: List[str] = []
    max_products: int = 50
    max_employees: int = 5
    is_active: bool = True

class SubscriptionPlanResponse(BaseModel):
    id: str
    name: str
    price: float
    duration_days: int
    features: List[str] = []
    max_products: int = 50
    max_employees: int = 5
    is_active: bool = True


# ========================
# SHOP MODELS
# ========================
class ShopCreate(BaseModel):
    name: str
    address: str
    phone: str
    logo_url: Optional[str] = None
    orange_money_number: Optional[str] = None
    bank_account: Optional[str] = None

class ShopUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    logo_url: Optional[str] = None
    is_active: Optional[bool] = None
    orange_money_number: Optional[str] = None
    bank_account: Optional[str] = None

class ShopResponse(BaseModel):
    id: str
    name: str
    address: str
    phone: str
    logo_url: Optional[str] = None
    orange_money_number: Optional[str] = None
    bank_account: Optional[str] = None
    is_active: bool = True
    owner_id: Optional[str] = None
    tenant_id: Optional[str] = None
    created_at: Optional[str] = None


# ========================
# PRODUCT MODELS (prix achat + vente)
# ========================
class ProductCreate(BaseModel):
    name: str
    category: str
    buy_price: float = 0
    sell_price: float = 0
    price: Optional[float] = None  # legacy alias for sell_price
    description: Optional[str] = None
    image_url: Optional[str] = None
    low_stock_threshold: int = 5

class ProductResponse(BaseModel):
    id: str
    shop_id: str
    name: str
    category: str
    buy_price: float = 0
    sell_price: float = 0
    price: float = 0
    description: Optional[str] = None
    image_url: Optional[str] = None
    created_at: str = ""
    stock_quantity: int = 0
    low_stock_threshold: int = 5
    low_stock_alert: bool = False

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    buy_price: Optional[float] = None
    sell_price: Optional[float] = None
    price: Optional[float] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    low_stock_threshold: Optional[int] = None


# ========================
# BATCH / STOCK MODELS
# ========================
class BatchCreate(BaseModel):
    product_id: str
    lot_number: Optional[str] = None
    size: str = ""
    color: str = ""
    quantity: int = 0

class BatchResponse(BaseModel):
    id: str
    product_id: str
    product_name: Optional[str] = None
    lot_number: str = ""
    size: str = ""
    color: str = ""
    quantity: int = 0
    qr_code: Optional[str] = None
    created_at: str = ""

class BatchUpdate(BaseModel):
    quantity: Optional[int] = None
    size: Optional[str] = None
    color: Optional[str] = None


# ========================
# SALE MODELS
# ========================
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
    shop_id: str = ""
    user_id: str = ""
    seller_name: Optional[str] = None
    total: float = 0
    profit: float = 0
    payment_method: str = ""
    customer_phone: Optional[str] = None
    items: List[dict] = []
    created_at: str = ""


# ========================
# RETURN MODELS
# ========================
class ProductReturnCreate(BaseModel):
    sale_id: str
    product_id: str
    quantity: int
    reason: str

class ProductReturnResponse(BaseModel):
    id: str
    sale_id: str
    product_id: str
    product_name: Optional[str] = None
    quantity: int
    reason: str
    status: str = "pending"
    processed_by: Optional[str] = None
    created_at: str = ""


# ========================
# EMPLOYEE MODELS (with permissions)
# ========================
class EmployeeCreate(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    position: str
    salary: float
    contract_type: str
    phone: Optional[str] = None
    can_sell: bool = True
    can_modify_stock: bool = False
    can_view_reports: bool = False
    can_manage_returns: bool = False

class EmployeeResponse(BaseModel):
    id: str
    shop_id: str = ""
    name: str
    email: Optional[str] = None
    position: str
    salary: float = 0
    contract_type: str = ""
    phone: Optional[str] = None
    can_sell: bool = True
    can_modify_stock: bool = False
    can_view_reports: bool = False
    can_manage_returns: bool = False
    user_id: Optional[str] = None

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    position: Optional[str] = None
    salary: Optional[float] = None
    contract_type: Optional[str] = None
    phone: Optional[str] = None
    can_sell: Optional[bool] = None
    can_modify_stock: Optional[bool] = None
    can_view_reports: Optional[bool] = None
    can_manage_returns: Optional[bool] = None


# ========================
# DOCUMENT MODELS
# ========================
class DocumentCreate(BaseModel):
    employee_id: str
    type: str

class DocumentResponse(BaseModel):
    id: str
    employee_id: str
    employee_name: Optional[str] = None
    type: str
    content: str = ""
    signed: bool = False
    created_at: str = ""


# ========================
# ACCOUNT / FINANCE MODELS
# ========================
class AccountResponse(BaseModel):
    id: str
    shop_id: str = ""
    type: str
    balance: float = 0


# ========================
# AI MODELS
# ========================
class AIContractRequest(BaseModel):
    employee_id: str

class AIMarketingRequest(BaseModel):
    type: str
    title: str
    description: str
    price: Optional[float] = None

class AIHelpRequest(BaseModel):
    question: str


# ========================
# PAYMENT MODELS
# ========================
class PaymentInitiate(BaseModel):
    amount: float
    phone: Optional[str] = None
    sale_id: Optional[str] = None

class PaymentResponse(BaseModel):
    status: str
    transaction_id: str
    message: str
    details: Optional[dict] = None


# ========================
# WHATSAPP / MESSAGING
# ========================
class WhatsAppReceipt(BaseModel):
    phone: str
    sale_id: str


# ========================
# IRP MODELS
# ========================
class IRPCreate(BaseModel):
    title: str
    description: str
    severity: str = "medium"
    category: str = "technical"
    affected_area: Optional[str] = None

class IRPUpdate(BaseModel):
    status: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = None
    category: Optional[str] = None
    resolution: Optional[str] = None
    root_cause: Optional[str] = None


# ========================
# CEO DASHBOARD
# ========================
class CEODashboardStats(BaseModel):
    total_tenants: int
    active_tenants: int
    total_shops: int
    total_revenue: float
    total_users: int
