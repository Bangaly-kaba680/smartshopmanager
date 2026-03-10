"""
SmartShopManager SaaS - Database Schema
Multi-tenant architecture with PostgreSQL
"""

import os
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, Enum, JSON, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.sql import func
from datetime import datetime, timedelta
import enum

# Database URL
DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://bintronix:bintronix2026@localhost:5432/smartshop_saas')

# Create engine and session
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ========================
# ENUMS
# ========================

class UserRole(enum.Enum):
    SUPER_ADMIN = "super_admin"  # CEO BINTRONIX - accès total
    OWNER = "owner"              # Propriétaire d'une boutique/tenant
    MANAGER = "manager"          # Manager de boutique
    CASHIER = "cashier"          # Caissier - POS uniquement
    STOCK_MANAGER = "stock_manager"  # Gestionnaire de stock
    VIEWER = "viewer"            # Lecture seule

class SubscriptionPlan(enum.Enum):
    TRIAL = "trial"              # Period d'essai
    STARTER = "starter"          # 1 boutique, 2 users
    BUSINESS = "business"        # 3 boutiques, 10 users
    ENTERPRISE = "enterprise"    # Illimité

class SubscriptionStatus(enum.Enum):
    ACTIVE = "active"
    TRIAL = "trial"
    EXPIRED = "expired"
    CANCELLED = "cancelled"

class TicketStatus(enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"

class PaymentMethod(enum.Enum):
    CASH = "cash"
    ORANGE_MONEY = "orange_money"
    WAVE = "wave"
    CARD = "card"
    BANK_TRANSFER = "bank_transfer"

# ========================
# MODELS
# ========================

class Tenant(Base):
    """
    Tenant = Subscriber = Business owner
    Each tenant has isolated data
    """
    __tablename__ = "tenants"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, nullable=False)
    company_name = Column(String(200), nullable=False)
    owner_name = Column(String(200), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    phone = Column(String(50))
    address = Column(Text)
    logo_url = Column(String(500))
    
    # Subscription
    subscription_plan = Column(Enum(SubscriptionPlan), default=SubscriptionPlan.TRIAL)
    subscription_status = Column(Enum(SubscriptionStatus), default=SubscriptionStatus.TRIAL)
    subscription_start = Column(DateTime, default=func.now())
    subscription_end = Column(DateTime)
    trial_ends_at = Column(DateTime)
    
    # Limits based on plan
    max_shops = Column(Integer, default=1)
    max_users = Column(Integer, default=2)
    
    # Settings
    currency = Column(String(10), default="GNF")
    timezone = Column(String(50), default="Africa/Conakry")
    settings = Column(JSON, default={})
    
    # Status
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    users = relationship("User", back_populates="tenant", cascade="all, delete-orphan")
    shops = relationship("Shop", back_populates="tenant", cascade="all, delete-orphan")
    subscriptions = relationship("Subscription", back_populates="tenant")
    support_tickets = relationship("SupportTicket", back_populates="tenant")


class User(Base):
    """
    Users belong to a tenant (except SUPER_ADMIN)
    """
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, nullable=False)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)  # NULL for SUPER_ADMIN
    
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(200), nullable=False)
    phone = Column(String(50))
    avatar_url = Column(String(500))
    
    role = Column(Enum(UserRole), default=UserRole.CASHIER)
    
    # For shop-specific roles
    assigned_shop_id = Column(Integer, ForeignKey("shops.id"), nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    last_login = Column(DateTime)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    tenant = relationship("Tenant", back_populates="users")
    assigned_shop = relationship("Shop", foreign_keys=[assigned_shop_id])
    sales = relationship("Sale", back_populates="cashier")
    
    # Index for faster tenant queries
    __table_args__ = (
        Index('idx_user_tenant', tenant_id),
        Index('idx_user_email', email),
    )


class Shop(Base):
    """
    Shops belong to a tenant
    """
    __tablename__ = "shops"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, nullable=False)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    
    name = Column(String(200), nullable=False)
    address = Column(Text)
    phone = Column(String(50))
    email = Column(String(255))
    
    # Location
    city = Column(String(100))
    country = Column(String(100), default="Guinée")
    latitude = Column(Float)
    longitude = Column(Float)
    
    # Settings
    is_active = Column(Boolean, default=True)
    opening_time = Column(String(10), default="08:00")
    closing_time = Column(String(10), default="20:00")
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    tenant = relationship("Tenant", back_populates="shops")
    products = relationship("Product", back_populates="shop", cascade="all, delete-orphan")
    sales = relationship("Sale", back_populates="shop")
    employees = relationship("Employee", back_populates="shop")
    
    __table_args__ = (
        Index('idx_shop_tenant', tenant_id),
    )


