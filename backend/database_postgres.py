"""
PostgreSQL Database Layer for StartupManager Pro
Uses JSONB columns with a MongoDB-compatible interface for seamless migration.
"""
import os
import json
import logging
import psycopg2
import psycopg2.extras
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

DATABASE_URL = None

_conn = None

COLLECTIONS = [
    "users", "shops", "products", "batches", "sales", "sale_items",
    "employees", "documents", "accounts", "access_requests",
    "authorized_users", "payments", "whatsapp_messages",
    "otp_codes", "incidents",
    "whitelist", "blocked_users", "access_attempts", "sessions", "audit_log",
    "returns", "subscription_plans"
]


def _get_database_url():
    global DATABASE_URL
    if DATABASE_URL is None:
        DATABASE_URL = os.environ.get("DATABASE_URL")
    return DATABASE_URL


def get_connection():
    global _conn
    try:
        if _conn is not None and not _conn.closed:
            # Test if connection is still alive
            _conn.cursor().execute("SELECT 1")
            return _conn
    except Exception:
        try:
            _conn.close()
        except Exception:
            pass
        _conn = None
    
    db_url = _get_database_url()
    
    # Retry connection up to 5 times with delay (handles PostgreSQL cold starts)
    import time
    last_err = None
    for attempt in range(5):
        try:
            _conn = psycopg2.connect(db_url)
            _conn.autocommit = True
            psycopg2.extras.register_default_jsonb(conn_or_curs=_conn, loads=json.loads)
            return _conn
        except psycopg2.OperationalError as e:
            last_err = e
            logger.warning(f"PostgreSQL connection attempt {attempt+1}/5 failed, retrying in 3s...")
            time.sleep(3)
    
    raise last_err


def init_tables():
    """Create all tables if they don't exist."""
    conn = get_connection()
    cur = conn.cursor()
    for col_name in COLLECTIONS:
        cur.execute(f"""
            CREATE TABLE IF NOT EXISTS {col_name} (
                _row_id SERIAL PRIMARY KEY,
                id TEXT,
                data JSONB NOT NULL DEFAULT '{{}}'::jsonb
            );
        """)
        # Create index on the 'id' field and GIN index on data
        cur.execute(f"CREATE INDEX IF NOT EXISTS idx_{col_name}_id ON {col_name}(id);")
        cur.execute(f"CREATE INDEX IF NOT EXISTS idx_{col_name}_data ON {col_name} USING GIN(data);")
    cur.close()
    logger.info("PostgreSQL tables initialized")


def _match_filter(filter_dict):
    """Convert a MongoDB-style filter to a SQL WHERE clause using JSONB operators."""
    if not filter_dict:
        return "TRUE", []
    
    conditions = []
    values = []
    
    for key, value in filter_dict.items():
        if key == "id":
            conditions.append("id = %s")
            values.append(str(value))
        elif isinstance(value, dict):
            # Handle MongoDB operators like $gte, $lte, $in, etc.
            for op, op_val in value.items():
                if op == "$gte":
                    conditions.append(f"(data->>'{key}')::float >= %s")
                    values.append(float(op_val))
                elif op == "$lte":
                    conditions.append(f"(data->>'{key}')::float <= %s")
                    values.append(float(op_val))
                elif op == "$gt":
                    conditions.append(f"(data->>'{key}')::float > %s")
                    values.append(float(op_val))
                elif op == "$lt":
                    conditions.append(f"(data->>'{key}')::float < %s")
                    values.append(float(op_val))
                elif op == "$in":
                    placeholders = ",".join(["%s"] * len(op_val))
                    conditions.append(f"data->>'{key}' IN ({placeholders})")
                    values.extend([str(v) for v in op_val])
                elif op == "$ne":
                    conditions.append(f"data->>'{key}' != %s")
                    values.append(str(op_val))
        else:
            conditions.append(f"data->>'{key}' = %s")
            values.append(str(value))
    
    return " AND ".join(conditions), values


