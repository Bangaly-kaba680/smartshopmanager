import React, { useState, useEffect } from 'react';
import { useTheme } from '@/App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sun, Moon, Loader2, Shield, Clock, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const AccessGatePage = ({ onAccessGranted }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(false);
  const [status, setStatus] = useState(null); // null, 'pending', 'checking', 'denied'
  const [remainingTime, setRemainingTime] = useState(null);
  const { theme, toggleTheme } = useTheme();

  // Check stored email on mount
  useEffect(() => {
    const storedEmail = localStorage.getItem('access_email');
    if (storedEmail) {
      setEmail(storedEmail);
      checkAccess(storedEmail);
    }
  }, []);

  // Countdown timer for temporary access
  useEffect(() => {
    if (remainingTime && remainingTime > 0) {
      const timer = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setStatus(null);
            localStorage.removeItem('access_email');
            toast.error('Votre accès temporaire a expiré');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [remainingTime]);

  // Poll for access status when pending
  useEffect(() => {
    if (status === 'pending' && email) {
      const pollInterval = setInterval(() => {
        checkAccess(email, true);
      }, 5000); // Check every 5 seconds
      return () => clearInterval(pollInterval);
    }
  }, [status, email]);

  const checkAccess = async (emailToCheck, silent = false) => {
    if (!silent) setCheckingAccess(true);
    try {
      const response = await axios.get(`${BACKEND_URL}/api/access/check/${encodeURIComponent(emailToCheck)}`);
      const data = response.data;
      
      if (data.authorized) {
        localStorage.setItem('access_email', emailToCheck);
        if (data.access_type === 'temporary' && data.remaining_seconds) {
          setRemainingTime(data.remaining_seconds);
        }
        onAccessGranted(emailToCheck, data.access_type);
        if (!silent) toast.success('Accès autorisé!');
      } else if (data.status === 'pending') {
        setStatus('pending');
        if (!silent) toast.info('Votre demande est en attente d\'approbation');
      } else {
        setStatus(null);
      }
    } catch (error) {
      console.error('Error checking access:', error);
    } finally {
      if (!silent) setCheckingAccess(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !name) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${BACKEND_URL}/api/access/request`, {
        name,
        email,
        reason
      });
      
      const data = response.data;
      
      if (data.status === 'already_authorized') {
        localStorage.setItem('access_email', email);
        onAccessGranted(email);
        toast.success('Vous avez déjà accès!');
      } else if (data.status === 'pending') {
        setStatus('pending');
        localStorage.setItem('access_email', email);
        toast.info('Votre demande est déjà en cours de traitement');
      } else {
        setStatus('pending');
        localStorage.setItem('access_email', email);
        toast.success('Demande envoyée! Bangaly Kaba va l\'examiner.');
      }
    } catch (error) {
      toast.error('Erreur lors de l\'envoi de la demande');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4">
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </div>

      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="text-center pb-2">
          {/* Logo */}
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-indigo-500 to-orange-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <Shield className="h-8 w-8 text-white" />
          </div>
          
          <CardTitle className="text-2xl font-bold">
            StartupManager <span className="text-primary">Pro</span>
          </CardTitle>
          <CardDescription>
            {status === 'pending' 
              ? 'Votre demande est en cours d\'examen'
              : 'Accès sécurisé - Autorisation requise'
            }
          </CardDescription>
        </CardHeader>

        <CardContent>
          {status === 'pending' ? (
            <div className="text-center space-y-6 py-4">
              <div className="w-20 h-20 mx-auto bg-amber-500/10 rounded-full flex items-center justify-center">
                <Clock className="h-10 w-10 text-amber-500 animate-pulse" />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">Demande en attente</h3>
                <p className="text-muted-foreground text-sm">
                  Bangaly Kaba a été notifié de votre demande d'accès. 
                  Vous recevrez l'autorisation sous peu.
                </p>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Email enregistré:</p>
                <p className="font-medium">{email}</p>
              </div>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => checkAccess(email)}
                disabled={checkingAccess}
              >
                {checkingAccess ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Vérification...
                  </>
                ) : (
                  'Vérifier le statut'
                )}
              </Button>

              <p className="text-xs text-muted-foreground">
                La page se met à jour automatiquement
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom complet *</Label>
                <Input
                  id="name"
                  placeholder="Votre nom"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  data-testid="access-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="access-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Motif de la demande (optionnel)</Label>
                <Textarea
                  id="reason"
                  placeholder="Expliquez brièvement pourquoi vous souhaitez accéder..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  data-testid="access-reason"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-indigo-500 to-orange-500 hover:from-indigo-600 hover:to-orange-600"
                disabled={loading}
                data-testid="request-access-btn"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Demander l'accès
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Votre demande sera examinée par Bangaly Kaba
              </p>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-orange-500 flex items-center justify-center">
            <span className="text-[10px] font-bold text-white">BK</span>
          </div>
          <span>Développé par <strong className="text-foreground">Bangaly Kaba</strong></span>
        </div>
      </div>
    </div>
  );
};

export default AccessGatePage;
