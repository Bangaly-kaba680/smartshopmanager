import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { RotateCcw, CheckCircle, XCircle, Clock, Package } from 'lucide-react';
import api from '../lib/api';
import DashboardLayout from '../components/DashboardLayout';

const ReturnsPage = () => {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { const { data } = await api.get('/returns'); setReturns(data); }
    catch { toast.error('Erreur chargement retours'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (id, action) => {
    try {
      await api.post(`/returns/${id}/${action}`);
      toast.success(action === 'approve' ? 'Retour approuvé' : 'Retour rejeté');
      load();
    } catch { toast.error('Erreur'); }
  };

  const statusColors = {
    pending: 'bg-amber-500/20 text-amber-400',
    approved: 'bg-green-500/20 text-green-400',
    rejected: 'bg-red-500/20 text-red-400'
  };
  const statusLabels = { pending: 'En attente', approved: 'Approuvé', rejected: 'Rejeté' };

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="returns-page">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Retours Produits</h1>
          <p className="text-muted-foreground text-sm">{returns.length} retours enregistrés</p>
        </div>

        {loading ? <p className="text-muted-foreground">Chargement...</p> : returns.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <RotateCcw className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucun retour enregistré</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {returns.map(r => (
              <Card key={r.id} data-testid={`return-card-${r.id}`}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Package className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="font-medium">{r.product_name || 'Produit'}</p>
                      <p className="text-sm text-muted-foreground">Quantité: {r.quantity} - {r.reason}</p>
                      <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${statusColors[r.status]}`}>
                      {statusLabels[r.status]}
                    </span>
                    {r.status === 'pending' && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleAction(r.id, 'approve')}>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleAction(r.id, 'reject')}>
                          <XCircle className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ReturnsPage;
