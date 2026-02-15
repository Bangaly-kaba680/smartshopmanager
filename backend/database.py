"""
MongoDB Database Configuration for StartupManager Pro
"""
from pymongo import MongoClient
from pymongo.database import Database
from dotenv import load_dotenv
import os
import logging
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB Configuration
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'startup_manager')

# Global client and database
_client: MongoClient = None
_db: Database = None

def get_database() -> Database:
    """Get MongoDB database instance"""
    global _client, _db
    if _db is None:
        _client = MongoClient(MONGO_URL)
        _db = _client[DB_NAME]
        logging.info(f"Connected to MongoDB database: {DB_NAME}")
    return _db

def get_collection(name: str):
    """Get a specific collection from the database"""
    db = get_database()
    return db[name]

# Collection names
COLLECTIONS = {
    'users': 'users',
    'shops': 'shops', 
    'products': 'products',
    'batches': 'batches',
    'sales': 'sales',
    'sale_items': 'sale_items',
    'employees': 'employees',
    'documents': 'documents',
    'accounts': 'accounts',
    'access_requests': 'access_requests',
    'authorized_users': 'authorized_users',
    'payments': 'payments',
    'whatsapp_messages': 'whatsapp_messages'
}

def init_indexes():
    """Create database indexes for better performance"""
    db = get_database()
    
    # Users indexes
    db.users.create_index('email', unique=True)
    
    # Products indexes
    db.products.create_index('shop_id')
    db.products.create_index('name')
    
    # Batches indexes
    db.batches.create_index('product_id')
    db.batches.create_index('lot_number')
    
    # Sales indexes
    db.sales.create_index('shop_id')
    db.sales.create_index('created_at')
    
    # Employees indexes
    db.employees.create_index('shop_id')
    
    # Access control indexes
    db.access_requests.create_index('email')
    db.authorized_users.create_index('email')
    
    logging.info("Database indexes created")

def close_connection():
    """Close MongoDB connection"""
    global _client, _db
    if _client:
        _client.close()
        _client = None
        _db = None
        logging.info("MongoDB connection closed")
