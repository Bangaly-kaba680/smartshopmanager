import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Rocket, Globe, Users, Briefcase, Award, ArrowRight, 
  CheckCircle, Mail, Phone, MapPin, Linkedin, Twitter, 
  Facebook, Instagram, ChevronDown, Star, Zap, Shield,
  TrendingUp, Building2, Code, Lightbulb, Target, Heart
} from 'lucide-react';

const BintronixWebsite = () => {
  const [activeSection, setActiveSection] = useState('home');

  const products = [
    {
      name: 'StartupManager Pro',
      description: 'Solution complète de gestion d\'entreprise avec IA intégrée',
      features: ['Dashboard CEO', 'POS', 'RH IA', 'Marketing IA', 'Finances'],
      status: 'Production',
      link: '/login'
    },
    {
      name: 'BINTRONIX Cloud',
      description: 'Infrastructure cloud sécurisée pour entreprises africaines',
      features: ['Hébergement', 'Base de données', 'CDN', 'Sécurité'],
      status: 'Bientôt',
      link: '#'
    },
    {
      name: 'BINTRONIX Pay',
      description: 'Passerelle de paiement multi-devises (Orange Money, Wave, Carte)',
      features: ['Mobile Money', 'Cartes', 'Crypto', 'API'],
      status: 'Bientôt',
      link: '#'
    }
  ];

  const stats = [
    { value: '50+', label: 'Entreprises clientes' },
    { value: '10K+', label: 'Utilisateurs actifs' },
    { value: '99.9%', label: 'Disponibilité' },
    { value: '24/7', label: 'Support' }
  ];

  const team = [
    { name: 'Direction', role: 'Leadership & Vision stratégique' },
    { name: 'Développement', role: 'Ingénierie logicielle & IA' },
    { name: 'Design', role: 'UX/UI & Expérience utilisateur' },
    { name: 'Commercial', role: 'Ventes & Partenariats' }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-lg border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img 
                src="/assets/bintronix-logo.png" 
                alt="BINTRONIX" 
                className="h-10 w-10 rounded-lg object-cover"
              />
              <div>
                <span className="font-bold text-lg text-emerald-400">BINTRONIX</span>
                <p className="text-[10px] text-slate-400 -mt-1">Building the Future</p>
              </div>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#home" className="text-sm text-slate-300 hover:text-emerald-400 transition">Accueil</a>
              <a href="#products" className="text-sm text-slate-300 hover:text-emerald-400 transition">Produits</a>
              <a href="#about" className="text-sm text-slate-300 hover:text-emerald-400 transition">À propos</a>
              <a href="#contact" className="text-sm text-slate-300 hover:text-emerald-400 transition">Contact</a>
            </div>

            <div className="flex items-center gap-3">
              <Link to="/login">
                <Button variant="outline" size="sm" className="border-emerald-500 text-emerald-400 hover:bg-emerald-500/10">
                  Connexion
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm" className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:opacity-90">
                  Démarrer
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/10"></div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-6 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              🚀 Entreprise Tech Guinéenne
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                BINTRONIX
              </span>
            </h1>
            
            <p className="text-2xl md:text-3xl font-light text-slate-300 mb-4">
              Building the Future
            </p>
            
            <p className="text-lg text-slate-400 mb-8 max-w-2xl mx-auto">
              Nous créons des solutions technologiques innovantes pour transformer 
              les entreprises africaines et les propulser vers l'excellence digitale.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/login">
                <Button size="lg" className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:opacity-90 text-lg px-8">
                  Découvrir nos produits
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <a href="#about">
                <Button size="lg" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800 text-lg px-8">
                  En savoir plus
                </Button>
              </a>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20">
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
                <p className="text-3xl md:text-4xl font-bold text-emerald-400">{stat.value}</p>
                <p className="text-sm text-slate-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="py-20 px-4 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
              Nos Solutions
            </Badge>
            <h2 className="text-4xl font-bold mb-4">Produits BINTRONIX</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Des solutions technologiques conçues pour répondre aux besoins 
              spécifiques des entreprises africaines.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {products.map((product, idx) => (
              <Card key={idx} className="bg-slate-900 border-slate-800 hover:border-emerald-500/50 transition-all duration-300 group">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-emerald-500/10 rounded-xl">
                      <Rocket className="h-6 w-6 text-emerald-400" />
                    </div>
                    <Badge variant={product.status === 'Production' ? 'default' : 'secondary'} 
                           className={product.status === 'Production' ? 'bg-emerald-500' : 'bg-slate-700'}>
                      {product.status}
                    </Badge>
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-2">{product.name}</h3>
                  <p className="text-slate-400 text-sm mb-4">{product.description}</p>
                  
                  <div className="space-y-2 mb-6">
                    {product.features.map((feature, fidx) => (
                      <div key={fidx} className="flex items-center gap-2 text-sm text-slate-300">
                        <CheckCircle className="h-4 w-4 text-emerald-400" />
                        {feature}
                      </div>
                    ))}
                  </div>

                  {product.status === 'Production' ? (
                    <Link to={product.link}>
                      <Button className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:opacity-90">
                        Accéder
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  ) : (
                    <Button disabled className="w-full bg-slate-800 text-slate-500">
                      Bientôt disponible
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <Badge className="mb-4 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                À propos de nous
              </Badge>
              <h2 className="text-4xl font-bold mb-6">
                Qui est <span className="text-emerald-400">BINTRONIX</span> ?
              </h2>
              <p className="text-slate-400 mb-6 text-lg">
                BINTRONIX est une entreprise technologique guinéenne fondée avec la vision 
                de créer des solutions innovantes adaptées aux réalités du marché africain.
              </p>
              <p className="text-slate-400 mb-8">
                Notre mission est de démocratiser l'accès aux technologies de pointe pour 
                permettre aux entrepreneurs africains de gérer et développer leurs entreprises 
                avec les mêmes outils que les grandes multinationales.
              </p>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Target, text: 'Vision claire' },
                  { icon: Lightbulb, text: 'Innovation continue' },
                  { icon: Shield, text: 'Sécurité maximale' },
                  { icon: Heart, text: 'Focus client' }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50">
                    <item.icon className="h-5 w-5 text-emerald-400" />
                    <span className="text-sm text-slate-300">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-3xl blur-xl"></div>
              <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-8">
                <img 
                  src="/assets/bintronix-logo.png" 
                  alt="BINTRONIX" 
                  className="w-32 h-32 mx-auto mb-6 rounded-2xl"
                />
                <h3 className="text-2xl font-bold text-center text-emerald-400 mb-2">BINTRONIX</h3>
                <p className="text-center text-slate-400 mb-6">Building the Future</p>
                
                <div className="space-y-4">
                  {team.map((member, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-3 rounded-lg bg-slate-800/50">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <Users className="h-5 w-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{member.name}</p>
                        <p className="text-xs text-slate-400">{member.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services for Investors */}
      <section className="py-20 px-4 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
              Pour Investisseurs
            </Badge>
            <h2 className="text-4xl font-bold mb-4">Pourquoi investir dans BINTRONIX ?</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { 
                icon: TrendingUp, 
                title: 'Marché en croissance',
                desc: 'Le marché tech africain croît de 20% par an'
              },
              { 
                icon: Globe, 
                title: 'Expansion régionale',
                desc: 'Présence en Guinée avec expansion vers l\'Afrique de l\'Ouest'
              },
              { 
                icon: Zap, 
                title: 'Technologie de pointe',
                desc: 'IA, Cloud, Mobile Money intégrés dans nos solutions'
              }
            ].map((item, idx) => (
              <div key={idx} className="text-center p-8 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 flex items-center justify-center">
                  <item.icon className="h-8 w-8 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                <p className="text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              Contact
            </Badge>
            <h2 className="text-4xl font-bold mb-4">Contactez-nous</h2>
            <p className="text-slate-400">Nous sommes là pour vous accompagner</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-8 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Mail className="h-6 w-6 text-emerald-400" />
              </div>
              <h3 className="font-bold mb-2">Email</h3>
              <p className="text-slate-400">contact@bintronix.com</p>
            </div>
            
            <div className="text-center p-8 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Phone className="h-6 w-6 text-emerald-400" />
              </div>
              <h3 className="font-bold mb-2">Téléphone</h3>
              <p className="text-slate-400">+224 XX XX XX XX</p>
            </div>
            
            <div className="text-center p-8 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <MapPin className="h-6 w-6 text-emerald-400" />
              </div>
              <h3 className="font-bold mb-2">Adresse</h3>
              <p className="text-slate-400">Conakry, Guinée</p>
            </div>
          </div>

          {/* Social Media */}
          <div className="mt-16 text-center">
            <p className="text-slate-400 mb-6">Suivez-nous sur les réseaux sociaux</p>
            <div className="flex justify-center gap-4">
              {[
                { icon: Linkedin, color: 'hover:bg-blue-600' },
                { icon: Twitter, color: 'hover:bg-sky-500' },
                { icon: Facebook, color: 'hover:bg-blue-700' },
                { icon: Instagram, color: 'hover:bg-pink-600' }
              ].map((social, idx) => (
                <a 
                  key={idx}
                  href="#" 
                  className={`w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center ${social.color} transition-colors`}
                >
                  <social.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src="/assets/bintronix-logo.png" alt="BINTRONIX" className="h-10 w-10 rounded-lg" />
              <div>
                <span className="font-bold text-emerald-400">BINTRONIX</span>
                <p className="text-xs text-slate-500">Building the Future</p>
              </div>
            </div>
            
            <p className="text-slate-500 text-sm">
              © 2026 BINTRONIX. Tous droits réservés.
            </p>

            <div className="flex items-center gap-6">
              <a href="#" className="text-sm text-slate-400 hover:text-emerald-400">Mentions légales</a>
              <a href="#" className="text-sm text-slate-400 hover:text-emerald-400">Confidentialité</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default BintronixWebsite;