class Product(Base):
    """
    Products belong to a shop (and indirectly to a tenant)
    """
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, nullable=False)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    shop_id = Column(Integer, ForeignKey("shops.id"), nullable=False)
    
    name = Column(String(200), nullable=False)
    description = Column(Text)
    category = Column(String(100))
    sku = Column(String(50))
    barcode = Column(String(100))
    qr_code = Column(String(100))
    
    # Pricing
    purchase_price = Column(Float, default=0)
    selling_price = Column(Float, nullable=False)
    
    # Stock
    stock_quantity = Column(Integer, default=0)
    min_stock_alert = Column(Integer, default=5)
    
    # Media
    image_url = Column(String(500))
    
    # Supplier
    supplier_name = Column(String(200))
    supplier_contact = Column(String(100))
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    shop = relationship("Shop", back_populates="products")
    sale_items = relationship("SaleItem", back_populates="product")
    batches = relationship("Batch", back_populates="product")
    
    __table_args__ = (
        Index('idx_product_tenant', tenant_id),
        Index('idx_product_shop', shop_id),
    )


class Batch(Base):
    """
    Product batches for stock management
    """
    __tablename__ = "batches"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, nullable=False)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    
    lot_number = Column(String(50), nullable=False)
    quantity = Column(Integer, nullable=False)
    remaining_quantity = Column(Integer, nullable=False)
    
    purchase_price = Column(Float)
    expiry_date = Column(DateTime)
    
    size = Column(String(50))
    color = Column(String(50))
    
    qr_code = Column(String(255))
    
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    product = relationship("Product", back_populates="batches")
    
    __table_args__ = (
        Index('idx_batch_tenant', tenant_id),
    )


class Sale(Base):
    """
    Sales transactions
    """
    __tablename__ = "sales"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, nullable=False)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    shop_id = Column(Integer, ForeignKey("shops.id"), nullable=False)
    cashier_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Transaction details
    transaction_id = Column(String(50), unique=True, nullable=False)
    subtotal = Column(Float, nullable=False)
    tax_amount = Column(Float, default=0)
    discount_amount = Column(Float, default=0)
    total = Column(Float, nullable=False)
    
    # Payment
    payment_method = Column(Enum(PaymentMethod), default=PaymentMethod.CASH)
    payment_status = Column(String(20), default="completed")
    payment_reference = Column(String(100))
    
    # Customer
    customer_name = Column(String(200))
    customer_phone = Column(String(50))
    
    # Receipt
    receipt_sent = Column(Boolean, default=False)
    receipt_method = Column(String(20))  # whatsapp, sms, email
    
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    shop = relationship("Shop", back_populates="sales")
    cashier = relationship("User", back_populates="sales")
    items = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_sale_tenant', tenant_id),
        Index('idx_sale_shop', shop_id),
        Index('idx_sale_date', created_at),
    )


class SaleItem(Base):
    """
    Individual items in a sale
    """
    __tablename__ = "sale_items"
    
    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)
    
    # Relationships
    sale = relationship("Sale", back_populates="items")
    product = relationship("Product", back_populates="sale_items")


class Employee(Base):
    """
    Employees of a shop
    """
    __tablename__ = "employees"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, nullable=False)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    shop_id = Column(Integer, ForeignKey("shops.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Link to user account if exists
    
    name = Column(String(200), nullable=False)
    email = Column(String(255))
    phone = Column(String(50))
    position = Column(String(100))
    
    # Contract
    contract_type = Column(String(50))  # CDI, CDD, Stage
    salary = Column(Float)
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    shop = relationship("Shop", back_populates="employees")
    documents = relationship("Document", back_populates="employee")
    
    __table_args__ = (
        Index('idx_employee_tenant', tenant_id),
    )


class Document(Base):
    """
    HR Documents (contracts, attestations)
    """
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, nullable=False)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    
    doc_type = Column(String(50), nullable=False)  # contract, attestation_work, attestation_stage
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    
    is_signed = Column(Boolean, default=False)
    signed_at = Column(DateTime)
    signature_data = Column(Text)
    
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    employee = relationship("Employee", back_populates="documents")
    
    __table_args__ = (
        Index('idx_document_tenant', tenant_id),
    )


class Subscription(Base):
    """
    Subscription history and payments
    """
    __tablename__ = "subscriptions"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, nullable=False)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    
    plan = Column(Enum(SubscriptionPlan), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="GNF")
    
    payment_method = Column(Enum(PaymentMethod))
    payment_reference = Column(String(100))
    payment_status = Column(String(20), default="pending")
    
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    tenant = relationship("Tenant", back_populates="subscriptions")
    
    __table_args__ = (
        Index('idx_subscription_tenant', tenant_id),
    )


