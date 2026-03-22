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
- **Database**: PostgreSQL (JSONB) - Migrated from MongoDB
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key
- **Email**: Resend API (OTP emails for 2FA)

## Architecture

### Database: PostgreSQL
- Connection via DATABASE_URL env var
- JSONB adapter (database_postgres.py) provides MongoDB-compatible interface
- Tables: users, shops, products, batches, sales, sale_items, employees, documents, accounts, access_requests, authorized_users, payments, whatsapp_messages, otp_codes, incidents, whitelist, blocked_users, access_attempts, sessions, audit_log
- PostgreSQL managed by supervisor

### Data Isolation (Multi-Tenant)
- Each Owner has a `tenant_id` and `shop_id`
- All data endpoints filter by `shop_id` for non-admin users
- Super Admin / CEO see ALL data (no filter)
- Helper: `get_shop_filter(user)` returns appropriate filter
- Helper: `is_admin_role(user)` checks if user has admin access

### Rôles et Accès (RBAC)
| Rôle | Niveau | Accès |
|------|--------|-------|
| **Super Admin** | Global | CEO Control, IRP, Sécurité, Toutes données |
| **CEO** | Global | Dashboard complet, Toutes données |
| **Owner** | Tenant | Ses boutiques uniquement, pas CEO Control/IRP |
| **Manager** | Boutique | Gestion produits, stock |
| **Cashier** | Limité | POS uniquement |

### Frontend RBAC (DashboardLayout.jsx)
- Menu items filtered by `userRole`
- CEO Control, IRP, Sécurité: `['super_admin']` or `['super_admin', 'ceo']`
- Regular menus: `['super_admin', 'owner', 'ceo', 'manager', 'cashier']`

## Credentials
| Role | Email | Password | Notes |
|:-----|:------|:---------|:------|
| Super Admin | bangalykaba635@gmail.com | admin123 | Full platform access |
| CEO | admin@startup.com | admin123 | Compte démo principal |
| Owner (test) | testowner@example.com | password123 | Isolated boutique |

## Links
- Application: https://startup-manager-pro.preview.emergentagent.com
- Login: https://startup-manager-pro.preview.emergentagent.com/login

## What's Been Implemented

### Session 3 - March 22, 2026
- [x] Tenant Data Isolation - Owners only see their own shop data
- [x] Frontend RBAC - Menus filtered by user role (CEO Control, IRP, Sécurité hidden for owners)
- [x] Registration auto-creates shop + tenant + financial accounts
- [x] Backend Refactoring - Extracted models (models/schemas.py), utils (utils.py), reducing server.py by ~400 lines
- [x] Fixed forgot password logo (BINTRONIX logo in round)
- [x] Restored CEO photos on all auth pages (removed stock photos)
- [x] Reduced gradient blur on auth background images

### Session 2 - March 12, 2026
- [x] PostgreSQL migration complete (from MongoDB)
- [x] "Made with Emergent" watermark fully removed
- [x] Real 2FA OTP emails via Resend API activated
- [x] PostgreSQL managed by supervisor
- [x] Connection resilience (auto-reconnect)

### Session 1
- [x] Authentication (Login, Register, Forgot Password, JWT)
- [x] Dashboard CEO with AI insights
- [x] POS with multi-payment
- [x] Products CRUD, Stock/Batches with QR
- [x] Employees CRUD, RH IA, Marketing IA
- [x] Finance view, Help Center, Security Admin
- [x] CEO Control Center, IRP
- [x] BINTRONIX branding, Random marketing ads

## Code Architecture
```
/app/backend/
├── .env
├── database.py              # Database config (PostgreSQL)
├── database_postgres.py     # PostgreSQL JSONB adapter (PgCollection)
├── security.py              # Access control & security
├── server.py                # FastAPI routes (~2500 lines)
├── models/
│   └── schemas.py           # All Pydantic models
├── utils.py                 # Shared utilities (JWT, OTP, AI, etc.)
├── routes/                  # (Future: split routes here)
└── requirements.txt

/app/frontend/
├── public/
│   ├── assets/              # Logo, CEO photos
│   └── index.html           # Branding CSS/JS
├── src/
│   ├── config/marketingAds.js
│   ├── components/DashboardLayout.jsx  # RBAC sidebar
│   ├── pages/               # All page components
│   ├── lib/api.js           # API client
│   └── App.js               # Main router
└── package.json
```

## Prioritized Backlog

### P1 - High Priority
- [ ] Complete route splitting (move routes from server.py to routes/*.py)
- [ ] Build tenant admin panel (Owner can manage their shop settings)
- [ ] Real payment integrations (Orange Money API, Wave)

### P2 - Medium Priority
- [ ] File upload for product images (Object Storage)
- [ ] Multi-language support
- [ ] Real WhatsApp/SMS integration
- [ ] Shop-to-shop transfers

### P3 - Nice to Have
- [ ] Mobile app (React Native)
- [ ] Real QR code scanner
- [ ] Accounting integration
- [ ] Custom reports & analytics
- [ ] Low stock alerts

## Known Limitations
- **Payments**: Orange Money, Carte, WhatsApp/SMS are SIMULATED
- **2FA Email**: Works with Resend API, falls back to dev OTP display if API key not configured
