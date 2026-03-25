import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Users, Store, ShoppingCart, DollarSign, TrendingUp,
  Shield, UserCog, CreditCard, Activity, Globe,
  ArrowUpRight, RefreshCw, Eye, Search,
  BarChart3, Layers, UserCheck, Package, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { useCurrency } from '@/contexts/CurrencyContext';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis
} from 'recharts';

const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6'];
const ROLE_LABELS = {
  owners: 'Proprietaires',
  sellers: 'Vendeurs',
  managers: 'Managers',
  cashiers: 'Caissiers',
  stock_managers: 'Gest. Stock',
};

const SuperAdminDashboard = () => {
  const { formatAmount } = useCurrency();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tenantSearch, setTenantSearch] = useState('');

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
  const pieData = Object.entries(usersByRole)
    .filter(([_, v]) => v > 0)
    .map(([k, v]) => ({ name: ROLE_LABELS[k] || k, value: v }));

  const tenants = stats?.tenants || [];
  const filteredTenants = tenants.filter(t =>
    t.shop_name?.toLowerCase().includes(tenantSearch.toLowerCase()) ||
    t.owner_name?.toLowerCase().includes(tenantSearch.toLowerCase()) ||
    t.owner_email?.toLowerCase().includes(tenantSearch.toLowerCase())
  );

  // Bar chart data: revenue per tenant
  const tenantRevenueData = tenants.slice(0, 10).map(t => ({
    name: t.shop_name?.length > 12 ? t.shop_name.slice(0, 12) + '...' : t.shop_name,
    revenue: t.total_revenue,
    ventes: t.total_sales,
  }));

  const recentActivity = stats?.recent_activity || [];

  const quickActions = [
    { label: 'Utilisateurs', icon: UserCog, path: '/admin/users', color: 'bg-blue-500/10 text-blue-500' },
    { label: 'Boutiques', icon: Store, path: '/admin/shops', color: 'bg-emerald-500/10 text-emerald-500' },
    { label: 'Abonnements', icon: CreditCard, path: '/admin/subscriptions', color: 'bg-amber-500/10 text-amber-500' },
    { label: 'Securite', icon: Shield, path: '/security', color: 'bg-red-500/10 text-red-500' },
  ];

  return (
    <DashboardLayout title="Administration Plateforme">
      <div className="space-y-6" data-testid="super-admin-dashboard">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Vue strategique globale — Multi-tenancy</p>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} data-testid="refresh-stats-btn">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} /> Actualiser
          </Button>
        </div>

        {/* Global KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="border-l-4 border-l-blue-500" data-testid="stat-total-users">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">Utilisateurs</span>
              </div>
              <p className="text-2xl font-bold">{stats?.total_users || 0}</p>
              <p className="text-xs text-muted-foreground">{stats?.active_users || 0} actifs</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-emerald-500" data-testid="stat-total-shops">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Store className="h-4 w-4 text-emerald-500" />
                <span className="text-xs text-muted-foreground">Entreprises</span>
              </div>
              <p className="text-2xl font-bold">{stats?.total_shops || 0}</p>
              <p className="text-xs text-muted-foreground">{stats?.active_shops || 0} actives</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500" data-testid="stat-total-revenue">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-amber-500" />
                <span className="text-xs text-muted-foreground">Revenu Total</span>
              </div>
              <p className="text-xl font-bold">{formatAmount(stats?.total_revenue || 0)}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-purple-500" data-testid="stat-total-sales">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <ShoppingCart className="h-4 w-4 text-purple-500" />
                <span className="text-xs text-muted-foreground">Ventes</span>
              </div>
              <p className="text-2xl font-bold">{stats?.total_sales || 0}</p>
              <p className="text-xs text-muted-foreground">{stats?.today_sales_count || 0} aujourd'hui</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-cyan-500" data-testid="stat-total-products">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Package className="h-4 w-4 text-cyan-500" />
                <span className="text-xs text-muted-foreground">Produits</span>
              </div>
              <p className="text-2xl font-bold">{stats?.total_products || 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Multi-tenancy Monitoring: Revenue Chart + Users by Role */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue per Tenant Bar Chart */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Revenus par Entreprise
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tenantRevenueData.length > 0 ? (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={tenantRevenueData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => formatAmount(v)} />
                      <Bar dataKey="revenue" fill="#10b981" radius={[6, 6, 0, 0]} name="Revenu" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-10 text-sm">Aucune donnee</p>
              )}
            </CardContent>
          </Card>

          {/* Users by Role Pie */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                Repartition Utilisateurs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={4} dataKey="value">
                          {pieData.map((_, idx) => (<Cell key={idx} fill={COLORS[idx % COLORS.length]} />))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-1.5 mt-2">
                    {pieData.map((item, idx) => (
                      <div key={item.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                          <span className="text-xs">{item.name}</span>
                        </div>
                        <span className="text-xs font-semibold">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-center text-muted-foreground py-8 text-sm">Aucun utilisateur</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* === MULTI-TENANCY: Enterprise List with Monitoring === */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Monitoring Multi-Tenancy — Toutes les Entreprises ({tenants.length})
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => navigate('/admin/shops')}>
                <Eye className="h-4 w-4 mr-1" /> Gerer
              </Button>
            </div>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher une entreprise..." value={tenantSearch}
                onChange={e => setTenantSearch(e.target.value)} className="pl-10" data-testid="search-tenants" />
            </div>
          </CardHeader>
          <CardContent>
            {filteredTenants.length > 0 ? (
              <div className="space-y-3">
                {filteredTenants.map((tenant) => (
                  <div key={tenant.shop_id} className="p-4 border rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors"
                    data-testid={`tenant-${tenant.shop_id}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4 text-primary" />
                          <h4 className="font-semibold">{tenant.shop_name}</h4>
                          {tenant.is_active !== false ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 text-[10px]">Active</Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[10px]">Suspendue</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Proprietaire: <span className="font-medium">{tenant.owner_name || 'N/A'}</span>
                          {tenant.owner_email && <span className="ml-1">({tenant.owner_email})</span>}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-emerald-600">{formatAmount(tenant.total_revenue)}</p>
                        <p className="text-[10px] text-muted-foreground">Revenu total</p>
                      </div>
                    </div>

                    {/* Tenant KPIs Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      <div className="p-2 bg-background rounded-lg border text-center">
                        <p className="text-lg font-bold">{tenant.total_employees}</p>
                        <p className="text-[10px] text-muted-foreground">Employes</p>
                      </div>
                      <div className="p-2 bg-background rounded-lg border text-center">
                        <p className="text-lg font-bold">{tenant.total_products}</p>
                        <p className="text-[10px] text-muted-foreground">Produits</p>
                      </div>
                      <div className="p-2 bg-background rounded-lg border text-center">
                        <p className="text-lg font-bold">{tenant.total_sales}</p>
                        <p className="text-[10px] text-muted-foreground">Ventes</p>
                      </div>
                      <div className="p-2 bg-background rounded-lg border text-center">
                        <p className="text-lg font-bold">{tenant.today_sales}</p>
                        <p className="text-[10px] text-muted-foreground">Aujourd'hui</p>
                      </div>
                      <div className="p-2 bg-background rounded-lg border text-center">
                        <p className="text-sm font-bold">{formatAmount(tenant.monthly_revenue)}</p>
                        <p className="text-[10px] text-muted-foreground">Ce mois</p>
                      </div>
                    </div>

                    {/* Employees by role */}
                    {Object.keys(tenant.employees_by_role || {}).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {Object.entries(tenant.employees_by_role).map(([role, count]) => (
                          <Badge key={role} variant="outline" className="text-[10px]">
                            {role === 'manager' ? 'Manager' :
                             role === 'seller' ? 'Vendeur' :
                             role === 'cashier' ? 'Caissier' :
                             role === 'stock_manager' ? 'Gest.Stock' : role}: {count}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <Store className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Aucune entreprise trouvee</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Platform Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Activite Recente Plateforme
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {recentActivity.map((log, idx) => (
                  <div key={log.id || idx} className="flex items-start gap-3 p-2.5 bg-muted/30 rounded-lg">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{log.user_name}</span>
                        <Badge variant="outline" className="text-[10px]">{log.user_role}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{log.details}</p>
                      <p className="text-[10px] text-muted-foreground/60">
                        {log.created_at ? new Date(log.created_at).toLocaleString('fr-FR') : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-6 text-sm">Aucune activite recente</p>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <button key={action.path} onClick={() => navigate(action.path)}
              data-testid={`quick-action-${action.path.replace(/\//g, '-').slice(1)}`}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border hover:border-primary/40 hover:bg-muted/50 transition-all group">
              <div className={`p-2.5 rounded-lg ${action.color} group-hover:scale-110 transition-transform`}>
                <action.icon className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SuperAdminDashboard;
