import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { dashboardAPI, salesAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  DollarSign, TrendingUp, Store, Smartphone, Building2, Banknote,
  ShoppingCart, Users, Package, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { toast } from 'sonner';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const StatCard = ({ title, value, icon: Icon, trend, trendValue, color = 'primary' }) => {
  const colors = {
    primary: 'bg-primary/10 text-primary',
    orange: 'bg-orange-500/10 text-orange-500',
    emerald: 'bg-emerald-500/10 text-emerald-500',
    blue: 'bg-blue-500/10 text-blue-500',
  };

  return (
    <Card className="card-hover">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className={`p-3 rounded-xl ${colors[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
          {trend && (
            <div className={`flex items-center text-sm ${trend === 'up' ? 'text-emerald-500' : 'text-red-500'}`}>
              {trend === 'up' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat('fr-FR', { style: 'decimal' }).format(value) + ' FCFA';
};

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentSales, setRecentSales] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, salesRes] = await Promise.all([
        dashboardAPI.getStats(),
        salesAPI.getAll()
      ]);
      setStats(statsRes.data);
      setRecentSales(salesRes.data.slice(0, 5));
    } catch (error) {
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // Mock chart data
  const salesChartData = [
    { name: 'Lun', ventes: 45000 },
    { name: 'Mar', ventes: 52000 },
    { name: 'Mer', ventes: 38000 },
    { name: 'Jeu', ventes: 65000 },
    { name: 'Ven', ventes: 78000 },
    { name: 'Sam', ventes: 92000 },
    { name: 'Dim', ventes: 55000 },
  ];

  const categoryData = [
    { name: 'Vêtements', value: 45 },
    { name: 'Chaussures', value: 30 },
    { name: 'Accessoires', value: 25 },
  ];

  if (loading) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-8" data-testid="dashboard-content">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard 
            title="Ventes Aujourd'hui" 
            value={formatCurrency(stats?.today_sales || 0)}
            icon={ShoppingCart}
            trend="up"
            trendValue="+12%"
            color="primary"
          />
          <StatCard 
            title="Revenus Mensuels" 
            value={formatCurrency(stats?.monthly_revenue || 0)}
            icon={TrendingUp}
            trend="up"
            trendValue="+8%"
            color="emerald"
          />
          <StatCard 
            title="Boutiques" 
            value={stats?.total_shops || 0}
            icon={Store}
            color="blue"
          />
          <StatCard 
            title="Orange Money" 
            value={formatCurrency(stats?.orange_money_balance || 0)}
            icon={Smartphone}
            color="orange"
          />
          <StatCard 
            title="Solde Banque" 
            value={formatCurrency(stats?.bank_balance || 0)}
            icon={Building2}
            color="blue"
          />
          <StatCard 
            title="Cash" 
            value={formatCurrency(stats?.cash_balance || 0)}
            icon={Banknote}
            color="emerald"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Ventes de la Semaine</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesChartData}>
                    <defs>
                      <linearGradient id="colorVentes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(243, 75%, 59%)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(243, 75%, 59%)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} className="text-xs" />
                    <YAxis axisLine={false} tickLine={false} className="text-xs" tickFormatter={(v) => `${v/1000}k`} />
                    <Tooltip 
                      formatter={(value) => [formatCurrency(value), 'Ventes']}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="ventes" 
                      stroke="hsl(243, 75%, 59%)" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorVentes)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Categories Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Ventes par Catégorie</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical">
                    <XAxis type="number" axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={80} />
                    <Tooltip 
                      formatter={(value) => [`${value}%`, 'Part']}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="value" fill="hsl(243, 75%, 59%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Sales & Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Sales */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Ventes Récentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentSales.length > 0 ? recentSales.map((sale, index) => (
                  <div key={sale.id || index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <ShoppingCart className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Vente #{sale.id?.slice(0, 8)}</p>
                        <p className="text-xs text-muted-foreground">
                          {sale.payment_method === 'cash' ? 'Espèces' : 
                           sale.payment_method === 'orange_money' ? 'Orange Money' : 'Carte'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">{formatCurrency(sale.total)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(sale.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )) : (
                  <p className="text-center text-muted-foreground py-8">Aucune vente récente</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Aperçu Rapide</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm">Produits</span>
                  </div>
                  <span className="font-semibold">{stats?.total_products || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm">Employés</span>
                  </div>
                  <span className="font-semibold">{stats?.total_employees || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Store className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm">Boutiques</span>
                  </div>
                  <span className="font-semibold">{stats?.total_shops || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
