import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/contexts/CurrencyContext';
import {
  DollarSign, ShoppingCart, ArrowRight, Target
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import api from '@/lib/api';

const CashierDashboard = () => {
  const { formatAmount } = useCurrency();
  const navigate = useNavigate();
  const [perf, setPerf] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/seller/my-performance');
      setPerf(res.data);
    } catch {
      console.error('Error fetching cashier data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <DashboardLayout title="Caisse">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const todaySales = perf?.today?.sales_count || 0;
  const todayRevenue = perf?.today?.total_amount || 0;

  return (
    <DashboardLayout title="Caisse">
      <div className="space-y-6" data-testid="cashier-dashboard">
        <p className="text-sm text-muted-foreground">
          Bienvenue ! Utilisez le POS pour enregistrer les ventes.
        </p>

        {/* Quick POS Access */}
        <Card className="bg-gradient-to-r from-primary/10 to-orange-500/10 border-primary/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Ouvrir la Caisse</h3>
                <p className="text-sm text-muted-foreground">Enregistrer les paiements clients</p>
              </div>
              <Button onClick={() => navigate('/pos')} className="bg-primary" data-testid="go-to-pos-btn">
                <ShoppingCart className="h-4 w-4 mr-2" /> Ouvrir POS <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Performance */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-l-4 border-l-emerald-500" data-testid="stat-today-sales">
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
                <span className="text-xs text-muted-foreground">Montant Aujourd'hui</span>
              </div>
              <p className="text-2xl font-bold">{formatAmount(todayRevenue)}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CashierDashboard;