class PgCollection:
    """A PostgreSQL-backed collection that mimics PyMongo's Collection interface."""
    
    def __init__(self, table_name):
        self.table_name = table_name
    
    def _row_to_doc(self, row):
        """Convert a DB row to a document dict (like MongoDB doc without _id)."""
        if row is None:
            return None
        data = row[2] if isinstance(row[2], dict) else json.loads(row[2])
        data["id"] = row[1]
        return data
    
    def find_one(self, filter_dict=None, projection=None):
        filter_dict = filter_dict or {}
        where_clause, values = _match_filter(filter_dict)
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            f"SELECT _row_id, id, data FROM {self.table_name} WHERE {where_clause} LIMIT 1",
            values
        )
        row = cur.fetchone()
        cur.close()
        return self._row_to_doc(row)
    
    def find(self, filter_dict=None, projection=None):
        filter_dict = filter_dict or {}
        return PgCursor(self.table_name, filter_dict)
    
    def insert_one(self, document):
        doc = dict(document)
        doc_id = doc.pop("id", None) or str(__import__("uuid").uuid4())
        # Remove _id if present (MongoDB artifact)
        doc.pop("_id", None)
        doc["id"] = doc_id
        
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            f"INSERT INTO {self.table_name} (id, data) VALUES (%s, %s)",
            (doc_id, json.dumps(doc, default=str))
        )
        cur.close()
        return type("InsertResult", (), {"inserted_id": doc_id})()
    
    def update_one(self, filter_dict, update_dict, upsert=False):
        where_clause, values = _match_filter(filter_dict)
        
        if "$set" in update_dict:
            set_data = update_dict["$set"]
        elif "$inc" in update_dict:
            # Handle $inc operator
            conn = get_connection()
            cur = conn.cursor()
            cur.execute(
                f"SELECT _row_id, id, data FROM {self.table_name} WHERE {where_clause} LIMIT 1",
                values
            )
            row = cur.fetchone()
            if row:
                data = row[2] if isinstance(row[2], dict) else json.loads(row[2])
                for key, inc_val in update_dict["$inc"].items():
                    current = data.get(key, 0)
                    if isinstance(current, (int, float)):
                        data[key] = current + inc_val
                    else:
                        try:
                            data[key] = float(current) + inc_val
                        except (ValueError, TypeError):
                            data[key] = inc_val
                cur.execute(
                    f"UPDATE {self.table_name} SET data = %s WHERE _row_id = %s",
                    (json.dumps(data, default=str), row[0])
                )
            cur.close()
            return type("UpdateResult", (), {"modified_count": 1 if row else 0})()
        else:
            set_data = update_dict
        
        # Build JSONB merge for $set
        conn = get_connection()
        cur = conn.cursor()
        # First get the current document
        cur.execute(
            f"SELECT _row_id, id, data FROM {self.table_name} WHERE {where_clause} LIMIT 1",
            values
        )
        row = cur.fetchone()
        if row:
            data = row[2] if isinstance(row[2], dict) else json.loads(row[2])
            data.update(set_data)
            new_id = data.get("id", row[1])
            cur.execute(
                f"UPDATE {self.table_name} SET data = %s, id = %s WHERE _row_id = %s",
                (json.dumps(data, default=str), new_id, row[0])
            )
            cur.close()
            return type("UpdateResult", (), {"modified_count": 1})()
        elif upsert:
            # Insert new document
            doc = dict(set_data)
            # Merge filter fields into the document
            for k, v in filter_dict.items():
                if not isinstance(v, dict):
                    doc[k] = v
            doc_id = doc.get("id") or str(__import__("uuid").uuid4())
            doc["id"] = doc_id
            cur.execute(
                f"INSERT INTO {self.table_name} (id, data) VALUES (%s, %s)",
                (doc_id, json.dumps(doc, default=str))
            )
            cur.close()
            return type("UpdateResult", (), {"modified_count": 0, "upserted_id": doc_id})()
        cur.close()
        return type("UpdateResult", (), {"modified_count": 0})()
    
    def update_many(self, filter_dict, update_dict):
        where_clause, values = _match_filter(filter_dict)
        set_data = update_dict.get("$set", update_dict)
        
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            f"SELECT _row_id, id, data FROM {self.table_name} WHERE {where_clause}",
            values
        )
        rows = cur.fetchall()
        count = 0
        for row in rows:
            data = row[2] if isinstance(row[2], dict) else json.loads(row[2])
            data.update(set_data)
            cur.execute(
                f"UPDATE {self.table_name} SET data = %s WHERE _row_id = %s",
                (json.dumps(data, default=str), row[0])
            )
            count += 1
        cur.close()
        return type("UpdateResult", (), {"modified_count": count})()
    
    def create_index(self, field, **kwargs):
        """No-op: indexes are created in init_tables."""
        pass
    
    def delete_one(self, filter_dict):
        where_clause, values = _match_filter(filter_dict)
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            f"DELETE FROM {self.table_name} WHERE _row_id IN (SELECT _row_id FROM {self.table_name} WHERE {where_clause} LIMIT 1)",
            values
        )
        deleted = cur.rowcount
        cur.close()
        return type("DeleteResult", (), {"deleted_count": deleted})()
    
    def delete_many(self, filter_dict):
        where_clause, values = _match_filter(filter_dict)
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(f"DELETE FROM {self.table_name} WHERE {where_clause}", values)
        deleted = cur.rowcount
        cur.close()
        return type("DeleteResult", (), {"deleted_count": deleted})()
    
    def count_documents(self, filter_dict=None):
        filter_dict = filter_dict or {}
        where_clause, values = _match_filter(filter_dict)
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(f"SELECT COUNT(*) FROM {self.table_name} WHERE {where_clause}", values)
        count = cur.fetchone()[0]
        cur.close()
        return count


