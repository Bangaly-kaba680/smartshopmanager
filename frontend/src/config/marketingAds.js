// Marketing ads configuration for SmartShopManager by BINTRONIX
// These ads will be randomly displayed on auth pages

export const marketingAds = [
  {
    id: 1,
    image: "/assets/ceo-photo.jpeg",
    title: "Gérez votre entreprise comme un pro",
    quote: "SmartShopManager a transformé la gestion de mon entreprise. Une plateforme complète et sécurisée.",
    author: "CEO BINTRONIX",
    role: "Fondateur",
    highlight: "Rejoignez +50 entreprises qui nous font confiance",
    gradient: "from-emerald-600/90 via-emerald-800/70 to-slate-900/95"
  },
  {
    id: 2,
    image: "/assets/ceo-photo-2.jpeg",
    title: "POS Intelligent & Rapide",
    quote: "Encaissez vos clients en quelques secondes avec notre système de point de vente moderne et intuitif.",
    author: "SmartShopManager",
    role: "Module POS",
    highlight: "✓ Scan QR • ✓ Multi-paiement • ✓ Reçus automatiques",
    gradient: "from-cyan-600/90 via-blue-800/70 to-slate-900/95"
  },
  {
    id: 3,
    image: "/assets/bintronix-logo.png",
    title: "Intelligence Artificielle Intégrée",
    quote: "Notre IA génère automatiquement vos contrats RH, vos campagnes marketing et analyse vos ventes.",
    author: "BINTRONIX AI",
    role: "Technologie de pointe",
    highlight: "🤖 RH IA • 📢 Marketing IA • 📊 Analytics IA",
    gradient: "from-purple-600/90 via-indigo-800/70 to-slate-900/95",
    isLogo: true
  },
  {
    id: 4,
    image: "/assets/ceo-photo.jpeg",
    title: "Gestion Multi-Boutiques",
    quote: "Gérez toutes vos boutiques depuis un seul tableau de bord. Vision globale, contrôle total.",
    author: "SmartShopManager Pro",
    role: "Enterprise Edition",
    highlight: "📍 Plusieurs sites • 👥 Équipes multiples • 📈 Stats consolidées",
    gradient: "from-orange-600/90 via-red-800/70 to-slate-900/95"
  },
  {
    id: 5,
    image: "/assets/ceo-photo-2.jpeg",
    title: "Support 24/7 Garanti",
    quote: "Notre équipe est disponible à tout moment pour vous accompagner. Votre succès est notre priorité.",
    author: "Support BINTRONIX",
    role: "Service Client",
    highlight: "💬 Chat • 📧 Email • 📞 Téléphone • 🎓 Formation",
    gradient: "from-teal-600/90 via-green-800/70 to-slate-900/95"
  },
  {
    id: 6,
    image: "/assets/bintronix-logo.png",
    title: "Sécurité de Niveau Bancaire",
    quote: "Vos données sont protégées avec un chiffrement de niveau bancaire et une authentification 2FA.",
    author: "BINTRONIX Security",
    role: "Protection maximale",
    highlight: "🔐 2FA • 🛡️ Chiffrement • 📋 Audit complet",
    gradient: "from-slate-700/90 via-slate-800/70 to-slate-900/95",
    isLogo: true
  },
  {
    id: 7,
    image: "/assets/ceo-photo.jpeg",
    title: "Rapports & Analyses",
    quote: "Prenez des décisions éclairées avec nos rapports détaillés et nos analyses en temps réel.",
    author: "SmartShopManager",
    role: "Business Intelligence",
    highlight: "📊 Dashboards • 📈 Tendances • 💰 Profits",
    gradient: "from-yellow-600/90 via-amber-800/70 to-slate-900/95"
  },
  {
    id: 8,
    image: "/assets/ceo-photo-2.jpeg",
    title: "Essai Gratuit 14 Jours",
    quote: "Testez toutes les fonctionnalités sans engagement. Pas de carte bancaire requise.",
    author: "Offre Spéciale",
    role: "Démarrez maintenant",
    highlight: "🎁 Gratuit • ⚡ Activation immédiate • 🚀 Toutes fonctions",
    gradient: "from-pink-600/90 via-rose-800/70 to-slate-900/95"
  }
];

// Get random ad (excluding the first one which is fixed for login)
export const getRandomAd = (excludeIds = []) => {
  const availableAds = marketingAds.filter(ad => !excludeIds.includes(ad.id));
  const randomIndex = Math.floor(Math.random() * availableAds.length);
  return availableAds[randomIndex];
};

// Get fixed ad for login page (always the first one)
export const getLoginAd = () => marketingAds[0];

// Get random ad for other pages
export const getRegisterAd = () => getRandomAd([1]); // Exclude login ad
export const getForgotPasswordAd = () => getRandomAd([1]); // Exclude login ad

export default marketingAds;
