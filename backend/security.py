"""
Security & Access Control Module for StartupManager Pro
Super Admin: bangalykaba635@gmail.com
"""
from datetime import datetime, timezone, timedelta
from typing import Optional, List
import uuid
import hashlib
import secrets
from database import get_collection

# Super Admin - Creator of the startup (TOTAL CONTROL)
SUPER_ADMIN_EMAIL = "bangalykaba635@gmail.com"

# Collections
def whitelist_col():
    return get_collection('whitelist')

def access_attempts_col():
    return get_collection('access_attempts')

def audit_log_col():
    return get_collection('audit_log')

def sessions_col():
    return get_collection('sessions')

def blocked_users_col():
    return get_collection('blocked_users')

# ========================
# ROLE PERMISSIONS
# ========================
ROLE_PERMISSIONS = {
    'super_admin': {
        'can_read': True,
        'can_create': True,
        'can_update': True,
        'can_delete': True,
        'can_manage_users': True,
        'can_block_users': True,
        'can_approve_access': True,
        'can_view_audit_log': True,
        'can_export_data': True,
        'can_manage_settings': True,
        'description': 'Contrôle total - Créateur du Startup'
    },
    'ceo': {
        'can_read': True,
        'can_create': True,
        'can_update': True,
        'can_delete': True,
        'can_manage_users': True,
        'can_block_users': True,
        'can_approve_access': False,  # Only super_admin can approve
        'can_view_audit_log': True,
        'can_export_data': True,
        'can_manage_settings': True,
        'description': 'PDG - Accès complet à l\'entreprise'
    },
    'manager': {
        'can_read': True,
        'can_create': True,
        'can_update': True,
        'can_delete': False,  # Cannot delete
        'can_manage_users': False,
        'can_block_users': False,
        'can_approve_access': False,
        'can_view_audit_log': False,
        'can_export_data': True,
        'can_manage_settings': False,
        'description': 'Manager - Peut créer et modifier'
    },
    'cashier': {
        'can_read': True,
        'can_create': False,  # Can only create sales
        'can_update': False,
        'can_delete': False,
        'can_manage_users': False,
        'can_block_users': False,
        'can_approve_access': False,
        'can_view_audit_log': False,
        'can_export_data': False,
        'can_manage_settings': False,
        'description': 'Caissier - Lecture seule + Ventes'
    },
    'stock_manager': {
        'can_read': True,
        'can_create': False,
        'can_update': True,  # Can only update stock quantities
        'can_delete': False,
        'can_manage_users': False,
        'can_block_users': False,
        'can_approve_access': False,
        'can_view_audit_log': False,
        'can_export_data': False,
        'can_manage_settings': False,
        'description': 'Gestionnaire Stock - Peut modifier les quantités'
    },
    'viewer': {
        'can_read': True,
        'can_create': False,
        'can_update': False,
        'can_delete': False,
        'can_manage_users': False,
        'can_block_users': False,
        'can_approve_access': False,
        'can_view_audit_log': False,
        'can_export_data': False,
        'can_manage_settings': False,
        'description': 'Visiteur - Lecture seule'
    }
}

def get_role_permissions(role: str) -> dict:
    """Get permissions for a role"""
    return ROLE_PERMISSIONS.get(role, ROLE_PERMISSIONS['viewer'])

def check_permission(role: str, permission: str) -> bool:
    """Check if role has specific permission"""
    perms = get_role_permissions(role)
    return perms.get(permission, False)

def is_super_admin(email: str) -> bool:
    """Check if email is super admin"""
    return email.lower() == SUPER_ADMIN_EMAIL.lower()