class PgCursor:
    """A cursor that mimics PyMongo's Cursor with sort/limit support."""
    
    def __init__(self, table_name, filter_dict=None):
        self.table_name = table_name
        self.filter_dict = filter_dict or {}
        self._sort_field = None
        self._sort_direction = 1
        self._limit_val = None
    
    def sort(self, field, direction=1):
        self._sort_field = field
        self._sort_direction = direction
        return self
    
    def limit(self, n):
        self._limit_val = n
        return self
    
    def _execute(self):
        where_clause, values = _match_filter(self.filter_dict)
        
        query = f"SELECT _row_id, id, data FROM {self.table_name} WHERE {where_clause}"
        
        if self._sort_field:
            direction = "ASC" if self._sort_direction == 1 else "DESC"
            if self._sort_field == "id":
                query += f" ORDER BY id {direction}"
            else:
                query += f" ORDER BY data->>'{self._sort_field}' {direction}"
        
        if self._limit_val:
            query += f" LIMIT {self._limit_val}"
        
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(query, values)
        rows = cur.fetchall()
        cur.close()
        
        results = []
        for row in rows:
            data = row[2] if isinstance(row[2], dict) else json.loads(row[2])
            data["id"] = row[1]
            results.append(data)
        return results
    
    def __iter__(self):
        return iter(self._execute())
    
    def __list__(self):
        return self._execute()


# ========================
# Public Interface 
# ========================

def init_pg_database():
    """Initialize PostgreSQL connection and create tables."""
    try:
        conn = get_connection()
        init_tables()
        logger.info(f"Connected to PostgreSQL database")
        return True
    except Exception as e:
        logger.error(f"Failed to connect to PostgreSQL: {e}")
        return False


def get_pg_collection(name):
    """Get a PgCollection instance for the given collection name."""
    return PgCollection(name)
