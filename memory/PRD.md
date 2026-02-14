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
- **Database**: In-memory (simulation PostgreSQL)
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key

## What's Been Implemented (Feb 14, 2026)

### Authentication
- [x] Login page avec compte démo
- [x] Registration avec sélection de rôle
- [x] Forgot password (mock)
- [x] JWT authentication
- [x] Theme toggle (dark/light)

### Dashboard CEO
- [x] 6 cartes de stats (Ventes aujourd'hui, Revenus mensuels, Boutiques, Orange Money, Banque, Cash)
- [x] Graphique des ventes de la semaine
- [x] Graphique des ventes par catégorie
- [x] Liste des ventes récentes
- [x] Aperçu rapide

### POS (Point de Vente)
- [x] Grille de produits avec recherche
- [x] Filtres par catégorie
- [x] Panier avec ajout/suppression
- [x] Ajustement des quantités
- [x] Modal de paiement (Cash, Orange Money, Carte)
- [x] Envoi de reçu WhatsApp/SMS (mock)

### Produits
- [x] Liste avec tableau
- [x] Recherche
- [x] CRUD complet (Ajouter, Modifier, Supprimer)
- [x] Affichage du stock

### Stock/Lots
- [x] Liste des lots avec détails
- [x] Ajout de nouveaux lots
- [x] Génération de QR codes
- [x] Téléchargement de QR codes
- [x] Modification des quantités

### Employés
- [x] Liste des employés
- [x] CRUD complet
- [x] Types de contrat (CDI, CDD, Stage)

### RH IA
- [x] Sélection d'employé
- [x] Génération de contrat de travail IA
- [x] Génération d'attestation de travail IA
- [x] Génération d'attestation de stage IA
- [x] Liste des documents générés
- [x] Signature électronique
- [x] Téléchargement PDF

### Marketing IA
- [x] Création de publicité produit
- [x] Création d'offre d'emploi
- [x] Génération de contenu Facebook/WhatsApp
- [x] Copie dans le presse-papier

### Finances
- [x] Vue des soldes (Cash, Orange Money, Banque)
- [x] Graphique d'évolution
- [x] Répartition des soldes (pie chart)
- [x] Historique des transactions

### Centre d'Aide
- [x] Guides d'utilisation
- [x] Recherche
- [x] Assistant IA avec chat

### Boutiques
- [x] Liste des boutiques
- [x] Création de nouvelles boutiques

### Paramètres
- [x] Informations profil
- [x] Toggle thème
- [x] Notifications (UI)
- [x] Déconnexion

## Prioritized Backlog

### P0 - Critical (Done)
- [x] Authentication flow
- [x] Dashboard avec stats
- [x] POS functionality
- [x] Products CRUD
- [x] Stock management

### P1 - High Priority
- [ ] Real PostgreSQL database migration
- [ ] Real Orange Money integration
- [ ] Real WhatsApp integration (Twilio/Meta)
- [ ] File upload for product images
- [ ] Export des rapports (PDF, Excel)

### P2 - Medium Priority
- [ ] Multi-boutique support complet
- [ ] Gestion des promotions
- [ ] Alertes stock faible
- [ ] Historique des modifications
- [ ] Recherche avancée avec filtres

### P3 - Nice to Have
- [ ] Application mobile (React Native)
- [ ] Scan QR code réel (camera)
- [ ] Intégration comptabilité
- [ ] Multi-devise
- [ ] Rapports personnalisés

## Next Tasks
1. Tester la génération IA avec un timeout plus long
2. Ajouter des images produits réelles
3. Améliorer le responsive pour mobile
4. Ajouter plus de guides dans le centre d'aide
5. Implémenter l'historique des ventes détaillé
