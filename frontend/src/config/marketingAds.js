// Marketing ads configuration for SmartShopManager by BINTRONIX
// Utilise les photos du CEO sur toutes les pages auth

export const marketingAds = [
  {
    id: 1,
    image: "/assets/ceo-photo-2.jpeg",
    title: "Gérez votre entreprise comme un pro",
    quote: "SmartShopManager a transformé la gestion de mon entreprise. Une plateforme complète et sécurisée.",
    author: "CEO BINTRONIX",
    role: "Fondateur",
    highlight: "Rejoignez +50 entreprises qui nous font confiance",
    gradient: "from-black/40 via-transparent to-black/60"
  },
  {
    id: 2,
    image: "/assets/ceo-photo-2.jpeg",
    title: "POS Intelligent & Rapide",
    quote: "Encaissez vos clients en quelques secondes avec notre système de point de vente moderne et intuitif.",
    author: "SmartShopManager",
    role: "Module POS",
    highlight: "Scan QR - Multi-paiement - Reçus automatiques",
    gradient: "from-black/40 via-transparent to-black/60"
  },
  {
    id: 3,
    image: "/assets/ceo-photo-2.jpeg",
    title: "Intelligence Artificielle Intégrée",
    quote: "Notre IA génère automatiquement vos contrats RH, vos campagnes marketing et analyse vos ventes.",
    author: "BINTRONIX AI",
    role: "Technologie de pointe",
    highlight: "RH IA - Marketing IA - Analytics IA",
    gradient: "from-black/40 via-transparent to-black/60"
  },
  {
    id: 4,
    image: "/assets/ceo-photo-2.jpeg",
    title: "Gestion Multi-Boutiques",
    quote: "Gérez toutes vos boutiques depuis un seul tableau de bord. Vision globale, contrôle total.",
    author: "SmartShopManager Pro",
    role: "Enterprise Edition",
    highlight: "Plusieurs sites - Équipes multiples - Stats consolidées",
    gradient: "from-black/40 via-transparent to-black/60"
  },
  {
    id: 5,
    image: "/assets/ceo-photo-2.jpeg",
    title: "Support 24/7 Garanti",
    quote: "Notre équipe est disponible à tout moment pour vous accompagner. Votre succès est notre priorité.",
    author: "Support BINTRONIX",
    role: "Service Client",
    highlight: "Chat - Email - Téléphone - Formation",
    gradient: "from-black/40 via-transparent to-black/60"
  },
  {
    id: 6,
    image: "/assets/ceo-photo-2.jpeg",
    title: "Sécurité de Niveau Bancaire",
    quote: "Vos données sont protégées avec un chiffrement de niveau bancaire et une authentification 2FA.",
    author: "BINTRONIX Security",
    role: "Protection maximale",
    highlight: "2FA - Chiffrement - Audit complet",
    gradient: "from-black/40 via-transparent to-black/60"
  },
  {
    id: 7,
    image: "/assets/ceo-photo-2.jpeg",
    title: "Rapports & Analyses",
    quote: "Prenez des décisions éclairées avec nos rapports détaillés et nos analyses en temps réel.",
    author: "SmartShopManager",
    role: "Business Intelligence",
    highlight: "Dashboards - Tendances - Profits",
    gradient: "from-black/40 via-transparent to-black/60"
  },
  {
    id: 8,
    image: "/assets/ceo-photo-2.jpeg",
    title: "Essai Gratuit 14 Jours",
    quote: "Testez toutes les fonctionnalités sans engagement. Pas de carte bancaire requise.",
    author: "Offre Spéciale",
    role: "Démarrez maintenant",
    highlight: "Gratuit - Activation immédiate - Toutes fonctions",
    gradient: "from-black/40 via-transparent to-black/60"
  }
];

// Get random ad (excluding specified ids)
export const getRandomAd = (excludeIds = []) => {
  const availableAds = marketingAds.filter(ad => !excludeIds.includes(ad.id));
  const randomIndex = Math.floor(Math.random() * availableAds.length);
  return availableAds[randomIndex];
};

// Get fixed ad for login page (always the first one)
export const getLoginAd = () => marketingAds[0];

// Get random ad for other pages
export const getRegisterAd = () => getRandomAd([1]);
export const getForgotPasswordAd = () => getRandomAd([1]);

export default marketingAds;
