import React, { useState, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  FileText, Download, Copy, Linkedin, Twitter, Facebook, 
  Instagram, Presentation, Building2, FileSignature, 
  Globe, CheckCircle, Sparkles, Image
} from 'lucide-react';
import { toast } from 'sonner';

const BrandAssetsPage = () => {
  const [companyInfo, setCompanyInfo] = useState({
    name: 'BINTRONIX',
    slogan: 'Building the Future',
    email: 'contact@bintronix.com',
    phone: '+224 XX XX XX XX',
    address: 'Conakry, Guinée',
    website: 'www.bintronix.com',
    founder: 'Votre Nom',
    position: 'CEO & Fondateur'
  });

  // Document templates
  const documentTemplates = {
    letterhead: `
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║     [LOGO BINTRONIX]                                        ║
║                                                              ║
║     BINTRONIX                                               ║
║     Building the Future                                      ║
║                                                              ║
║     ─────────────────────────────────────────────────────   ║
║                                                              ║
║     ${companyInfo.address}                                   ║
║     ${companyInfo.email}                                     ║
║     ${companyInfo.phone}                                     ║
║     ${companyInfo.website}                                   ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║     Conakry, le [DATE]                                       ║
║                                                              ║
║     Objet: [OBJET DE LA LETTRE]                             ║
║                                                              ║
║     Madame, Monsieur,                                        ║
║                                                              ║
║     [CONTENU DE LA LETTRE]                                   ║
║                                                              ║
║                                                              ║
║                                                              ║
║     Cordialement,                                            ║
║                                                              ║
║     ${companyInfo.founder}                                   ║
║     ${companyInfo.position}                                  ║
║     BINTRONIX                                                ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
    `,
    invoice: `
┌─────────────────────────────────────────────────────────────┐
│                        FACTURE                               │
│                                                              │
│  BINTRONIX                           Facture N°: [NUMERO]   │
│  Building the Future                 Date: [DATE]           │
│                                                              │
│  ${companyInfo.address}                                      │
│  ${companyInfo.email}                                        │
│  ${companyInfo.phone}                                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  FACTURER À:                                                 │
│  [NOM CLIENT]                                               │
│  [ADRESSE CLIENT]                                           │
│  [EMAIL CLIENT]                                             │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  Description                    Qté    Prix     Total       │
├─────────────────────────────────────────────────────────────┤
│  [DESCRIPTION]                  [X]    [XXX]    [XXXX]      │
│  [DESCRIPTION]                  [X]    [XXX]    [XXXX]      │
├─────────────────────────────────────────────────────────────┤
│                                        Sous-total: [XXXX]   │
│                                        TVA (18%):  [XXXX]   │
│                                        TOTAL:      [XXXX]   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Conditions: Paiement à 30 jours                            │
│  Modes: Orange Money, Wave, Virement bancaire               │
│                                                              │
│  Merci de votre confiance!                                  │
│  BINTRONIX - Building the Future                            │
└─────────────────────────────────────────────────────────────┘
    `,
    contract: `
════════════════════════════════════════════════════════════════
                    CONTRAT DE SERVICE
                        BINTRONIX
                   Building the Future
════════════════════════════════════════════════════════════════

ENTRE LES SOUSSIGNÉS:

BINTRONIX, entreprise de technologie
Représentée par: ${companyInfo.founder}, ${companyInfo.position}
Siège social: ${companyInfo.address}
Email: ${companyInfo.email}
Ci-après dénommée "Le Prestataire"

ET

[NOM DU CLIENT]
Représenté par: [REPRÉSENTANT]
Adresse: [ADRESSE]
Ci-après dénommé "Le Client"

────────────────────────────────────────────────────────────────

ARTICLE 1 - OBJET DU CONTRAT
Le présent contrat a pour objet de définir les conditions dans 
lesquelles le Prestataire fournira au Client les services suivants:
[DESCRIPTION DES SERVICES]

ARTICLE 2 - DURÉE
Le présent contrat est conclu pour une durée de [DURÉE] à compter 
de la date de signature.

ARTICLE 3 - PRIX ET MODALITÉS DE PAIEMENT
Le prix des services est fixé à [MONTANT] GNF.
Paiement: [CONDITIONS]

ARTICLE 4 - CONFIDENTIALITÉ
Les parties s'engagent à garder confidentielles toutes les 
informations échangées dans le cadre de ce contrat.

────────────────────────────────────────────────────────────────

Fait à Conakry, le [DATE]
En deux exemplaires originaux

Le Prestataire                    Le Client
BINTRONIX                         [NOM CLIENT]


_________________________         _________________________
${companyInfo.founder}            [REPRÉSENTANT]
${companyInfo.position}


                    BINTRONIX - Building the Future
════════════════════════════════════════════════════════════════
    `
  };

  // Social media templates
  const socialTemplates = {
    linkedin: {
      bio: `🚀 ${companyInfo.name} | ${companyInfo.slogan}\n\n💼 Entreprise technologique guinéenne spécialisée dans les solutions de gestion d'entreprise.\n\n🎯 Notre mission: Démocratiser l'accès aux technologies de pointe pour les entrepreneurs africains.\n\n📍 ${companyInfo.address}\n🌐 ${companyInfo.website}\n📧 ${companyInfo.email}`,
      post: `🎉 Nouvelle mise à jour de StartupManager Pro!\n\nNous sommes fiers d'annoncer [ANNONCE].\n\n✅ [FEATURE 1]\n✅ [FEATURE 2]\n✅ [FEATURE 3]\n\n#BINTRONIX #TechAfrica #Innovation #StartupManager\n\n${companyInfo.name} - ${companyInfo.slogan}`
    },
    twitter: {
      bio: `🚀 ${companyInfo.name} | ${companyInfo.slogan} | Solutions tech innovantes pour l'Afrique 🌍 | 📍 Guinée`,
      post: `🚀 [ANNONCE]\n\n${companyInfo.name} continue d'innover avec [FEATURE]!\n\n#TechAfrica #BINTRONIX #Innovation`
    },
    facebook: {
      bio: `${companyInfo.name} - ${companyInfo.slogan}\n\nEntreprise technologique guinéenne créant des solutions innovantes pour les entreprises africaines.\n\n📍 ${companyInfo.address}\n📧 ${companyInfo.email}\n📞 ${companyInfo.phone}`,
      post: `🎯 ${companyInfo.name} présente [PRODUIT]!\n\n[DESCRIPTION]\n\nAvantages:\n✨ [AVANTAGE 1]\n✨ [AVANTAGE 2]\n✨ [AVANTAGE 3]\n\nContactez-nous pour en savoir plus!\n📧 ${companyInfo.email}\n\n#BINTRONIX #BuildingTheFuture`
    },
    instagram: {
      bio: `🚀 ${companyInfo.name}\n${companyInfo.slogan}\n💼 Tech Solutions\n📍 ${companyInfo.address}\n🔗 ${companyInfo.website}`,
      post: `✨ [TITRE]\n\n[DESCRIPTION]\n\n.\n.\n.\n#BINTRONIX #BuildingTheFuture #TechAfrica #Innovation #Guinee #Startup #Entrepreneur`
    }
  };

  // Pitch deck outline
  const pitchDeckSlides = [
    { title: 'Couverture', content: 'BINTRONIX - Building the Future\nSolutions technologiques pour l\'Afrique' },
    { title: 'Le Problème', content: '• Manque d\'outils de gestion adaptés\n• Solutions existantes trop chères\n• Pas de support local' },
    { title: 'Notre Solution', content: '• StartupManager Pro\n• Interface simple en français\n• Support Orange Money intégré' },
    { title: 'Marché', content: '• 50+ millions de PME en Afrique de l\'Ouest\n• Croissance de 20%/an\n• Digitalisation en cours' },
    { title: 'Produit', content: '• Dashboard CEO\n• POS moderne\n• RH avec IA\n• Marketing automatisé' },
    { title: 'Business Model', content: '• SaaS: 50,000 - 500,000 GNF/mois\n• Commission transactions\n• Services premium' },
    { title: 'Traction', content: '• 50+ entreprises clientes\n• 10,000+ utilisateurs\n• Croissance 30%/mois' },
    { title: 'Équipe', content: 'Fondateur: Expert tech\nCTO: Développement\nCOO: Opérations' },
    { title: 'Demande', content: 'Levée de [MONTANT]\n• 40% Développement\n• 30% Marketing\n• 30% Expansion' },
    { title: 'Contact', content: `${companyInfo.email}\n${companyInfo.phone}\n${companyInfo.website}` }
  ];

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copié!`);
  };

  return (
    <DashboardLayout title="Assets BINTRONIX">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <img src="/assets/bintronix-logo.png" alt="BINTRONIX" className="w-16 h-16 rounded-xl" />
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6 text-emerald-500" />
              Assets de Marque BINTRONIX
            </h1>
            <p className="text-muted-foreground">Documents officiels, réseaux sociaux et pitch investisseurs</p>
          </div>
        </div>

        <Tabs defaultValue="documents" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="documents">
              <FileText className="h-4 w-4 mr-2" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="social">
              <Globe className="h-4 w-4 mr-2" />
              Réseaux Sociaux
            </TabsTrigger>
            <TabsTrigger value="pitch">
              <Presentation className="h-4 w-4 mr-2" />
              Pitch Deck
            </TabsTrigger>
            <TabsTrigger value="brand">
              <Sparkles className="h-4 w-4 mr-2" />
              Structure Marque
            </TabsTrigger>
          </TabsList>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <div className="grid gap-6">
              {Object.entries({
                'En-tête de lettre': documentTemplates.letterhead,
                'Facture': documentTemplates.invoice,
                'Contrat de service': documentTemplates.contract
              }).map(([title, content]) => (
                <Card key={title}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileSignature className="h-5 w-5 text-emerald-500" />
                        {title}
                      </CardTitle>
                      <CardDescription>Template officiel BINTRONIX</CardDescription>
                    </div>
                    <Button onClick={() => copyToClipboard(content, title)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copier
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap font-mono">
                      {content}
                    </pre>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Social Media Tab */}
          <TabsContent value="social">
            <div className="grid md:grid-cols-2 gap-6">
              {[
                { name: 'LinkedIn', icon: Linkedin, color: 'text-blue-600', data: socialTemplates.linkedin },
                { name: 'Twitter/X', icon: Twitter, color: 'text-sky-500', data: socialTemplates.twitter },
                { name: 'Facebook', icon: Facebook, color: 'text-blue-700', data: socialTemplates.facebook },
                { name: 'Instagram', icon: Instagram, color: 'text-pink-600', data: socialTemplates.instagram }
              ].map((platform) => (
                <Card key={platform.name}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <platform.icon className={`h-5 w-5 ${platform.color}`} />
                      {platform.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Bio</Label>
                      <div className="relative mt-2">
                        <Textarea 
                          value={platform.data.bio} 
                          readOnly 
                          className="min-h-[100px] text-sm"
                        />
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="absolute top-2 right-2"
                          onClick={() => copyToClipboard(platform.data.bio, `Bio ${platform.name}`)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Post Template</Label>
                      <div className="relative mt-2">
                        <Textarea 
                          value={platform.data.post} 
                          readOnly 
                          className="min-h-[120px] text-sm"
                        />
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="absolute top-2 right-2"
                          onClick={() => copyToClipboard(platform.data.post, `Post ${platform.name}`)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Pitch Deck Tab */}
          <TabsContent value="pitch">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Presentation className="h-5 w-5 text-emerald-500" />
                  Structure du Pitch Deck BINTRONIX
                </CardTitle>
                <CardDescription>10 slides pour convaincre les investisseurs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {pitchDeckSlides.map((slide, idx) => (
                    <div 
                      key={idx}
                      className="p-4 rounded-xl border bg-card hover:border-emerald-500/50 transition-colors"
                    >
                      <Badge className="mb-2 bg-emerald-500/20 text-emerald-600">
                        Slide {idx + 1}
                      </Badge>
                      <h4 className="font-bold text-sm mb-2">{slide.title}</h4>
                      <p className="text-xs text-muted-foreground whitespace-pre-line">
                        {slide.content}
                      </p>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  <h4 className="font-bold text-emerald-600 mb-2">💡 Conseils pour le pitch</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Présentez le problème avant la solution</li>
                    <li>• Montrez des chiffres concrets (traction, marché)</li>
                    <li>• Terminez par une demande claire (montant, utilisation)</li>
                    <li>• Utilisez le logo BINTRONIX sur chaque slide</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Brand Structure Tab */}
          <TabsContent value="brand">
            <div className="grid gap-6">
              {/* Brand Identity */}
              <Card>
                <CardHeader>
                  <CardTitle>Identité de Marque</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <h4 className="font-bold mb-4">Logo Principal</h4>
                      <div className="flex items-center gap-4 p-6 bg-slate-900 rounded-xl">
                        <img src="/assets/bintronix-logo.png" alt="BINTRONIX" className="w-24 h-24 rounded-xl" />
                        <div className="text-white">
                          <p className="text-2xl font-bold text-emerald-400">BINTRONIX</p>
                          <p className="text-slate-400">Building the Future</p>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-bold mb-4">Couleurs Officielles</h4>
                      <div className="grid grid-cols-4 gap-2">
                        <div className="text-center">
                          <div className="w-full h-16 rounded-lg bg-emerald-500 mb-2"></div>
                          <p className="text-xs">#10B981</p>
                        </div>
                        <div className="text-center">
                          <div className="w-full h-16 rounded-lg bg-cyan-500 mb-2"></div>
                          <p className="text-xs">#06B6D4</p>
                        </div>
                        <div className="text-center">
                          <div className="w-full h-16 rounded-lg bg-slate-900 mb-2"></div>
                          <p className="text-xs">#0F172A</p>
                        </div>
                        <div className="text-center">
                          <div className="w-full h-16 rounded-lg bg-yellow-500 mb-2"></div>
                          <p className="text-xs">#EAB308</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Brand Architecture */}
              <Card>
                <CardHeader>
                  <CardTitle>Architecture de Marque</CardTitle>
                  <CardDescription>Structure BINTRONIX et ses produits</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Parent Brand */}
                    <div className="p-6 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 rounded-xl border border-emerald-500/20">
                      <div className="flex items-center gap-4 mb-4">
                        <img src="/assets/bintronix-logo.png" alt="BINTRONIX" className="w-12 h-12 rounded-lg" />
                        <div>
                          <h3 className="text-xl font-bold text-emerald-500">BINTRONIX</h3>
                          <p className="text-sm text-muted-foreground">Marque Mère - Building the Future</p>
                        </div>
                      </div>
                      
                      {/* Product Brands */}
                      <div className="grid md:grid-cols-3 gap-4 mt-6">
                        {[
                          { name: 'StartupManager Pro', desc: 'Gestion d\'entreprise', status: 'Actif' },
                          { name: 'BINTRONIX Cloud', desc: 'Infrastructure', status: 'Bientôt' },
                          { name: 'BINTRONIX Pay', desc: 'Paiements', status: 'Bientôt' }
                        ].map((product, idx) => (
                          <div key={idx} className="p-4 bg-card rounded-lg border flex items-center gap-3">
                            <div className="w-2 h-12 rounded-full bg-gradient-to-b from-emerald-500 to-cyan-500"></div>
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-xs text-muted-foreground">{product.desc}</p>
                              <Badge variant={product.status === 'Actif' ? 'default' : 'secondary'} className="mt-1 text-xs">
                                {product.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Usage Guidelines */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                        <h4 className="font-bold text-green-600 mb-2 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          À faire
                        </h4>
                        <ul className="text-sm space-y-1 text-muted-foreground">
                          <li>✓ Utiliser le logo sur fond sombre</li>
                          <li>✓ Maintenir les proportions du logo</li>
                          <li>✓ Associer "BINTRONIX" aux produits</li>
                          <li>✓ Utiliser les couleurs officielles</li>
                        </ul>
                      </div>
                      <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                        <h4 className="font-bold text-red-600 mb-2">✗ À éviter</h4>
                        <ul className="text-sm space-y-1 text-muted-foreground">
                          <li>✗ Modifier les couleurs du logo</li>
                          <li>✗ Déformer le logo</li>
                          <li>✗ Utiliser d'autres polices</li>
                          <li>✗ Omettre "Building the Future"</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default BrandAssetsPage;
