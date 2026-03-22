# BINTRONIX - StartupManager Pro SaaS PRD

## Original Problem Statement
Système complet de gestion de startup multi-tenant SaaS avec 3 rôles principaux :
- **Administrateur** : Gère toute la plateforme (utilisateurs, boutiques, abonnements, sécurité)
- **Propriétaire** : Gère sa boutique (produits, stock, employés, ventes, finances)
- **Vendeur** : Opérations quotidiennes (POS, stock, performances)

## Tech Stack
- **Frontend**: React 19, Tailwind CSS, Shadcn UI
- **Backend**: FastAPI (Python)
- **Database**: PostgreSQL (JSONB adapter)
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key
- **Email**: Resend API (2FA OTP)

## Rôles et Accès (RBAC)
| Rôle | Menus | Données |
|------|-------|---------|
| Super Admin | CEO Control, IRP, Gestion Users/Shops, Abonnements, Sécurité + tout | Toutes les données |
| CEO | Dashboard + tout sauf admin | Toutes les données |
| Owner | Dashboard, Produits, Stock, Employés, POS, Retours, Finances, RH/Marketing IA | Ses boutiques uniquement |
| Manager | Dashboard, Produits, Stock, POS, Retours | Sa boutique |
| Seller | Dashboard, Produits, POS, Retours, Mes Performances | Sa boutique (lecture) |
| Cashier | Dashboard, POS, Mes Performances | Sa boutique (POS only) |

## Credentials
| Role | Email | Password |
|:-----|:------|:---------|
| Super Admin | bangalykaba635@gmail.com | admin123 |
| CEO | admin@startup.com | admin123 |
| Owner (test) | testowner@example.com | password123 |

## What's Been Implemented

### Session 3 - March 22, 2026
- [x] **Admin: Gestion Utilisateurs** - CRUD complet (créer, modifier, supprimer, suspendre, réactiver)
- [x] **Admin: Gestion Boutiques** - Liste avec infos propriétaire, activer/désactiver
- [x] **Admin: Plans d'Abonnement** - Gratuit/Professionnel/Premium, CRUD plans
- [x] **Admin: Stats Plateforme** - Total users, shops, revenue, ventes par jour/mois
- [x] **Owner: Analyse Financière** - Revenue/profit par jour et mois, par mode de paiement
- [x] **Owner: Ventes par Vendeur/Produit** - Analyse détaillée des performances
- [x] **Owner: Alertes Stock** - Produits en stock faible avec seuil configurable
- [x] **Owner: Ajout Vendeur** - Crée compte + employé avec permissions (can_sell, can_modify_stock, etc.)
- [x] **Produits: Prix achat/vente** - buy_price + sell_price avec calcul du profit
- [x] **Retours Produits** - Créer, approuver, rejeter avec remise en stock automatique
- [x] **Vendeur: Performances** - Nombre de ventes et revenue (aujourd'hui + total)
- [x] **Vendeur: Produits Disponibles** - Liste avec prix et stock
- [x] Frontend RBAC complet - Menus sidebar filtrés par rôle
- [x] Tenant Data Isolation - Chaque Owner voit uniquement ses données
- [x] Backend refactoring - models/schemas.py + utils.py extraits

### Session 2
- [x] PostgreSQL migration, "Made with Emergent" supprimé, 2FA emails Resend

### Session 1
- [x] Auth, Dashboard, POS, Products, Stock, Employees, RH IA, Marketing IA, Finance, Help, Security, CEO Control, IRP, BINTRONIX branding

## Test Results (March 22, 2026)
- **Backend**: 100% (22/22 tests passed)
- **Frontend**: 100% (all pages working)
- **Test Report**: /app/test_reports/iteration_5.json

## Code Architecture
```
/app/backend/
├── database.py, database_postgres.py (PostgreSQL)
├── models/schemas.py (Pydantic models)
├── utils.py (JWT, OTP, AI, collections, serialization)
├── security.py (Access control)
├── server.py (~3100 lines - routes)
└── tests/

/app/frontend/src/
├── pages/
│   ├── AdminUsersPage.jsx (Admin: gestion utilisateurs)
│   ├── AdminShopsPage.jsx (Admin: gestion boutiques)
│   ├── SubscriptionsPage.jsx (Admin: plans abonnement)
│   ├── ReturnsPage.jsx (Retours produits)
│   ├── SellerPerformancePage.jsx (Vendeur: performances)
│   ├── CEOControlCenter.jsx, IRPPage.jsx
│   ├── DashboardPage.jsx, ProductsPage.jsx, etc.
│   └── LoginPage.jsx, RegisterPage.jsx, ForgotPasswordPage.jsx
├── components/DashboardLayout.jsx (RBAC sidebar)
├── config/marketingAds.js
└── App.js (routes + auth context)
```

## Prioritized Backlog

### P1 - High Priority
- [ ] Enhanced Product page (buy_price/sell_price fields in UI)
- [ ] Enhanced Employee page (permissions toggles in UI)
- [ ] Seller can register sale from POS with their seller account
- [ ] Complete route splitting (server.py still large)

### P2 - Medium Priority
- [ ] Real payment integrations (Orange Money API, Wave, MTN MoMo)
- [ ] File upload for product images / shop logos
- [ ] Multi-language support
- [ ] Seller account creation flow (owner invites seller)
- [ ] Sale cancellation feature

### P3 - Nice to Have
- [ ] Mobile app, Real QR scanner
- [ ] Accounting integration, Custom reports
- [ ] Database backup management UI for admin
- [ ] Real-time notifications (stock alerts)
