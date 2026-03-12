# BINTRONIX - StartupManager Pro SaaS PRD

## Original Problem Statement
Système complet de gestion de startup multi-tenant SaaS avec:
- Architecture Multi-Tenant avec isolation des données
- Authentification 2FA (Double Authentification avec OTP)
- CEO Control Center (Dashboard global pour Super Admin)
- IRP (Incident Response Plan) avec analyse IA
- Dashboard Propriétaire de boutique
- POS (Point de Vente) pour caissiers
- Gestion des Produits avec QR codes
- Gestion du Stock/Lots avec génération de QR
- Gestion des Employés
- RH IA (génération de documents RH par IA)
- Marketing IA (génération de contenu)
- Vue Finances
- Support IA (tickets gérés via agent IA)
- Centre d'Aide avec assistant IA
- Site web BINTRONIX corporate

## Branding
- **Nom Entreprise**: BINTRONIX
- **Slogan**: Building the Future
- **Nom Produit**: StartupManager Pro / SmartShopManager
- **Logo**: /app/frontend/public/assets/bintronix-logo.png
- **Photo CEO**: /app/frontend/public/assets/ceo-photo-2.jpeg

## Tech Stack
- **Frontend**: React 19, Tailwind CSS, Shadcn UI
- **Backend**: FastAPI (Python)
- **Database**: PostgreSQL (JSONB) - Migrated from MongoDB on March 12, 2026
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key
- **Email**: Resend API (OTP emails for 2FA)

## Architecture

### Database: PostgreSQL
- Connection via DATABASE_URL env var
- JSONB adapter (database_postgres.py) provides MongoDB-compatible interface
- Tables: users, shops, products, batches, sales, sale_items, employees, documents, accounts, access_requests, authorized_users, payments, whatsapp_messages, otp_codes, incidents, whitelist, blocked_users, access_attempts, sessions, audit_log
- PostgreSQL managed by supervisor

### Rôles et Accès
| Rôle | Niveau | Accès |
|------|--------|-------|
| **Super Admin** | Global | CEO Control, IRP, Toutes données |
| **Owner** | Tenant | Ses boutiques uniquement |
| **Manager** | Boutique | Gestion produits, stock |
| **Cashier** | Limité | POS uniquement |

## Credentials
| Role | Email | Password | Notes |
|:-----|:------|:---------|:------|
| Admin/CEO | admin@startup.com | admin123 | Compte démo principal |
| Super Admin | bangalykaba635@gmail.com | admin123 | Accès CEO Control Center et IRP |

## Links
- Application: https://startup-manager-pro.preview.emergentagent.com
- Site BINTRONIX: https://startup-manager-pro.preview.emergentagent.com/bintronix
- Inscription 2FA: https://startup-manager-pro.preview.emergentagent.com/register

## What's Been Implemented

### March 12, 2026 - PostgreSQL Migration & Branding Fix
- [x] PostgreSQL migration complete (from MongoDB)
- [x] Database adapter with JSONB support (database_postgres.py)
- [x] "Made with Emergent" watermark fully removed (CSS + JS)
- [x] Marketing ad images replaced with professional stock photos
- [x] Real 2FA OTP emails via Resend API activated
- [x] verify_registration response field fixed (company -> tenant)
- [x] PostgreSQL managed by supervisor for auto-restart
- [x] Connection resilience added (auto-reconnect on dropped connections)

### Previously Completed
- [x] Authentication (Login, Register, Forgot Password, JWT)
- [x] Dashboard CEO with AI insights
- [x] POS (Point de Vente) with multi-payment
- [x] Products CRUD
- [x] Stock/Batches management with QR codes
- [x] Employees CRUD
- [x] RH IA (contract generation, attestations)
- [x] Marketing IA (product ads, job offers)
- [x] Finance view with charts
- [x] Help Center with AI assistant
- [x] Access Control with email notifications
- [x] Security Admin page
- [x] CEO Control Center
- [x] IRP (Incident Response Plan)
- [x] 2FA Registration with OTP
- [x] BINTRONIX branding throughout
- [x] Random marketing ads on auth pages
- [x] Simulated payments (Orange Money, Card, Cash)
- [x] Data exports (CSV, PDF)

## Test Results (March 12, 2026)
- **Backend**: 100% (11/11 tests passed)
- **Frontend**: 100% (all pages working)
- **Test Report**: /app/test_reports/iteration_3.json

## Prioritized Backlog

### P1 - High Priority
- [ ] Frontend RBAC - Hide/disable UI elements based on user role
- [ ] Build complete Tenant Application (product mgmt, stock, sales for shop owners)
- [ ] Refactor backend server.py (2700+ lines) into modules (routes, models, services)

### P2 - Medium Priority
- [ ] Real Orange Money integration (via API)
- [ ] Real WhatsApp integration (Twilio/Meta)
- [ ] File upload for product images
- [ ] Multi-language support
- [ ] Multi-boutique support complet

### P3 - Nice to Have
- [ ] Application mobile (React Native)
- [ ] Scan QR code réel (camera)
- [ ] Intégration comptabilité
- [ ] Multi-devise
- [ ] Rapports personnalisés
- [ ] Alertes stock faible automatiques

## Known Limitations
- **Payments**: Orange Money, Carte, WhatsApp/SMS sont SIMULÉS
- **AI Contract**: Peut timeout après 30s

## Code Architecture
```
/app
├── backend/
│   ├── .env                     # Environment variables
│   ├── database.py              # Database config (uses PostgreSQL)
│   ├── database_postgres.py     # PostgreSQL JSONB adapter
│   ├── security.py              # Access control & security
│   ├── server.py                # FastAPI app (monolithic - needs refactoring)
│   ├── requirements.txt
│   └── tests/
│       └── test_postgres_migration.py
└── frontend/
    ├── public/
    │   ├── assets/              # Logo, photos, stock images
    │   └── index.html           # Includes branding CSS/JS
    ├── src/
    │   ├── config/
    │   │   └── marketingAds.js  # Marketing ads with stock photos
    │   ├── pages/               # All page components
    │   ├── lib/api.js           # API client
    │   └── App.js               # Main router
    └── package.json
```