class SupportTicket(Base):
    """
    Support tickets from tenants to CEO
    """
    __tablename__ = "support_tickets"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, nullable=False)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    shop_id = Column(Integer, ForeignKey("shops.id"), nullable=True)
    
    subject = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(50))  # technical, billing, feature, bug
    priority = Column(String(20), default="medium")  # low, medium, high, urgent
    
    status = Column(Enum(TicketStatus), default=TicketStatus.OPEN)
    
    # AI Analysis
    ai_analysis = Column(Text)
    ai_suggested_solution = Column(Text)
    
    # Resolution
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolution_notes = Column(Text)
    resolved_at = Column(DateTime)
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    tenant = relationship("Tenant", back_populates="support_tickets")
    messages = relationship("TicketMessage", back_populates="ticket", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_ticket_tenant', tenant_id),
        Index('idx_ticket_status', status),
    )


class TicketMessage(Base):
    """
    Messages in support tickets
    """
    __tablename__ = "ticket_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("support_tickets.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    message = Column(Text, nullable=False)
    is_from_support = Column(Boolean, default=False)
    is_ai_response = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    ticket = relationship("SupportTicket", back_populates="messages")


class AuditLog(Base):
    """
    Audit trail for all important actions
    """
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)  # NULL for global actions
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    action = Column(String(100), nullable=False)
    resource_type = Column(String(50))  # user, product, sale, etc.
    resource_id = Column(Integer)
    
    details = Column(JSON)
    ip_address = Column(String(50))
    user_agent = Column(String(500))
    
    created_at = Column(DateTime, default=func.now())
    
    __table_args__ = (
        Index('idx_audit_tenant', tenant_id),
        Index('idx_audit_date', created_at),
    )


class SystemConfig(Base):
    """
    Global system configuration (for CEO)
    """
    __tablename__ = "system_config"
    
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(JSON, nullable=False)
    description = Column(Text)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class SubscriptionPlanConfig(Base):
    """
    Configurable subscription plans
    """
    __tablename__ = "subscription_plan_config"
    
    id = Column(Integer, primary_key=True, index=True)
    plan = Column(Enum(SubscriptionPlan), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    price_monthly = Column(Float, nullable=False)
    price_yearly = Column(Float)
    currency = Column(String(10), default="GNF")
    
    max_shops = Column(Integer, nullable=False)
    max_users = Column(Integer, nullable=False)
    max_products = Column(Integer, default=-1)  # -1 = unlimited
    
    features = Column(JSON)  # List of features included
    
    is_active = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


# ========================
# DATABASE FUNCTIONS
# ========================

def create_tables():
    """Create all tables"""
    Base.metadata.create_all(bind=engine)

def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_subscription_plans(db):
    """Initialize default subscription plans"""
    from uuid import uuid4
    
    plans = [
        {
            "plan": SubscriptionPlan.STARTER,
            "name": "Starter",
            "price_monthly": 50000,
            "price_yearly": 500000,
            "max_shops": 1,
            "max_users": 2,
            "max_products": 100,
            "features": ["POS Basic", "Rapports simples", "Support email"]
        },
        {
            "plan": SubscriptionPlan.BUSINESS,
            "name": "Business",
            "price_monthly": 150000,
            "price_yearly": 1500000,
            "max_shops": 3,
            "max_users": 10,
            "max_products": 1000,
            "features": ["POS Avancé", "IA Marketing", "IA RH", "Rapports avancés", "Support prioritaire"]
        },
        {
            "plan": SubscriptionPlan.ENTERPRISE,
            "name": "Enterprise",
            "price_monthly": 500000,
            "price_yearly": 5000000,
            "max_shops": -1,  # Unlimited
            "max_users": -1,
            "max_products": -1,
            "features": ["Tout inclus", "API Access", "Support dédié", "Formation", "Personnalisation"]
        }
    ]
    
    for plan_data in plans:
        existing = db.query(SubscriptionPlanConfig).filter_by(plan=plan_data["plan"]).first()
        if not existing:
            plan_config = SubscriptionPlanConfig(**plan_data)
            db.add(plan_config)
    
    db.commit()

def init_super_admin(db):
    """Initialize the Super Admin (CEO BINTRONIX)"""
    from uuid import uuid4
    from passlib.context import CryptContext
    
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    existing = db.query(User).filter_by(email="bangalykaba635@gmail.com").first()
    if not existing:
        super_admin = User(
            uuid=str(uuid4()),
            tenant_id=None,  # Super Admin has no tenant
            email="bangalykaba635@gmail.com",
            password_hash=pwd_context.hash("admin123"),
            name="CEO BINTRONIX",
            role=UserRole.SUPER_ADMIN,
            is_active=True,
            is_verified=True
        )
        db.add(super_admin)
        db.commit()
        print("Super Admin created: bangalykaba635@gmail.com")


if __name__ == "__main__":
    print("Creating database tables...")
    create_tables()
    print("Tables created successfully!")
    
    # Initialize data
    db = SessionLocal()
    init_subscription_plans(db)
    init_super_admin(db)
    db.close()
    print("Initialization complete!")
