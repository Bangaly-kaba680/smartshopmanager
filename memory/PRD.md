# BINTRONIX - StartupManager Pro SaaS PRD

## Original Problem Statement
Systeme complet de gestion de startup multi-tenant SaaS avec isolation stricte des donnees par entreprise.
6 roles avec dashboards separes, sans melange de fonctions.

## Tech Stack
- Frontend: React 19, Tailwind CSS, Shadcn UI
- Backend: FastAPI (Python)
- Database: PostgreSQL (JSONB adapter)
- AI: OpenAI GPT-5.2 via Emergent LLM Key
- Email: Resend API (2FA OTP)
- QR: qrcode + Pillow (auto-generation)

## Roles & Dashboards

| Role | Dashboard | Acces |
|------|-----------|-------|
| Fondateur (super_admin) | Vue Plateforme strategique | Users, Boutiques, Abonnements, Securite, CEO Control, IRP |
| Proprietaire (owner/ceo) | Dashboard strategique boutique | Produits, Stock, Employes, Ventes, Finances, Retours, Approbations |
| Manager | Supervision sans vente | Produits, Stock, Approbations, Employes, Retours |
| Vendeur (seller) | POS ventes | Ventes POS, Produits, Retours, Performances |
| Caissier (cashier) | Caisse | POS, Performances |
| Gestionnaire Stock (stock_manager) | Gestion stock | Stock, Produits (modifs soumises a approbation) |

## Workflow d'approbation stock
1. Stock Manager cree demande (action + quantite + raison)
2. Manager/Owner approuve ou rejette
3. Si approuve: stock mis a jour automatiquement
4. Owner voit tout dans le journal d'activite (qui, quoi, quand, approuve par qui)

## QR Code
- Auto-genere a la creation de chaque produit (base64 PNG)
- Affiche dans le tableau produits
- Imprimable via dialog (format etiquette)
- Scannable (endpoint public /api/products/{id}/qr-scan)

## Credentials
| Role | Email | Password |
|:-----|:------|:---------|
| Fondateur | bangalykaba635@gmail.com | admin123 |
| CEO/Owner | admin@startup.com | admin123 |
| Manager | manager@test.com | changeme123 |
| Gest. Stock | stock@test.com | changeme123 |
| Vendeur | vendeur@test.com | changeme123 |
| Caissier | caissier@test.com | changeme123 |

## Completed Features

### Session 5 - March 25, 2026
- [x] **Phase 1: Multi-tenancy + Role management** - Owner creates employees with 4 roles (manager, seller, cashier, stock_manager) via dedicated endpoints
- [x] **Phase 2: 5 Dashboards separes** - Owner (strategique), Manager (supervision+approvals), Seller (POS), Cashier (caisse), Stock Manager (stock+demandes)
- [x] **Phase 3: QR Code automatique** - Auto-generation a la creation, affichage, impression, scan
- [x] **Phase 4: Workflow approbation stock** - Stock Manager demande → Manager approuve → Stock mis a jour + audit trail
- [x] **Phase 5: Audit trail complet** - Journal d'activite (creation employes, ventes, approbations stock, etc.)
- [x] **Products updated** - Prix achat/vente, QR code, colonnes tableau mises a jour
- [x] **Sidebar strictement filtre par role** - Chaque role voit uniquement ses menus

### Session 4 - March 23, 2026
- [x] P0: Separation dashboards Fondateur (strategique) vs Owner (operationnel)
- [x] SuperAdminDashboard, OwnerDashboard, SellerDashboard

### Session 3
- [x] Admin CRUD, Stats Plateforme, Abonnements, Finances, Retours, Performances vendeur, RBAC complet

### Session 2
- [x] PostgreSQL migration, 2FA emails Resend

### Session 1
- [x] Auth, Dashboard, POS, Products, Stock, Employees, RH IA, Marketing IA, Finance, Help, Security

## Test Results (March 25, 2026)
- **Backend**: 100% (22/22 tests)
- **Frontend**: 100% (all features)
- **Report**: /app/test_reports/iteration_7.json

## API Endpoints

### Employee Management (Owner)
- POST /api/owner/employees - Create with role
- GET /api/owner/employees - List all
- PUT /api/owner/employees/{id} - Update
- DELETE /api/owner/employees/{id} - Delete
- POST /api/owner/employees/{id}/block - Block
- POST /api/owner/employees/{id}/activate - Activate

### Stock Approval
- POST /api/stock-requests - Create request (stock_manager)
- GET /api/stock-requests - List (optional ?status=pending)
- POST /api/stock-requests/{id}/approve - Manager approves
- POST /api/stock-requests/{id}/reject - Manager rejects

### QR Code
- GET /api/products/{id}/qr-print - Printable QR
- GET /api/products/{id}/qr-scan - Scan (public)

### Audit
- GET /api/owner/activity-log - Activity log

## Backlog

### P1 - High
- [ ] Owner can change employee permissions (granular toggles UI)
- [ ] Real-time notifications for stock alerts
- [ ] Backend route splitting (server.py → routes/)
- [ ] Manager view employees under them

### P2 - Medium
- [ ] Real payment integrations (Orange Money API, Wave, MTN MoMo)
- [ ] File upload for product images / shop logos
- [ ] Multi-language support
- [ ] Sale cancellation feature
- [ ] Export reports (PDF/CSV)

### P3 - Nice to Have
- [ ] Mobile app, Real QR scanner camera
- [ ] Accounting integration
- [ ] Database backup management UI
- [ ] WhatsApp real integration
