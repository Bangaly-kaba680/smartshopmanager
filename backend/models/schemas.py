"""
Pydantic models for StartupManager Pro API
"""
from pydantic import BaseModel, EmailStr
from typing import Optional, List


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
    tenant_id: Optional[str] = None

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

# Access Action Models
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

# IRP Models
class IRPCreate(BaseModel):
    title: str
    description: str
    severity: str
    category: str

class IRPUpdate(BaseModel):
    status: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = None
    category: Optional[str] = None

# CEO Dashboard Models
class CEODashboardStats(BaseModel):
    total_tenants: int
    active_tenants: int
    total_shops: int
    total_revenue: float
    total_users: int
