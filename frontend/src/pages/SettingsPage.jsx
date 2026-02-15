import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth, useTheme } from '@/App';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Settings, User, Moon, Sun, Bell, Shield, 
  Globe, Palette, LogOut, Sparkles, RefreshCw, Loader2,
  Zap, TrendingUp, Users, Package, DollarSign
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const SettingsPage = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { currency, setCurrency, currencies } = useCurrency();
  const navigate = useNavigate();
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [notifications, setNotifications] = useState({
    push: true,
    stockAlerts: true,
    dailySummary: false,
    aiInsights: true
  });

  useEffect(() => {
    if (autoRefresh) {
      generateAISuggestions();
      const interval = setInterval(generateAISuggestions, 60000); // Every minute
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const generateAISuggestions = async () => {
    setLoadingAI(true);
    try {
      const [dashboardRes, stockRes, salesRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/ai/insights/dashboard`),
        axios.get(`${BACKEND_URL}/api/ai/insights/stock`),
        axios.get(`${BACKEND_URL}/api/ai/insights/sales`)
      ]);
      
      const suggestions = [
        ...dashboardRes.data.insights.map(i => ({ ...i, source: 'Dashboard' })),
        ...stockRes.data.insights.slice(0, 2).map(i => ({ 
          type: i.type, 
          icon: '📦', 
          title: i.product, 
          message: i.message,
          source: 'Stock'
        })),
        ...salesRes.data.insights.map(i => ({ ...i, source: 'Ventes' }))
      ];
      
      setAiSuggestions(suggestions);
    } catch (error) {
      console.error('Error fetching AI suggestions:', error);
    } finally {
      setLoadingAI(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ceo': return <Badge className="bg-primary">PDG / CEO</Badge>;
      case 'manager': return <Badge variant="secondary">Manager</Badge>;
      case 'cashier': return <Badge variant="outline">Caissier</Badge>;
      case 'stock_manager': return <Badge variant="outline">Stock Manager</Badge>;
      default: return <Badge variant="outline">{role}</Badge>;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'warning': return 'text-amber-500 bg-amber-500/10';
      case 'critical': return 'text-red-500 bg-red-500/10';
      case 'success': return 'text-emerald-500 bg-emerald-500/10';
      case 'tip': return 'text-blue-500 bg-blue-500/10';
      default: return 'text-primary bg-primary/10';
    }
  };

  return (
    <DashboardLayout title="Paramètres">
      <div className="max-w-4xl space-y-6" data-testid="settings-content">
        {/* AI Insights Section */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-orange-500/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Insights IA en Temps Réel
                <Badge className="bg-gradient-to-r from-primary to-orange-500 ml-2">
                  Auto-Update
                </Badge>
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={generateAISuggestions}
                disabled={loadingAI}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loadingAI ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
            </div>
            <CardDescription>
              Suggestions personnalisées basées sur vos données - Mise à jour automatique
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingAI && aiSuggestions.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Analyse IA en cours...</span>
              </div>
            ) : aiSuggestions.length > 0 ? (
              <div className="space-y-3">
                {aiSuggestions.slice(0, 5).map((suggestion, idx) => (
                  <div 
                    key={idx}
                    className={`p-4 rounded-lg flex items-start gap-3 ${getTypeColor(suggestion.type)}`}
                  >
                    <span className="text-xl">{suggestion.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm">{suggestion.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {suggestion.source}
                        </Badge>
                      </div>
                      <p className="text-sm mt-1 opacity-80">{suggestion.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Aucune suggestion pour le moment</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profil
            </CardTitle>
            <CardDescription>
              Informations de votre compte
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-orange-500 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-semibold">{user?.name}</h3>
                <p className="text-muted-foreground">{user?.email}</p>
                <div className="mt-1">
                  {getRoleBadge(user?.role)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Paramètres IA
            </CardTitle>
            <CardDescription>
              Configurez les fonctionnalités d'intelligence artificielle
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Mise à jour automatique IA</Label>
                <p className="text-sm text-muted-foreground">
                  Actualiser les insights IA automatiquement
                </p>
              </div>
              <Switch 
                checked={autoRefresh} 
                onCheckedChange={setAutoRefresh}
                data-testid="ai-auto-refresh"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Insights IA sur le Dashboard</Label>
                <p className="text-sm text-muted-foreground">
                  Afficher les suggestions IA sur le tableau de bord
                </p>
              </div>
              <Switch 
                checked={notifications.aiInsights} 
                onCheckedChange={(v) => setNotifications({...notifications, aiInsights: v})}
                data-testid="ai-insights-toggle"
              />
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Apparence
            </CardTitle>
            <CardDescription>
              Personnalisez l'interface de l'application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                <div>
                  <Label>Mode sombre</Label>
                  <p className="text-sm text-muted-foreground">
                    Basculer entre le mode clair et sombre
                  </p>
                </div>
              </div>
              <Switch 
                checked={theme === 'dark'} 
                onCheckedChange={toggleTheme}
                data-testid="theme-switch"
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Gérez vos préférences de notification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Notifications push</Label>
                <p className="text-sm text-muted-foreground">
                  Recevoir des alertes sur les nouvelles ventes
                </p>
              </div>
              <Switch 
                checked={notifications.push}
                onCheckedChange={(v) => setNotifications({...notifications, push: v})}
                data-testid="push-notifications" 
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Alertes stock faible</Label>
                <p className="text-sm text-muted-foreground">
                  Être notifié quand le stock est bas
                </p>
              </div>
              <Switch 
                checked={notifications.stockAlerts}
                onCheckedChange={(v) => setNotifications({...notifications, stockAlerts: v})}
                data-testid="stock-alerts" 
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Résumé quotidien</Label>
                <p className="text-sm text-muted-foreground">
                  Recevoir un rapport des ventes chaque jour
                </p>
              </div>
              <Switch 
                checked={notifications.dailySummary}
                onCheckedChange={(v) => setNotifications({...notifications, dailySummary: v})}
                data-testid="daily-summary" 
              />
            </div>
          </CardContent>
        </Card>

        {/* Language */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Langue
            </CardTitle>
            <CardDescription>
              Choisissez la langue de l'interface
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label>Langue actuelle</Label>
                <p className="text-sm text-muted-foreground">Français (FR)</p>
              </div>
              <Button variant="outline" size="sm" disabled>
                Changer
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Sécurité
            </CardTitle>
            <CardDescription>
              Gérez la sécurité de votre compte
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Changer le mot de passe</Label>
                <p className="text-sm text-muted-foreground">
                  Mettre à jour votre mot de passe
                </p>
              </div>
              <Button variant="outline" size="sm">
                Modifier
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Authentification à deux facteurs</Label>
                <p className="text-sm text-muted-foreground">
                  Ajouter une couche de sécurité supplémentaire
                </p>
              </div>
              <Button variant="outline" size="sm" disabled>
                Activer
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Logout */}
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-destructive">Déconnexion</Label>
                <p className="text-sm text-muted-foreground">
                  Se déconnecter de votre compte
                </p>
              </div>
              <Button 
                variant="destructive" 
                onClick={handleLogout}
                data-testid="logout-btn-settings"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Se déconnecter
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
