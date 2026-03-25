#!/bin/bash
# Auto-install and start PostgreSQL - handles container restarts

# Install PostgreSQL if postgres user doesn't exist
if ! id -u postgres &>/dev/null; then
    echo "[postgres-start] Installing PostgreSQL..."
    apt-get update -qq 2>/dev/null
    apt-get install -y -qq postgresql postgresql-client 2>/dev/null
fi

# Ensure data directory has correct ownership
chown -R postgres:postgres /var/lib/postgresql/15/main 2>/dev/null
chown -R postgres:postgres /var/run/postgresql 2>/dev/null

# Create run directory if missing
mkdir -p /var/run/postgresql
chown postgres:postgres /var/run/postgresql

# Start PostgreSQL in foreground (supervisor needs this)
echo "[postgres-start] Starting PostgreSQL..."
su - postgres -c "/usr/lib/postgresql/15/bin/postgres -D /var/lib/postgresql/15/main -c config_file=/etc/postgresql/15/main/postgresql.conf" &
PG_PID=$!

# Wait for PostgreSQL to be ready
for i in $(seq 1 15); do
    if su - postgres -c "pg_isready" &>/dev/null; then
        echo "[postgres-start] PostgreSQL is ready"
        break
    fi
    sleep 1
done

# Create user and database if they don't exist
su - postgres -c "psql -tc \"SELECT 1 FROM pg_roles WHERE rolname='bintronix'\"" 2>/dev/null | grep -q 1 || \
    su - postgres -c "psql -c \"CREATE USER bintronix WITH PASSWORD 'bintronix2026';\"" 2>/dev/null
su - postgres -c "psql -tc \"SELECT 1 FROM pg_database WHERE datname='smartshop_saas'\"" 2>/dev/null | grep -q 1 || \
    su - postgres -c "psql -c \"CREATE DATABASE smartshop_saas OWNER bintronix;\"" 2>/dev/null
su - postgres -c "psql -c \"ALTER USER bintronix CREATEDB;\"" 2>/dev/null

echo "[postgres-start] Database setup complete"

# Wait for PostgreSQL process (keeps supervisor happy)
wait $PG_PID
