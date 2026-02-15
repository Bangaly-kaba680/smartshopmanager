import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, useTheme } from '@/App';
import { authAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sun, Moon, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await authAPI.login(email, password);
      const { access_token, user } = response.data;
      login(user, access_token);
      toast.success('Connexion réussie!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur de connexion');
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
            <div className="flex items-center justify-center lg:justify-start gap-3 mb-4">
              <img src="/logo.png" alt="StartupManager Pro" className="h-16 w-auto" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              StartupManager <span className="text-primary">Pro</span>
            </h1>
            <p className="text-muted-foreground">Gérez votre entreprise efficacement</p>
          </div>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Connexion</CardTitle>
              <CardDescription>Entrez vos identifiants pour accéder à votre compte</CardDescription>
            </CardHeader>
            <CardContent>
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
                    data-testid="login-email"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      data-testid="login-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                      data-testid="toggle-password"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Link 
                    to="/forgot-password" 
                    className="text-sm text-primary hover:underline"
                    data-testid="forgot-password-link"
                  >
                    Mot de passe oublié?
                  </Link>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90" 
                  disabled={loading}
                  data-testid="login-submit"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connexion...
                    </>
                  ) : (
                    'Se connecter'
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Pas encore de compte?{' '}
                  <Link 
                    to="/register" 
                    className="text-primary hover:underline font-medium"
                    data-testid="register-link"
                  >
                    Créer un compte
                  </Link>
                </p>
              </div>

              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground text-center">
                  <strong>Compte démo:</strong> admin@startup.com / admin123
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right side - Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: 'url(https://customer-assets.emergentagent.com/job_shopflow-208/artifacts/sc9e7l7a_WhatsApp%20Image%202026-02-15%20at%2006.29.14.jpeg)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-12">
          <blockquote className="text-white">
            <p className="text-xl italic mb-4">
              "Gérer mes boutiques n'a jamais été aussi simple. StartupManager Pro a transformé ma façon de travailler."
            </p>
            <footer className="text-slate-300 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-orange-500 flex items-center justify-center text-white font-bold">
                BK
              </div>
              <span>— Bangaly Kaba, Fondateur</span>
            </footer>
          </blockquote>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
