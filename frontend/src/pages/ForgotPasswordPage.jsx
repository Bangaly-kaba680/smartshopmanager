import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '@/App';
import { authAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sun, Moon, Loader2, ArrowLeft, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { getRandomAd } from '@/config/marketingAds';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { theme, toggleTheme } = useTheme();
  
  // Get random marketing ad
  const [ad, setAd] = useState(() => getRandomAd([1]));
  
  // Change ad every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setAd(getRandomAd([1]));
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await authAPI.forgotPassword(email);
      setSent(true);
      toast.success('Email envoyé avec succès!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'envoi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex transition-theme">
      {/* Left side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 bg-background">
        <div className="absolute top-4 right-4 lg:right-auto lg:left-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleTheme}
            data-testid="theme-toggle"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
        
        <div className="w-full max-w-md">
          <div className="mb-8 text-center lg:text-left">
            <h1 className="text-3xl font-bold text-foreground mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              StartupManager <span className="text-primary">Pro</span>
            </h1>
            <p className="text-muted-foreground">Récupération de mot de passe</p>
          </div>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Mot de passe oublié</CardTitle>
              <CardDescription>
                {sent 
                  ? 'Un email a été envoyé si ce compte existe'
                  : 'Entrez votre email pour recevoir un lien de réinitialisation'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sent ? (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                      <Mail className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                  <p className="text-center text-muted-foreground">
                    Vérifiez votre boîte de réception et suivez les instructions pour réinitialiser votre mot de passe.
                  </p>
                  <Link to="/login">
                    <Button variant="outline" className="w-full" data-testid="back-to-login">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Retour à la connexion
                    </Button>
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="votre@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      data-testid="forgot-email"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-primary/90" 
                    disabled={loading}
                    data-testid="forgot-submit"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Envoi...
                      </>
                    ) : (
                      'Envoyer le lien'
                    )}
                  </Button>

                  <Link to="/login">
                    <Button variant="ghost" className="w-full" data-testid="back-to-login">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Retour à la connexion
                    </Button>
                  </Link>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right side - Random Marketing Ad with CEO photo */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden transition-all duration-500">
        {ad.isLogo ? (
          <div className={`absolute inset-0 bg-gradient-to-br ${ad.gradient}`}>
            <div className="absolute inset-0 flex items-center justify-center">
              <img src={ad.image} alt="BINTRONIX" className="w-48 h-48 rounded-3xl opacity-30" />
            </div>
          </div>
        ) : (
          <>
            <div 
              className="absolute inset-0 bg-cover bg-center transition-all duration-500"
              style={{ backgroundImage: `url(${ad.image})` }}
            />
            <div className={`absolute inset-0 bg-gradient-to-t ${ad.gradient}`} />
          </>
        )}
        <div className="absolute inset-0 flex flex-col justify-between p-12 z-10">
          {/* Top - BINTRONIX Logo with Support Message */}
          <div className="text-center text-white">
            <div className="w-28 h-28 mx-auto rounded-full border-4 border-emerald-500 shadow-2xl mb-4 bg-white/10 backdrop-blur-sm flex items-center justify-center overflow-hidden">
              <img 
                src="/assets/bintronix-logo.png" 
                alt="BINTRONIX" 
                className="w-24 h-24 object-cover rounded-full"
              />
            </div>
            <h2 className="text-2xl font-bold mb-2">Support BINTRONIX</h2>
            <p className="text-slate-300">
              Besoin d'aide? Notre équipe est là pour vous 24/7
            </p>
          </div>
          
          {/* Bottom - Ad Content */}
          <div className="text-white">
            <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <h3 className="text-xl font-bold mb-2">{ad.title}</h3>
              <p className="text-white/80 mb-3">{ad.highlight}</p>
              <div className="flex items-center gap-3">
                <img src="/assets/bintronix-logo.png" alt="BINTRONIX" className="w-10 h-10 rounded-lg" />
                <div>
                  <span className="text-emerald-400 font-bold block">{ad.author}</span>
                  <span className="text-xs text-slate-400">{ad.role}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
