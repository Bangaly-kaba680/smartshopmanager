import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/contexts/CurrencyContext';
import {
  ShoppingCart, DollarSign, TrendingUp, Package, Users, Store,
  ArrowUpRight, ArrowDownRight, RefreshCw, AlertTriangle,
  Sparkles, Lightbulb, Loader2, Boxes, RotateCcw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import api from '@/lib/api';
import axios from 'axios';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const OwnerDashboard = () => {
  const { formatAmount } = useCurrency();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stockAlerts, setStockAlerts] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);

  const fetchData = useCallback(async (showToast = false) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, salesRes, alertsRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/sales'),
        api.get('/owner/stock-alerts').catch(() => ({ data: [] }))
      ]);
      setStats(statsRes.data);
      setRecentSales((salesRes.data || []).slice(0, 5));
      setStockAlerts(Array.isArray(alertsRes.data) ? alertsRes.data.slice(0, 5) : []);
      if (showToast) toast.success('Donnees mises a jour');
    } catch (error) {
      console.error('Error fetching owner data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(() => fetchData(false), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  const generateAISuggestion = async () => {
    setLoadingSuggestion(true);
    try {
      const response = await axios.post(`${BACKEND_URL}/api/ai/generate-suggestion`, {
        page: 'dashboard'
      });
      setAiSuggestion(response.data.suggestion);
    } catch {
      toast.error('Erreur lors de la generation');
    } finally {
      setLoadingSuggestion(false);
    }
  };

  const quickActions = [
    { label: 'Nouvelle Vente', icon: ShoppingCart, path: '/pos', color: 'bg-primary/10 text-primary' },
    { label: 'Produits', icon: Package, path: '/products', color: 'bg-emerald-500/10 text-emerald-500' },
    { label: 'Stock', icon: Boxes, path: '/stock', color: 'bg-amber-500/10 text-amber-500' },
    { label: 'Employes', icon: Users, path: '/employees', color: 'bg-blue-500/10 text-blue-500' },
    { label: 'Finances', icon: DollarSign, path: '/finances', color: 'bg-purple-500/10 text-purple-500' },
    { label: 'Retours', icon: RotateCcw, path: '/returns', color: 'bg-red-500/10 text-red-500' },
  ];

  if (loading) {
    return (
      <DashboardLayout title="Mon Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Mon Dashboard">
      <div className="space-y-8" data-testid="owner-dashboard">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Vue operationnelle de votre boutique
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            data-testid="refresh-owner-btn"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-primary" data-testid="stat-today-sales">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-primary/10">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-sm text-muted-foreground">Ventes Aujourd'hui</p>
                <p className="text-2xl font-bold">{formatAmount(stats?.today_sales || 0)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500" data-testid="stat-monthly-revenue">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-500/10">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-sm text-muted-foreground">Revenus Mensuels</p>
                <p className="text-2xl font-bold">{formatAmount(stats?.monthly_revenue || 0)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500" data-testid="stat-products">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-blue-500/10">
                  <Package className="h-5 w-5 text-blue-500" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-sm text-muted-foreground">Produits</p>
                <p className="text-2xl font-bold">{stats?.total_products || 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500" data-testid="stat-employees">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-amber-500/10">
                  <Users className="h-5 w-5 text-amber-500" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-sm text-muted-foreground">Employes</p>
                <p className="text-2xl font-bold">{stats?.total_employees || 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Actions Rapides</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {quickActions.map((action) => (
                <button
                  key={action.path}
                  onClick={() => navigate(action.path)}
                  data-testid={`quick-action-${action.path.slice(1)}`}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-muted/50 transition-all group"
                >
                  <div className={`p-2.5 rounded-lg ${action.color} group-hover:scale-110 transition-transform`}>
                    <action.icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-medium text-center">{action.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Stock Alerts & Recent Sales */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stock Alerts */}
          <Card className={stockAlerts.length > 0 ? 'border-amber-500/30' : ''}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className={`h-5 w-5 ${stockAlerts.length > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
                Alertes Stock
                {stockAlerts.length > 0 && (
                  <Badge variant="destructive" className="ml-2">{stockAlerts.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stockAlerts.length > 0 ? (
                <div className="space-y-3">
                  {stockAlerts.map((alert, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{alert.name || alert.product_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Stock: <span className="text-amber-600 font-semibold">{alert.quantity ?? alert.current_stock}</span>
                          {alert.low_stock_threshold && <span> / seuil: {alert.low_stock_threshold}</span>}
                        </p>
                      </div>
                      <Badge variant="outline" className="border-amber-500 text-amber-600">Bas</Badge>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => navigate('/stock')}
                  >
                    Voir tout le stock
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Aucune alerte de stock</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Sales */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                Ventes Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentSales.length > 0 ? (
                <div className="space-y-3">
                  {recentSales.map((sale, idx) => (
                    <div key={sale.id || idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center">
                          <ShoppingCart className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Vente #{(sale.id || '').slice(0, 8)}</p>
                          <p className="text-xs text-muted-foreground">
                            {sale.payment_method === 'cash' ? 'Especes' :
                             sale.payment_method === 'orange_money' ? 'Orange Money' : 'Carte'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatAmount(sale.total)}</p>
                        <p className="text-xs text-muted-foreground">
                          {sale.created_at ? new Date(sale.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => navigate('/pos')}
                  >
                    Voir toutes les ventes
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Aucune vente recente</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* AI Suggestion */}
        <Card className="border-dashed border-2 border-primary/30">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-gradient-to-br from-primary to-orange-500 rounded-xl">
                <Lightbulb className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold flex items-center gap-2">
                  Conseil IA Personnalise
                  <Badge className="bg-gradient-to-r from-primary to-orange-500">IA</Badge>
                </h3>
                {aiSuggestion ? (
                  <p className="text-muted-foreground mt-2 text-sm">{aiSuggestion}</p>
                ) : (
                  <p className="text-muted-foreground mt-2 text-sm">
                    Cliquez pour obtenir un conseil personnalise base sur vos donnees.
                  </p>
                )}
                <Button
                  className="mt-3 bg-gradient-to-r from-primary to-orange-500 hover:opacity-90"
                  size="sm"
                  onClick={generateAISuggestion}
                  disabled={loadingSuggestion}
                  data-testid="ai-suggestion-btn"
                >
                  {loadingSuggestion ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generation...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Obtenir un conseil IA
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Balances */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="h-5 w-5 text-emerald-500" />
                <span className="text-sm font-medium">Cash</span>
              </div>
              <p className="text-2xl font-bold" data-testid="cash-balance">{formatAmount(stats?.cash_balance || 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="h-5 w-5 text-orange-500" />
                <span className="text-sm font-medium">Orange Money</span>
              </div>
              <p className="text-2xl font-bold" data-testid="orange-balance">{formatAmount(stats?.orange_money_balance || 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="h-5 w-5 text-blue-500" />
                <span className="text-sm font-medium">Banque</span>
              </div>
              <p className="text-2xl font-bold" data-testid="bank-balance">{formatAmount(stats?.bank_balance || 0)}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default OwnerDashboard;
