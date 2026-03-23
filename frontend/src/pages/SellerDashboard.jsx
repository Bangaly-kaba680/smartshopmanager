import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/contexts/CurrencyContext';
import {
  ShoppingCart, DollarSign, TrendingUp, Package,
  Target, RefreshCw, ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import api from '@/lib/api';

const SellerDashboard = () => {
  const { formatAmount } = useCurrency();
  const navigate = useNavigate();
  const [perf, setPerf] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (showToast = false) => {
    try {
      const [perfRes, prodRes] = await Promise.all([
        api.get('/seller/my-performance'),
        api.get('/seller/available-products')
      ]);
      setPerf(perfRes.data);
      setProducts((prodRes.data || []).slice(0, 6));
      if (showToast) toast.success('Donnees mises a jour');
    } catch {
      console.error('Error fetching seller data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  if (loading) {
    return (
      <DashboardLayout title="Mon Espace">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const todaySales = perf?.today?.sales_count || 0;
  const todayRevenue = perf?.today?.total_amount || 0;
  const totalSales = perf?.total?.sales_count || 0;
  const totalRevenue = perf?.total?.total_amount || 0;

  return (
    <DashboardLayout title="Mon Espace">
      <div className="space-y-8" data-testid="seller-dashboard">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Bienvenue ! Voici vos performances du jour.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            data-testid="refresh-seller-btn"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {/* Quick POS Access */}
        <Card className="bg-gradient-to-r from-primary/10 to-orange-500/10 border-primary/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Enregistrer une Vente</h3>
                <p className="text-sm text-muted-foreground mt-1">Accedez au point de vente rapidement</p>
              </div>
              <Button
                onClick={() => navigate('/pos')}
                className="bg-primary hover:bg-primary/90"
                data-testid="go-to-pos-btn"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Ouvrir POS
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Performance KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-emerald-500" data-testid="stat-today-sales-count">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingCart className="h-4 w-4 text-emerald-500" />
                <span className="text-xs text-muted-foreground">Ventes Aujourd'hui</span>
              </div>
              <p className="text-3xl font-bold">{todaySales}</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500" data-testid="stat-today-revenue">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">Revenu Aujourd'hui</span>
              </div>
              <p className="text-2xl font-bold">{formatAmount(todayRevenue)}</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500" data-testid="stat-total-sales-count">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-purple-500" />
                <span className="text-xs text-muted-foreground">Total Ventes</span>
              </div>
              <p className="text-3xl font-bold">{totalSales}</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500" data-testid="stat-total-revenue">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-amber-500" />
                <span className="text-xs text-muted-foreground">Revenu Total</span>
              </div>
              <p className="text-2xl font-bold">{formatAmount(totalRevenue)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Available Products Preview */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5 text-muted-foreground" />
                Produits Disponibles
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/products')}>
                Voir tout <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {products.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {products.map((product, idx) => (
                  <div key={product.id || idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.category || 'Sans categorie'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatAmount(product.sell_price || product.price)}</p>
                      <Badge
                        variant={product.quantity > 10 ? 'outline' : 'destructive'}
                        className="text-xs"
                      >
                        Stock: {product.quantity ?? product.total_stock ?? 0}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-6 text-sm">Aucun produit disponible</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SellerDashboard;
