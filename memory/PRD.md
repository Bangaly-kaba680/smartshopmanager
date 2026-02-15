# StartupManager Pro - PRD

## Original Problem Statement
Système complet de gestion de startup avec:
- Authentification (Login/Register/Forgot Password/Mode Dark-Light)
- Dashboard CEO avec sidebar navigation et cartes de stats financières
- POS (Point de Vente) pour caissiers
- Gestion des Produits avec QR codes
- Gestion du Stock/Lots avec génération de QR
- Gestion des Employés
- RH IA (génération de documents RH par IA - contrats, attestations de travail/stage)
- Marketing IA (génération de contenu pour Facebook/WhatsApp)
- Vue Finances
- Centre d'Aide avec assistant IA
- Paramètres

## User Personas
1. **CEO/PDG**: Accès complet à toutes les fonctionnalités, génération de documents RH, vue finances
2. **Manager**: Gestion des employés, produits, stock, ventes
3. **Caissier**: Utilisation du POS, création de ventes
4. **Stock Manager**: Gestion du stock et des lots

## Core Requirements
- Interface en français
- Mode sombre/clair
- Responsive design
- Rôles utilisateur avec permissions
- Intégration AI pour génération de documents
- Système de paiements (simulé: Cash, Orange Money, Carte)
- Envoi de reçus (simulé: WhatsApp, SMS)

## Tech Stack
- **Frontend**: React 19, Tailwind CSS, Shadcn UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB ✅ PERSISTANT
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key ✅ FONCTIONNEL
- **Email**: Resend API ✅ FONCTIONNEL

## What's Been Implemented (Feb 15, 2026)

### P1 - Migration MongoDB (COMPLÉTÉ ✅)
- [x] Configuration MongoDB avec indexes
- [x] Données de démo auto-initialisées
- [x] CRUD complet avec persistance
- [x] Sérialisation des documents (_id exclus)
- [x] Collections: users, shops, products, batches, sales, employees, documents, accounts, access_requests, authorized_users, payments, whatsapp_messages

### P2 - Paiements Simulés (COMPLÉTÉ ✅)
- [x] Orange Money - initiation et confirmation (SIMULÉ)
- [x] Paiement par carte (SIMULÉ)
- [x] Paiement en espèces (SIMULÉ)
- [x] Historique des paiements
- [x] WhatsApp receipt (SIMULÉ)
- [x] SMS receipt (SIMULÉ)
- [x] Messages promotionnels WhatsApp (SIMULÉ)

### P3 - Exports de Données (COMPLÉTÉ ✅)
- [x] Export CSV des produits
- [x] Export CSV des employés
- [x] Export PDF des ventes

### Système de Contrôle d'Accès (COMPLÉTÉ ✅)
- [x] Page de demande d'accès pour nouveaux utilisateurs
- [x] Notifications email à l'admin (Resend API)
- [x] Boutons d'action dans l'email (Permanent, 20 Minutes, Refuser)
- [x] Vérification d'accès automatique
- [x] Expiration d'accès temporaire avec countdown
- [x] Page de gestion des accès pour admin

### Intégration AI OpenAI GPT-5.2 (COMPLÉTÉ ✅)
- [x] Génération de contrats de travail
- [x] Génération d'attestations de travail
- [x] Génération d'attestations de stage
- [x] Génération de publicités produits
- [x] Génération d'offres d'emploi
- [x] Assistant IA du centre d'aide
- [x] Insights dashboard avec suggestions IA

### Authentication (COMPLÉTÉ ✅)
- [x] Login page avec compte démo
- [x] Registration avec sélection de rôle
- [x] Forgot password (mock)
- [x] JWT authentication
- [x] Theme toggle (dark/light)

