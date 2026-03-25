import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCurrency } from '@/contexts/CurrencyContext';
import {
  Package, Boxes, AlertTriangle, ArrowUpDown, Send,
  RefreshCw, Plus, Minus, Search
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const StockManagerDashboard = () => {
  const { formatAmount } = useCurrency();
  const [products, setProducts] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRequest, setShowRequest] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [requestData, setRequestData] = useState({ action: 'add', quantity: 1, reason: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [prodRes, reqRes] = await Promise.all([
        api.get('/seller/available-products'),
        api.get('/stock-requests')
      ]);
      setProducts(Array.isArray(prodRes.data) ? prodRes.data : []);
      setMyRequests(Array.isArray(reqRes.data) ? reqRes.data : []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openRequestDialog = (product) => {
    setSelectedProduct(product);
    setRequestData({ action: 'add', quantity: 1, reason: '' });
    setShowRequest(true);
  };

  const handleSubmitRequest = async () => {
    if (!selectedProduct || requestData.quantity < 1) {
      toast.error('Quantite invalide');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/stock-requests', {
        product_id: selectedProduct.id,
        action: requestData.action,
        quantity: requestData.quantity,
        reason: requestData.reason
      });
      toast.success('Demande de modification envoyee au manager');
      setShowRequest(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const STATUS_LABELS = { pending: 'En attente', approved: 'Approuve', rejected: 'Rejete' };
  const STATUS_COLORS = { pending: 'bg-amber-500/10 text-amber-600', approved: 'bg-emerald-500/10 text-emerald-600', rejected: 'bg-red-500/10 text-red-600' };

  if (loading) {
    return (
      <DashboardLayout title="Gestion des Stocks">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Gestion des Stocks">
      <div className="space-y-6" data-testid="stock-manager-dashboard">
        <p className="text-sm text-muted-foreground">
          Gerez le stock. Les modifications necessitent l'approbation du manager.
        </p>

        {/* Products with stock levels */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Boxes className="h-5 w-5" /> Produits & Stock
              </CardTitle>
              <Button variant="outline" size="sm" onClick={fetchData}>
                <RefreshCw className="h-4 w-4 mr-1" /> Actualiser
              </Button>
            </div>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher produit..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="pl-10" data-testid="search-products-input" />
            </div>
          </CardHeader>
          <CardContent>
            {filteredProducts.length > 0 ? (
              <div className="space-y-2">
                {filteredProducts.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.category} - {formatAmount(p.sell_price)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={p.stock_quantity > 10 ? 'outline' : 'destructive'} className="text-xs">
                        Stock: {p.stock_quantity}
                      </Badge>
                      <Button size="sm" variant="outline" onClick={() => openRequestDialog(p)}
                        data-testid={`stock-request-btn-${p.id}`}>
                        <ArrowUpDown className="h-4 w-4 mr-1" /> Modifier
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-6 text-sm">Aucun produit</p>
            )}
          </CardContent>
        </Card>

        {/* My Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Send className="h-5 w-5" /> Mes Demandes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {myRequests.length > 0 ? (
              <div className="space-y-2">
                {myRequests.map(req => (
                  <div key={req.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                    <div>
                      <p className="text-sm font-medium">{req.product_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {req.action === 'add' ? 'Ajouter' : req.action === 'remove' ? 'Retirer' : 'Ajuster'} {req.quantity} - {req.reason}
                      </p>
                      <p className="text-[11px] text-muted-foreground/60">
                        {req.created_at ? new Date(req.created_at).toLocaleString('fr-FR') : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge className={`text-xs ${STATUS_COLORS[req.status] || ''}`}>
                        {STATUS_LABELS[req.status] || req.status}
                      </Badge>
                      {req.approved_by_name && (
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Par: {req.approved_by_name}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-6 text-sm">Aucune demande</p>
            )}
          </CardContent>
        </Card>

        {/* Request Dialog */}
        <Dialog open={showRequest} onOpenChange={setShowRequest}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Demande de Modification Stock</DialogTitle>
            </DialogHeader>
            {selectedProduct && (
              <div className="space-y-3">
                <p className="text-sm font-medium">{selectedProduct.name}</p>
                <p className="text-xs text-muted-foreground">Stock actuel: {selectedProduct.stock_quantity}</p>
                <div>
                  <Label>Action</Label>
                  <Select value={requestData.action} onValueChange={v => setRequestData({...requestData, action: v})}>
                    <SelectTrigger data-testid="request-action-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="add">Ajouter</SelectItem>
                      <SelectItem value="remove">Retirer</SelectItem>
                      <SelectItem value="adjust">Ajuster (definir quantite)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Quantite</Label>
                  <Input type="number" min="1" value={requestData.quantity}
                    onChange={e => setRequestData({...requestData, quantity: parseInt(e.target.value) || 1})}
                    data-testid="request-quantity-input" />
                </div>
                <div>
                  <Label>Raison</Label>
                  <Textarea value={requestData.reason} onChange={e => setRequestData({...requestData, reason: e.target.value})}
                    placeholder="Expliquez la raison..." data-testid="request-reason-input" />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRequest(false)}>Annuler</Button>
              <Button onClick={handleSubmitRequest} disabled={submitting} data-testid="submit-stock-request-btn">
                {submitting ? 'Envoi...' : 'Envoyer la demande'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default StockManagerDashboard;