# ========================
# WHITELIST MANAGEMENT
# ========================
def add_to_whitelist(email: str, name: str, role: str, approved_by: str) -> dict:
    """Add email to whitelist"""
    entry = {
        'id': str(uuid.uuid4()),
        'email': email.lower(),
        'name': name,
        'role': role,
        'approved_by': approved_by,
        'approved_at': datetime.now(timezone.utc).isoformat(),
        'is_active': True
    }
    whitelist_col().update_one(
        {'email': email.lower()},
        {'$set': entry},
        upsert=True
    )
    return entry

def remove_from_whitelist(email: str) -> bool:
    """Remove email from whitelist"""
    result = whitelist_col().delete_one({'email': email.lower()})
    return result.deleted_count > 0

def is_whitelisted(email: str) -> dict:
    """Check if email is whitelisted"""
    # Super admin is always whitelisted
    if is_super_admin(email):
        return {
            'whitelisted': True,
            'role': 'super_admin',
            'name': 'Bangaly Kaba (Super Admin)'
        }
    
    entry = whitelist_col().find_one({'email': email.lower(), 'is_active': True})
    if entry:
        return {
            'whitelisted': True,
            'role': entry.get('role', 'viewer'),
            'name': entry.get('name')
        }
    return {'whitelisted': False}

def get_whitelist() -> List[dict]:
    """Get all whitelisted users"""
    entries = list(whitelist_col().find({'is_active': True}))
    # Add super admin
    result = [{
        'id': 'super-admin',
        'email': SUPER_ADMIN_EMAIL,
        'name': 'Bangaly Kaba',
        'role': 'super_admin',
        'approved_by': 'system',
        'approved_at': '2026-01-01T00:00:00Z',
        'is_active': True,
        'is_super_admin': True
    }]
    for e in entries:
        if '_id' in e:
            del e['_id']
        result.append(e)
    return result

