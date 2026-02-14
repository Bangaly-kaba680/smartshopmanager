import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '@/App';
import { authAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sun, Moon, Loader2, ArrowLeft, Mail } from 'lucide-react';
import { toast } from 'sonner';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { theme, toggleTheme } = useTheme();

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

      {/* Right side - Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: 'url(https://images.unsplash.com/photo-1604783020105-a1c1a856a55d?w=1200&q=80)',
          }}
        />
        <div className="absolute inset-0 bg-slate-900/60" />
        <div className="absolute inset-0 flex flex-col justify-center items-center p-12">
          <div className="text-center text-white">
            <h2 className="text-2xl font-bold mb-4">Besoin d'aide?</h2>
            <p className="text-slate-300">
              Notre équipe support est disponible 24/7 pour vous aider.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
