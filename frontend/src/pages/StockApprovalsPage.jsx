import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/contexts/CurrencyContext';
import {
  ClipboardCheck, CheckCircle, XCircle, Clock,
  RefreshCw, Filter
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const STATUS_LABELS = { pending: 'En attente', approved: 'Approuve', rejected: 'Rejete' };
const STATUS_COLORS = {
  pending: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  approved: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  rejected: 'bg-red-500/10 text-red-600 border-red-500/30'
};
const ACTION_LABELS = { add: 'Ajouter', remove: 'Retirer', adjust: 'Ajuster' };

const StockApprovalsPage = () => {
  const { formatAmount } = useCurrency();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [processing, setProcessing] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const url = filter !== 'all' ? `/stock-requests?status=${filter}` : '/stock-requests';
      const res = await api.get(url);
      setRequests(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApprove = async (id) => {
    setProcessing(id);
    try {
      await api.post(`/stock-requests/${id}/approve`);
      toast.success('Demande approuvee - stock mis a jour');
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

  return (
    <DashboardLayout title="Approbations Stock">
      <div className="space-y-6" data-testid="stock-approvals-page">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Gerez les demandes de modification de stock
          </p>
          <div className="flex items-center gap-3">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-40" data-testid="filter-select">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="approved">Approuvees</SelectItem>
                <SelectItem value="rejected">Rejetees</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="h-4 w-4 mr-1" /> Actualiser
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Demandes ({requests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : requests.length > 0 ? (
              <div className="space-y-3">
                {requests.map(req => (
                  <div key={req.id} className="p-4 border rounded-lg bg-muted/30" data-testid={`request-row-${req.id}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{req.product_name}</p>
                          <Badge className={`text-xs ${STATUS_COLORS[req.status] || ''}`}>
                            {STATUS_LABELS[req.status] || req.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Action: <span className="font-medium">{ACTION_LABELS[req.action] || req.action}</span> - Quantite: <span className="font-medium">{req.quantity}</span>
                        </p>
                        {req.reason && <p className="text-sm text-muted-foreground">Raison: {req.reason}</p>}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Demande par: <span className="font-medium">{req.requested_by_name}</span></span>
                          <span>{req.created_at ? new Date(req.created_at).toLocaleString('fr-FR') : ''}</span>
                        </div>
                        {req.approved_by_name && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {req.status === 'approved' ? 'Approuve' : 'Rejete'} par: <span className="font-medium">{req.approved_by_name}</span>
                            {req.processed_at && <span> le {new Date(req.processed_at).toLocaleString('fr-FR')}</span>}
                          </p>
                        )}
                      </div>
                      {req.status === 'pending' && (
                        <div className="flex gap-2 shrink-0">
                          <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-500"
                            onClick={() => handleApprove(req.id)} disabled={processing === req.id}
                            data-testid={`approve-${req.id}`}>
                            <CheckCircle className="h-4 w-4 mr-1" /> Approuver
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 border-red-500"
                            onClick={() => handleReject(req.id)} disabled={processing === req.id}
                            data-testid={`reject-${req.id}`}>
                            <XCircle className="h-4 w-4 mr-1" /> Rejeter
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Aucune demande</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default StockApprovalsPage;