# ========================
# ACCESS ATTEMPTS (for notifications)
# ========================
def log_access_attempt(email: str, name: str, ip_address: str = None, user_agent: str = None) -> dict:
    """Log an access attempt for notification"""
    attempt = {
        'id': str(uuid.uuid4()),
        'email': email,
        'name': name,
        'ip_address': ip_address,
        'user_agent': user_agent,
        'status': 'pending',  # pending, approved, denied
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    access_attempts_col().insert_one(attempt)
    return attempt

def get_pending_attempts() -> List[dict]:
    """Get pending access attempts"""
    attempts = list(access_attempts_col().find({'status': 'pending'}).sort('created_at', -1))
    for a in attempts:
        if '_id' in a:
            del a['_id']
    return attempts

def approve_attempt(attempt_id: str, role: str = 'viewer') -> dict:
    """Approve an access attempt"""
    attempt = access_attempts_col().find_one({'id': attempt_id})
    if not attempt:
        return None
    
    # Update attempt status
    access_attempts_col().update_one(
        {'id': attempt_id},
        {'$set': {'status': 'approved', 'approved_at': datetime.now(timezone.utc).isoformat()}}
    )
    
    # Add to whitelist
    add_to_whitelist(
        email=attempt['email'],
        name=attempt['name'],
        role=role,
        approved_by=SUPER_ADMIN_EMAIL
    )
    
    return {'status': 'approved', 'email': attempt['email'], 'role': role}

def deny_attempt(attempt_id: str) -> dict:
    """Deny an access attempt"""
    result = access_attempts_col().update_one(
        {'id': attempt_id},
        {'$set': {'status': 'denied', 'denied_at': datetime.now(timezone.utc).isoformat()}}
    )
    return {'status': 'denied'} if result.modified_count > 0 else None

# ========================
# BLOCKED USERS
# ========================
def block_user(email: str, blocked_by: str, reason: str = None) -> dict:
    """Block a user"""
    entry = {
        'id': str(uuid.uuid4()),
        'email': email.lower(),
        'blocked_by': blocked_by,
        'reason': reason,
        'blocked_at': datetime.now(timezone.utc).isoformat()
    }
    blocked_users_col().update_one(
        {'email': email.lower()},
        {'$set': entry},
        upsert=True
    )
    # Also deactivate from whitelist
    whitelist_col().update_one({'email': email.lower()}, {'$set': {'is_active': False}})
    return entry

def unblock_user(email: str) -> bool:
    """Unblock a user"""
    result = blocked_users_col().delete_one({'email': email.lower()})
    # Reactivate in whitelist if exists
    whitelist_col().update_one({'email': email.lower()}, {'$set': {'is_active': True}})
    return result.deleted_count > 0

def is_blocked(email: str) -> bool:
    """Check if user is blocked"""
    return blocked_users_col().find_one({'email': email.lower()}) is not None

def get_blocked_users() -> List[dict]:
    """Get all blocked users"""
    users = list(blocked_users_col().find())
    for u in users:
        if '_id' in u:
            del u['_id']
    return users

# ========================
# AUDIT LOG
# ========================
def log_action(user_email: str, action: str, resource: str, resource_id: str = None, details: dict = None):
    """Log an action to audit trail"""
    log_entry = {
        'id': str(uuid.uuid4()),
        'user_email': user_email,
        'action': action,  # create, read, update, delete, login, logout, etc.
        'resource': resource,  # products, employees, sales, settings, etc.
        'resource_id': resource_id,
        'details': details,
        'timestamp': datetime.now(timezone.utc).isoformat()
    }
    audit_log_col().insert_one(log_entry)
    return log_entry

def get_audit_log(limit: int = 100, user_email: str = None, action: str = None) -> List[dict]:
    """Get audit log entries"""
    query = {}
    if user_email:
        query['user_email'] = user_email
    if action:
        query['action'] = action
    
    logs = list(audit_log_col().find(query).sort('timestamp', -1).limit(limit))
    for log in logs:
        if '_id' in log:
            del log['_id']
    return logs

# ========================
# SESSION MANAGEMENT
# ========================
SESSION_DURATION_HOURS = 8  # Sessions expire after 8 hours

def create_session(user_id: str, user_email: str, role: str) -> dict:
    """Create a new session"""
    session_token = secrets.token_urlsafe(32)
    session = {
        'id': str(uuid.uuid4()),
        'token': session_token,
        'user_id': user_id,
        'user_email': user_email,
        'role': role,
        'created_at': datetime.now(timezone.utc).isoformat(),
        'expires_at': (datetime.now(timezone.utc) + timedelta(hours=SESSION_DURATION_HOURS)).isoformat(),
        'is_active': True
    }
    sessions_col().insert_one(session)
    return session

def validate_session(token: str) -> dict:
    """Validate a session token"""
    session = sessions_col().find_one({'token': token, 'is_active': True})
    if not session:
        return None
    
    # Check expiration
    expires_at = datetime.fromisoformat(session['expires_at'])
    if expires_at < datetime.now(timezone.utc):
        sessions_col().update_one({'token': token}, {'$set': {'is_active': False}})
        return None
    
    return {
        'user_id': session['user_id'],
        'user_email': session['user_email'],
        'role': session['role']
    }

def invalidate_session(token: str) -> bool:
    """Invalidate a session (logout)"""
    result = sessions_col().update_one({'token': token}, {'$set': {'is_active': False}})
    return result.modified_count > 0

def invalidate_all_user_sessions(user_email: str) -> int:
    """Invalidate all sessions for a user"""
    result = sessions_col().update_many(
        {'user_email': user_email},
        {'$set': {'is_active': False}}
    )
    return result.modified_count

# ========================
# INITIALIZE
# ========================
def init_security():
    """Initialize security indexes"""
    whitelist_col().create_index('email', unique=True)
    access_attempts_col().create_index('email')
    access_attempts_col().create_index('status')
    audit_log_col().create_index('timestamp')
    audit_log_col().create_index('user_email')
    sessions_col().create_index('token')
    sessions_col().create_index('user_email')
    blocked_users_col().create_index('email', unique=True)
