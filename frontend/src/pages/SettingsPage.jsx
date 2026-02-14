import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth, useTheme } from '@/App';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, User, Moon, Sun, Bell, Shield, 
  Globe, Palette, LogOut
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SettingsPage = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

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

  return (
    <DashboardLayout title="Paramètres">
      <div className="max-w-3xl space-y-6" data-testid="settings-content">
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
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">
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
              <Switch defaultChecked data-testid="push-notifications" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Alertes stock faible</Label>
                <p className="text-sm text-muted-foreground">
                  Être notifié quand le stock est bas
                </p>
              </div>
              <Switch defaultChecked data-testid="stock-alerts" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Résumé quotidien</Label>
                <p className="text-sm text-muted-foreground">
                  Recevoir un rapport des ventes chaque jour
                </p>
              </div>
              <Switch data-testid="daily-summary" />
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
