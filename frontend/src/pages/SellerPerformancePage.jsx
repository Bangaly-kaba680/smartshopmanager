import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { TrendingUp, ShoppingCart, DollarSign, Target } from 'lucide-react';
import api from '../lib/api';
import DashboardLayout from '../components/DashboardLayout';

const SellerPerformancePage = () => {
  const [perf, setPerf] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [perfRes, prodRes] = await Promise.all([
        api.get('/seller/my-performance'),
        api.get('/seller/available-products')
      ]);
      setPerf(perfRes.data);
      setProducts(prodRes.data);
    } catch { toast.error('Erreur chargement'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const fmt = (n) => (n || 0).toLocaleString('fr-FR');

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="seller-performance-page">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mes Performances</h1>
          <p className="text-muted-foreground text-sm">Suivi de vos ventes et résultats</p>
        </div>

        {loading ? <p className="text-muted-foreground">Chargement...</p> : (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <ShoppingCart className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{perf?.today?.sales_count || 0}</p>
                      <p className="text-xs text-muted-foreground">Ventes aujourd'hui</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{fmt(perf?.today?.revenue)}</p>
                      <p className="text-xs text-muted-foreground">GNF aujourd'hui</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Target className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{perf?.all_time?.sales_count || 0}</p>
                      <p className="text-xs text-muted-foreground">Total ventes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{fmt(perf?.all_time?.revenue)}</p>
                      <p className="text-xs text-muted-foreground">GNF total</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Produits Disponibles ({products.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {products.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Aucun produit en stock</p>
                ) : (
                  <div className="space-y-2">
                    {products.map(p => (
                      <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div>
                          <p className="font-medium text-sm">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm">{fmt(p.sell_price)} GNF</p>
                          <p className="text-xs text-muted-foreground">Stock: {p.stock_quantity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SellerPerformancePage;
