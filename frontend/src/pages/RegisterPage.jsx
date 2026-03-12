import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, useTheme } from '@/App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sun, Moon, Eye, EyeOff, Loader2, ShieldCheck, Building2, Phone, Mail, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { getRandomAd } from '@/config/marketingAds';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const RegisterPage = () => {
  const [step, setStep] = useState(1); // 1: Info, 2: OTP Verification
  const [formData, setFormData] = useState({
    company_name: '',
    owner_name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  
  // Get random marketing ad
  const [ad, setAd] = useState(() => getRandomAd([1]));
  
  // Change ad every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setAd(getRandomAd([1]));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Step 1: Request registration with OTP
  const handleRequestRegistration = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);
    
    try {
      const response = await axios.post(`${BACKEND_URL}/api/auth/register-request`, {
        company_name: formData.company_name,
        owner_name: formData.owner_name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone || null
      });
      
      // Save dev OTP for testing (remove in production)
      if (response.data.dev_otp) {
        setDevOtp(response.data.dev_otp);
      }
      
      toast.success('Code de vérification envoyé! Vérifiez votre email.');
      setStep(2);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'envoi du code');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and complete registration
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    
    if (otp.length !== 6) {
      toast.error('Le code doit contenir 6 chiffres');
      return;
    }

    setLoading(true);
    
    try {
      const response = await axios.post(`${BACKEND_URL}/api/auth/verify-registration`, {
        email: formData.email,
        otp: otp
      });
      
      const { access_token, user, tenant } = response.data;
      login(user, access_token);
      toast.success(`Bienvenue ${user.name}! Votre entreprise "${tenant.company_name}" a été créée.`);
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Code invalide ou expiré');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${BACKEND_URL}/api/auth/resend-otp?email=${formData.email}`);
      if (response.data.dev_otp) {
        setDevOtp(response.data.dev_otp);
      }
      toast.success('Nouveau code envoyé!');
    } catch (error) {
      toast.error('Erreur lors du renvoi du code');
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
              <img src="/assets/bintronix-logo.png" alt="BINTRONIX" className="h-16 w-auto" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              StartupManager <span className="text-primary">Pro</span>
            </h1>
            <p className="text-muted-foreground">Créez votre compte entreprise</p>
            <p className="text-xs text-muted-foreground mt-1">Une solution <span className="font-semibold text-emerald-500">BINTRONIX</span></p>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary text-white' : 'bg-muted'}`}>
                {step > 1 ? <CheckCircle className="h-5 w-5" /> : '1'}
              </div>
              <span className="text-sm hidden sm:block">Informations</span>
            </div>
            <div className="w-8 h-[2px] bg-muted" />
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary text-white' : 'bg-muted'}`}>
                <ShieldCheck className="h-4 w-4" />
              </div>
              <span className="text-sm hidden sm:block">Vérification 2FA</span>
            </div>
          </div>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {step === 1 ? (
                  <>
                    <Building2 className="h-5 w-5 text-primary" />
                    Inscription Entreprise
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-5 w-5 text-emerald-500" />
                    Vérification à Deux Facteurs
                  </>
                )}
              </CardTitle>
              <CardDescription>
                {step === 1 
                  ? 'Remplissez les informations de votre entreprise'
                  : 'Entrez le code de vérification envoyé à votre email'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {step === 1 ? (
                <form onSubmit={handleRequestRegistration} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Nom de l'entreprise *</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="company_name"
                        name="company_name"
                        type="text"
                        placeholder="Ma Boutique SARL"
                        value={formData.company_name}
                        onChange={handleChange}
                        required
                        className="pl-10"
                        data-testid="register-company"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="owner_name">Votre nom complet *</Label>
                    <Input
                      id="owner_name"
                      name="owner_name"
                      type="text"
                      placeholder="Mamadou Diallo"
                      value={formData.owner_name}
                      onChange={handleChange}
                      required
                      data-testid="register-name"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="email@exemple.com"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          className="pl-10"
                          data-testid="register-email"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Téléphone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          placeholder="+224 6XX XXX XXX"
                          value={formData.phone}
                          onChange={handleChange}
                          className="pl-10"
                          data-testid="register-phone"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Mot de passe *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Minimum 6 caractères"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        minLength={6}
                        data-testid="register-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmer le mot de passe *</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      data-testid="register-confirm-password"
                    />
                  </div>

                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-emerald-600">
                      <ShieldCheck className="h-5 w-5" />
                      <span className="text-sm font-medium">Sécurité 2FA activée</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Un code de vérification sera envoyé à votre email pour sécuriser votre inscription.
                    </p>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-primary/90" 
                    disabled={loading}
                    data-testid="register-submit"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Envoi du code...
                      </>
                    ) : (
                      <>
                        Continuer
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <div className="text-center py-4">
                    <div className="w-16 h-16 mx-auto bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
                      <ShieldCheck className="h-8 w-8 text-emerald-500" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Code envoyé à: <span className="font-medium text-foreground">{formData.email}</span>
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="otp">Code de vérification (6 chiffres)</Label>
                    <Input
                      id="otp"
                      type="text"
                      placeholder="000000"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="text-center text-2xl tracking-widest"
                      maxLength={6}
                      required
                      data-testid="otp-input"
                    />
                  </div>

                  {/* Dev mode: show OTP */}
                  {devOtp && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-center">
                      <p className="text-xs text-yellow-600">Mode développement - Code OTP:</p>
                      <p className="text-2xl font-mono font-bold text-yellow-600">{devOtp}</p>
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full bg-emerald-500 hover:bg-emerald-600" 
                    disabled={loading || otp.length !== 6}
                    data-testid="verify-otp-submit"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Vérification...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        Vérifier et créer mon compte
                      </>
                    )}
                  </Button>

                  <div className="flex items-center justify-between">
                    <Button 
                      type="button"
                      variant="ghost"
                      onClick={() => setStep(1)}
                      className="text-sm"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Retour
                    </Button>
                    <Button 
                      type="button"
                      variant="link"
                      onClick={handleResendOTP}
                      disabled={loading}
                      className="text-sm"
                    >
                      Renvoyer le code
                    </Button>
                  </div>
                </form>
              )}

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Déjà un compte?{' '}
                  <Link 
                    to="/login" 
                    className="text-primary hover:underline font-medium"
                    data-testid="login-link"
                  >
                    Se connecter
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Plan info */}
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              🎁 <span className="font-medium">14 jours d'essai gratuit</span> - Aucune carte requise
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Image with CEO photo */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: 'url(https://customer-assets.emergentagent.com/job_shopflow-208/artifacts/qhnu6y1t_WhatsApp%20Image%202026-02-15%20at%2006.29.14%20%281%29.jpeg)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/95 via-slate-900/50 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-12">
          <blockquote className="text-white">
            <p className="text-xl italic mb-4">
              "SmartShopManager a transformé la gestion de mon entreprise. Une plateforme complète et sécurisée."
            </p>
            <footer className="text-slate-300 flex items-center gap-3">
              <img 
                src="/assets/ceo-photo.jpeg" 
                alt="CEO BINTRONIX" 
                className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500"
              />
              <div className="flex flex-col">
                <span className="text-emerald-400 font-bold">CEO BINTRONIX</span>
                <span className="text-sm text-slate-400">Fondateur</span>
              </div>
            </footer>
          </blockquote>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
