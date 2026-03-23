import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users, Store, ShoppingCart, DollarSign, TrendingUp,
  Shield, UserCog, CreditCard, Activity, Globe,
  ArrowUpRight, RefreshCw, AlertTriangle, Eye,
  BarChart3, Layers, UserCheck, UserX
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { useCurrency } from '@/contexts/CurrencyContext';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';

const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6'];

const SuperAdminDashboard = () => {
  const { formatAmount } = useCurrency();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async (showToast = false) => {
    try {
      const { data } = await api.get('/admin/platform-stats');
      setStats(data);
      if (showToast) toast.success('Statistiques mises a jour');
    } catch (err) {
      console.error('Error fetching platform stats:', err);
      toast.error('Erreur chargement statistiques');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  useEffect(() => {
    const interval = setInterval(() => fetchStats(false), 60000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStats(true);
  };

  if (loading) {
    return (
      <DashboardLayout title="Administration Plateforme">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const usersByRole = stats?.users_by_role || {};
  const pieData = [
    { name: 'Proprietaires', value: usersByRole.owners || 0 },
    { name: 'Vendeurs', value: usersByRole.sellers || 0 },
    { name: 'Managers', value: usersByRole.managers || 0 },
  ].filter(d => d.value > 0);

  const quickActions = [
    { label: 'Gestion Utilisateurs', icon: UserCog, path: '/admin/users', color: 'bg-blue-500/10 text-blue-500' },
    { label: 'Gestion Boutiques', icon: Store, path: '/admin/shops', color: 'bg-emerald-500/10 text-emerald-500' },
    { label: 'Abonnements', icon: CreditCard, path: '/admin/subscriptions', color: 'bg-amber-500/10 text-amber-500' },
    { label: 'Securite', icon: Shield, path: '/security', color: 'bg-red-500/10 text-red-500' },
  ];

  return (
    <DashboardLayout title="Administration Plateforme">
      <div className="space-y-8" data-testid="super-admin-dashboard">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg text-muted-foreground">Vue strategique globale</h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            data-testid="refresh-stats-btn"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {/* KPI Cards - Platform Level */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500" data-testid="stat-total-users">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-lg bg-blue-500/10">
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
                <Badge variant="outline" className="text-xs">
                  <UserCheck className="h-3 w-3 mr-1" />
                  {stats?.active_users || 0} actifs
                </Badge>
              </div>
              <div className="mt-3">
                <p className="text-sm text-muted-foreground">Utilisateurs Total</p>
                <p className="text-3xl font-bold text-foreground">{stats?.total_users || 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500" data-testid="stat-total-shops">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-lg bg-emerald-500/10">
                  <Store className="h-5 w-5 text-emerald-500" />
                </div>
                <Badge variant="outline" className="text-xs">
                  {stats?.active_shops || 0} actives
                </Badge>
              </div>
              <div className="mt-3">
                <p className="text-sm text-muted-foreground">Boutiques Total</p>
                <p className="text-3xl font-bold text-foreground">{stats?.total_shops || 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500" data-testid="stat-total-revenue">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-lg bg-amber-500/10">
                  <DollarSign className="h-5 w-5 text-amber-500" />
                </div>
                <div className="flex items-center text-emerald-500 text-xs">
                  <ArrowUpRight className="h-3 w-3" />
                  <span>Ce mois</span>
                </div>
              </div>
              <div className="mt-3">
                <p className="text-sm text-muted-foreground">Revenu Total</p>
                <p className="text-2xl font-bold text-foreground">{formatAmount(stats?.total_revenue || 0)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500" data-testid="stat-total-sales">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-lg bg-purple-500/10">
                  <ShoppingCart className="h-5 w-5 text-purple-500" />
                </div>
                <Badge variant="outline" className="text-xs">
                  {stats?.today_sales_count || 0} aujourd'hui
                </Badge>
              </div>
              <div className="mt-3">
                <p className="text-sm text-muted-foreground">Ventes Totales</p>
                <p className="text-3xl font-bold text-foreground">{stats?.total_sales || 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Overview & User Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Cards */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                Revenus Plateforme
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Aujourd'hui</p>
                  <p className="text-xl font-bold" data-testid="today-revenue">{formatAmount(stats?.today_revenue || 0)}</p>
                  <p className="text-xs text-muted-foreground">{stats?.today_sales_count || 0} ventes</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Ce Mois</p>
                  <p className="text-xl font-bold" data-testid="monthly-revenue">{formatAmount(stats?.monthly_revenue || 0)}</p>
                  <p className="text-xs text-muted-foreground">{stats?.monthly_sales_count || 0} ventes</p>
                </div>
                <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                  <p className="text-xs text-muted-foreground mb-1">Revenu Total</p>
                  <p className="text-xl font-bold text-emerald-600">{formatAmount(stats?.total_revenue || 0)}</p>
                  <p className="text-xs text-muted-foreground">{stats?.total_sales || 0} ventes</p>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 border">
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Produits sur la plateforme</span>
                </div>
                <p className="text-3xl font-bold">{stats?.total_products || 0}</p>
              </div>
            </CardContent>
          </Card>

          {/* User Distribution Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                Utilisateurs par Role
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {pieData.map((_, idx) => (
                            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 mt-4">
                    {pieData.map((item, idx) => (
                      <div key={item.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                          <span>{item.name}</span>
                        </div>
                        <span className="font-semibold">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-center text-muted-foreground py-8">Aucune donnee utilisateur</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Actions Rapides
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {quickActions.map((action) => (
                <button
                  key={action.path}
                  onClick={() => navigate(action.path)}
                  data-testid={`quick-action-${action.path.replace(/\//g, '-').slice(1)}`}
                  className="flex flex-col items-center gap-3 p-5 rounded-xl border border-border hover:border-primary/40 hover:bg-muted/50 transition-all group"
                >
                  <div className={`p-3 rounded-lg ${action.color} group-hover:scale-110 transition-transform`}>
                    <action.icon className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-medium text-center">{action.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Platform Health Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/0">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <UserCheck className="h-5 w-5 text-blue-500" />
                <span className="font-semibold text-sm">Utilisateurs Actifs</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold">{stats?.active_users || 0}</span>
                <span className="text-sm text-muted-foreground mb-1">/ {stats?.total_users || 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500/5 to-emerald-500/0">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <Store className="h-5 w-5 text-emerald-500" />
                <span className="font-semibold text-sm">Boutiques Actives</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold">{stats?.active_shops || 0}</span>
                <span className="text-sm text-muted-foreground mb-1">/ {stats?.total_shops || 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/5 to-amber-500/0">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <Globe className="h-5 w-5 text-amber-500" />
                <span className="font-semibold text-sm">Croissance</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold">{stats?.total_products || 0}</span>
                <span className="text-sm text-muted-foreground mb-1">produits</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SuperAdminDashboard;