### Dashboard CEO (COMPLÉTÉ ✅)
- [x] 6 cartes de stats (Ventes aujourd'hui, Revenus mensuels, Boutiques, Orange Money, Banque, Cash)
- [x] Graphique des ventes de la semaine
- [x] Graphique des ventes par catégorie
- [x] Liste des ventes récentes
- [x] Insights IA avec auto-refresh

### POS (Point de Vente) (COMPLÉTÉ ✅)
- [x] Grille de produits avec recherche
- [x] Filtres par catégorie
- [x] Panier avec ajout/suppression
- [x] Ajustement des quantités
- [x] Modal de paiement (Cash, Orange Money, Carte)
- [x] Envoi de reçu WhatsApp/SMS (simulé)

### Produits (COMPLÉTÉ ✅)
- [x] Liste avec tableau
- [x] Recherche
- [x] CRUD complet (Ajouter, Modifier, Supprimer)
- [x] Affichage du stock

### Stock/Lots (COMPLÉTÉ ✅)
- [x] Liste des lots avec détails
- [x] Ajout de nouveaux lots
- [x] Génération de QR codes
- [x] Téléchargement de QR codes
- [x] Modification des quantités

### Employés (COMPLÉTÉ ✅)
- [x] Liste des employés
- [x] CRUD complet
- [x] Types de contrat (CDI, CDD, Stage)

### RH IA (COMPLÉTÉ ✅)
- [x] Sélection d'employé
- [x] Génération de contrat de travail IA
- [x] Génération d'attestation de travail IA
- [x] Génération d'attestation de stage IA
- [x] Liste des documents générés
- [x] Signature électronique
- [x] Téléchargement PDF

### Marketing IA (COMPLÉTÉ ✅)
- [x] Création de publicité produit
- [x] Création d'offre d'emploi
- [x] Génération de contenu Facebook/WhatsApp
- [x] Copie dans le presse-papier

### Finances (COMPLÉTÉ ✅)
- [x] Vue des soldes (Cash, Orange Money, Banque)
- [x] Graphique d'évolution
- [x] Répartition des soldes (pie chart)
- [x] Historique des transactions

### Centre d'Aide (COMPLÉTÉ ✅)
- [x] Guides d'utilisation
- [x] Recherche
- [x] Assistant IA avec chat

## Test Results (Feb 15, 2026)
- **Backend**: 96.6% (28/29 tests passed)
- **Frontend**: 100% (all pages working)
- **Test Report**: `/app/test_reports/iteration_2.json`

## Credentials
| Role  | Email               | Password   | Notes                                 |
| :---- | :------------------ | :--------- | :------------------------------------ |
| Admin | `admin@startup.com` | `admin123` | Compte démo principal                 |
| Owner | `bangalykaba635@gmail.com` | N/A | Super-admin (accès automatique)       |

## Prioritized Backlog

### P0 - Critical (DONE ✅)
- [x] Authentication flow
- [x] Dashboard avec stats
- [x] POS functionality
- [x] Products CRUD
- [x] Stock management
- [x] Email notifications (Resend)
- [x] AI Integration (OpenAI GPT-5.2)
- [x] Access control system
- [x] MongoDB persistence
- [x] Payment simulations
- [x] Export functionality

### P1 - High Priority (Future)
- [ ] Real Orange Money integration (via API)
- [ ] Real WhatsApp integration (Twilio/Meta)
- [ ] File upload for product images
- [ ] Multi-language support

### P2 - Medium Priority (Future)
- [ ] Multi-boutique support complet
- [ ] Gestion des promotions
- [ ] Alertes stock faible automatiques
- [ ] Historique des modifications
- [ ] Recherche avancée avec filtres

### P3 - Nice to Have (Future)
- [ ] Application mobile (React Native)
- [ ] Scan QR code réel (camera)
- [ ] Intégration comptabilité
- [ ] Multi-devise
- [ ] Rapports personnalisés

## Known Limitations
- **Payments**: Orange Money, Carte, WhatsApp/SMS sont SIMULÉS (pas connectés aux vraies APIs)
- **AI Contract**: Peut timeout après 30s (autres fonctions IA fonctionnent)

## Architecture

```
/app
├── backend/
│   ├── .env                    # Environment variables
│   ├── database.py             # MongoDB configuration
│   ├── requirements.txt        # Python dependencies
│   ├── server.py               # FastAPI with all endpoints
│   └── tests/
│       └── test_startup_manager.py
└── frontend/
    ├── public/
    ├── src/
    │   ├── components/
    │   │   └── DashboardLayout.jsx
    │   ├── hooks/
    │   │   └── useAutoRefresh.js
    │   ├── lib/
    │   │   └── api.js
    │   ├── pages/
    │   │   ├── AccessControlPage.jsx
    │   │   ├── AccessGatePage.jsx
    │   │   ├── DashboardPage.jsx
    │   │   ├── EmployeesPage.jsx
    │   │   ├── FinancesPage.jsx
    │   │   ├── HelpCenterPage.jsx
    │   │   ├── LoginPage.jsx
    │   │   ├── MarketingIAPage.jsx
    │   │   ├── POSPage.jsx
    │   │   ├── ProductsPage.jsx
    │   │   ├── RHIAPage.jsx
    │   │   ├── SettingsPage.jsx
    │   │   ├── ShopsPage.jsx
    │   │   └── StockPage.jsx
    │   ├── App.js
    │   └── index.css
    └── package.json
```

## API Endpoints Summary

### Authentication
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/forgot-password

### Access Control
- POST /api/access/request
- GET /api/access/check/{email}
- GET /api/access/requests
- GET /api/access/authorized
- PUT /api/access/approve/{request_id}
- PUT /api/access/deny/{request_id}
- GET /api/access/quick-approve/{request_id}/{access_type}
- GET /api/access/quick-deny/{request_id}

### Products & Stock
- GET/POST /api/products
- GET/PUT/DELETE /api/products/{id}
- GET/POST /api/batches
- GET /api/batches/{id}/qr

### Sales
- GET/POST /api/sales

### Employees & Documents
- GET/POST /api/employees
- GET/PUT/DELETE /api/employees/{id}
- GET /api/documents
- PUT /api/documents/{id}/sign
- GET /api/documents/{id}/pdf

### AI Features
- POST /api/ai/contract
- POST /api/ai/attestation-work
- POST /api/ai/attestation-stage
- POST /api/ai/product-ad
- POST /api/ai/job-offer
- POST /api/ai/help
- GET /api/ai/insights/dashboard

### Payments (SIMULATED)
- POST /api/payments/orange/initiate
- POST /api/payments/orange/confirm/{transaction_id}
- POST /api/payments/card
- POST /api/payments/cash
- GET /api/payments/history

### Messaging (SIMULATED)
- POST /api/whatsapp/send-receipt
- POST /api/sms/send-receipt

### Exports
- GET /api/export/sales/pdf
- GET /api/export/products/csv
- GET /api/export/employees/csv

### Dashboard
- GET /api/dashboard/stats
- GET /api/accounts
