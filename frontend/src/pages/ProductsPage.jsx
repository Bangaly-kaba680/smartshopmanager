import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { productsAPI } from '@/lib/api';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, Search, Package, Loader2, QrCode, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/App';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('fr-FR', { style: 'decimal' }).format(value) + ' GNF';
};

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '', category: '', buy_price: '', sell_price: '', description: ''
  });
  const [saving, setSaving] = useState(false);
  const { user, isCEO, isManager } = useAuth();

  const categories = ['Vetements', 'Chaussures', 'Accessoires', 'Electronique', 'Alimentation', 'Cosmetique', 'Autre'];
  const canEdit = user?.role !== 'cashier';
  const canDelete = ['super_admin', 'ceo', 'owner', 'manager'].includes(user?.role);

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    try {
      const response = await productsAPI.getAll();
      setProducts(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des produits');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        category: product.category,
        buy_price: (product.buy_price || 0).toString(),
        sell_price: (product.sell_price || product.price || 0).toString(),
        description: product.description || ''
      });
    } else {
      setEditingProduct(null);
      setFormData({ name: '', category: '', buy_price: '', sell_price: '', description: '' });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        ...formData,
        buy_price: parseFloat(formData.buy_price) || 0,
        sell_price: parseFloat(formData.sell_price) || 0,
        price: parseFloat(formData.sell_price) || 0,
      };
      if (editingProduct) {
        await productsAPI.update(editingProduct.id, data);
        toast.success('Produit modifie');
      } else {
        await productsAPI.create(data);
        toast.success('Produit ajoute avec QR code');
      }
      setModalOpen(false);
      fetchProducts();
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Supprimer "${product.name}"?`)) return;
    try {
      await productsAPI.delete(product.id);
      toast.success('Produit supprime');
      fetchProducts();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const showQrCode = async (product) => {
    try {
      const res = await api.get(`/products/${product.id}/qr-print`);
      setQrData(res.data);
      setQrModalOpen(true);
    } catch {
      toast.error('Erreur chargement QR code');
    }
  };

  const printQrCode = () => {
    if (!qrData) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html><head><title>QR Code - ${qrData.product_name}</title>
      <style>
        body { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: sans-serif; margin: 0; }
        .label { text-align: center; border: 2px dashed #ccc; padding: 20px; width: 300px; }
        .label img { width: 200px; height: 200px; }
        .label h3 { margin: 10px 0 5px; font-size: 16px; }
        .label p { margin: 3px 0; font-size: 12px; color: #666; }
        .label .price { font-size: 20px; font-weight: bold; color: #000; margin: 10px 0; }
        @media print { body { margin: 0; } .label { border: 1px dashed #999; } }
      </style></head><body>
      <div class="label">
        <img src="data:image/png;base64,${qrData.qr_code}" alt="QR Code" />
        <h3>${qrData.product_name}</h3>
        <p>${qrData.category}</p>
        <div class="price">${new Intl.NumberFormat('fr-FR').format(qrData.sell_price)} GNF</div>
        <p style="font-size:10px;color:#999;">BINTRONIX - StartupManager Pro</p>
      </div>
      <script>window.print();window.close();</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <DashboardLayout title="Produits">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Produits">
      <div className="space-y-6" data-testid="products-content">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher un produit..." className="pl-10"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} data-testid="search-products" />
          </div>
          {canEdit && (
            <Button onClick={() => openModal()} data-testid="add-product-btn">
              <Plus className="h-4 w-4 mr-2" /> Ajouter un produit
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" /> Liste des Produits ({filteredProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>QR</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Categorie</TableHead>
                    <TableHead>Prix Achat</TableHead>
                    <TableHead>Prix Vente</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Aucun produit trouve
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <button onClick={() => showQrCode(product)} className="w-10 h-10 bg-muted rounded flex items-center justify-center hover:bg-primary/10 transition-colors cursor-pointer"
                            data-testid={`qr-btn-${product.id}`} title="Voir QR Code">
                            {product.qr_code ? (
                              <img src={`data:image/png;base64,${product.qr_code}`} alt="QR" className="w-9 h-9 rounded" />
                            ) : (
                              <QrCode className="h-5 w-5 text-muted-foreground" />
                            )}
                          </button>
                        </TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell><Badge variant="secondary">{product.category}</Badge></TableCell>
                        <TableCell className="text-muted-foreground">{formatCurrency(product.buy_price || 0)}</TableCell>
                        <TableCell className="font-semibold text-primary">{formatCurrency(product.sell_price || product.price || 0)}</TableCell>
                        <TableCell>
                          <Badge variant={product.stock_quantity > 10 ? 'default' : product.stock_quantity > 0 ? 'secondary' : 'destructive'}>
                            {product.stock_quantity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => showQrCode(product)} title="QR Code"
                              data-testid={`print-qr-${product.id}`}>
                              <Printer className="h-4 w-4" />
                            </Button>
                            {canEdit && (
                              <Button variant="ghost" size="icon" onClick={() => openModal(product)}
                                data-testid={`edit-product-${product.id}`}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"
                                onClick={() => handleDelete(product)} data-testid={`delete-product-${product.id}`}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Modifier le produit' : 'Ajouter un produit'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom du produit *</Label>
              <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required data-testid="product-name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Categorie *</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger data-testid="product-category"><SelectValue placeholder="Selectionner une categorie" /></SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="buy_price">Prix Achat (GNF)</Label>
                <Input id="buy_price" type="number" min="0" step="100"
                  value={formData.buy_price} onChange={(e) => setFormData({ ...formData, buy_price: e.target.value })}
                  data-testid="product-buy-price" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sell_price">Prix Vente (GNF) *</Label>
                <Input id="sell_price" type="number" min="0" step="100"
                  value={formData.sell_price} onChange={(e) => setFormData({ ...formData, sell_price: e.target.value })}
                  required data-testid="product-sell-price" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optionnel)</Label>
              <Textarea id="description" value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2}
                data-testid="product-description" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={saving} data-testid="save-product">
                {saving ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enregistrement...</>) : (editingProduct ? 'Modifier' : 'Ajouter')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* QR Code Modal */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" /> QR Code Produit
            </DialogTitle>
          </DialogHeader>
          {qrData && (
            <div className="flex flex-col items-center gap-4">
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <img src={`data:image/png;base64,${qrData.qr_code}`} alt="QR Code" className="w-48 h-48 mx-auto" />
                <h3 className="font-semibold mt-3">{qrData.product_name}</h3>
                <p className="text-sm text-muted-foreground">{qrData.category}</p>
                <p className="text-xl font-bold mt-2">{formatCurrency(qrData.sell_price)}</p>
              </div>
              <Button onClick={printQrCode} className="w-full" data-testid="print-qr-btn">
                <Printer className="h-4 w-4 mr-2" /> Imprimer le QR Code
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default ProductsPage;
