#!/bin/bash
# Startup script to ensure PostgreSQL is installed and running before backend starts

# Check if postgres user exists (means PostgreSQL is installed)
if ! id -u postgres &>/dev/null; then
    echo "[startup] PostgreSQL not found, installing..."
    apt-get update -qq && apt-get install -y -qq postgresql postgresql-client 2>&1
fi

# Start PostgreSQL via supervisor
supervisorctl start postgresql 2>/dev/null
sleep 3

# Create user and database if they don't exist
su - postgres -c "psql -c \"CREATE USER bintronix WITH PASSWORD 'bintronix2026';\"" 2>/dev/null || true
su - postgres -c "psql -c \"CREATE DATABASE smartshop_saas OWNER bintronix;\"" 2>/dev/null || true
su - postgres -c "psql -c \"ALTER USER bintronix CREATEDB;\"" 2>/dev/null || true

echo "[startup] PostgreSQL is ready"
