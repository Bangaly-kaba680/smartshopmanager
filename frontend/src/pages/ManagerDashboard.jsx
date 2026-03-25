import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/contexts/CurrencyContext';
import {
  Package, TrendingUp, ClipboardCheck, Clock,
  RefreshCw, CheckCircle, XCircle, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

const ManagerDashboard = () => {
  const { formatAmount } = useCurrency();
  const [stats, setStats] = useState(null);
  const [stockRequests, setStockRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, reqRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/stock-requests?status=pending')
      ]);
      setStats(statsRes.data);
      setStockRequests(Array.isArray(reqRes.data) ? reqRes.data : []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApprove = async (id) => {
    setProcessing(id);
    try {
      await api.post(`/stock-requests/${id}/approve`);
      toast.success('Demande approuvee');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id) => {
    setProcessing(id);
    try {
      await api.post(`/stock-requests/${id}/reject`);
      toast.success('Demande rejetee');
      fetchData();
    } catch (error) {
      toast.error('Erreur');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Dashboard Manager">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard Manager">
      <div className="space-y-6" data-testid="manager-dashboard">
        <p className="text-sm text-muted-foreground">
          Supervision et gestion operationnelle
        </p>

        {/* KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Produits</p>
              <p className="text-2xl font-bold mt-1">{stats?.total_products || 0}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Ventes Aujourd'hui</p>
              <p className="text-2xl font-bold mt-1">{formatAmount(stats?.today_sales || 0)}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Revenus Mensuels</p>
              <p className="text-2xl font-bold mt-1">{formatAmount(stats?.monthly_revenue || 0)}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Demandes en attente</p>
              <p className="text-2xl font-bold mt-1">{stockRequests.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Stock Approval Requests */}
        <Card className={stockRequests.length > 0 ? 'border-amber-500/30' : ''}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-amber-500" />
              Demandes d'Approbation Stock
              {stockRequests.length > 0 && (
                <Badge variant="destructive">{stockRequests.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stockRequests.length > 0 ? (
              <div className="space-y-3">
                {stockRequests.map(req => (
                  <div key={req.id} className="flex items-center justify-between p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg"
                    data-testid={`stock-request-${req.id}`}>
                    <div>
                      <p className="font-medium text-sm">{req.product_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {req.action === 'add' ? 'Ajouter' : req.action === 'remove' ? 'Retirer' : 'Ajuster'} {req.quantity} unites
                      </p>
                      <p className="text-xs text-muted-foreground">Par: {req.requested_by_name} - {req.reason}</p>
                      <p className="text-[11px] text-muted-foreground/60">
                        {req.created_at ? new Date(req.created_at).toLocaleString('fr-FR') : ''}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-500 hover:bg-emerald-50"
                        onClick={() => handleApprove(req.id)} disabled={processing === req.id}
                        data-testid={`approve-request-${req.id}`}>
                        <CheckCircle className="h-4 w-4 mr-1" /> Approuver
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600 border-red-500 hover:bg-red-50"
                        onClick={() => handleReject(req.id)} disabled={processing === req.id}
                        data-testid={`reject-request-${req.id}`}>
                        <XCircle className="h-4 w-4 mr-1" /> Rejeter
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Aucune demande en attente</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ManagerDashboard;
