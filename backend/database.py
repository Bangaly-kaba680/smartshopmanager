"""
Database Configuration for StartupManager Pro
Uses PostgreSQL with JSONB for data storage.
"""
import os
import logging
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Import AFTER load_dotenv so DATABASE_URL is available
from database_postgres import init_pg_database, get_pg_collection

_initialized = False


def get_database():
    """Initialize PostgreSQL and return a marker object."""
    global _initialized
    if not _initialized:
        init_pg_database()
        _initialized = True
        logging.info("Connected to PostgreSQL database")
    return True


def get_collection(name: str):
    """Get a PgCollection instance that mimics a MongoDB collection."""
    global _initialized
    if not _initialized:
        get_database()
    return get_pg_collection(name)


def init_indexes():
    """Indexes are created during table initialization - this is a no-op."""
    logging.info("Database indexes created")


def close_connection():
    """Close PostgreSQL connection."""
    from database_postgres import _conn
    if _conn and not _conn.closed:
        _conn.close()
        logging.info("PostgreSQL connection closed")
