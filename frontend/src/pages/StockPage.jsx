import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { batchesAPI, productsAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, QrCode, Boxes, Loader2, Search, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/App';

const StockPage = () => {
  const [batches, setBatches] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedQR, setSelectedQR] = useState(null);
  const [editingBatch, setEditingBatch] = useState(null);
  const [formData, setFormData] = useState({
    product_id: '',
    lot_number: '',
    size: '',
    color: '',
    quantity: ''
  });
  const [saving, setSaving] = useState(false);
  const { isCEO, isManager, isStockManager } = useAuth();

  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Unique'];
  const colors = ['Noir', 'Blanc', 'Bleu', 'Rouge', 'Vert', 'Jaune', 'Orange', 'Rose', 'Gris', 'Marron'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [batchesRes, productsRes] = await Promise.all([
        batchesAPI.getAll(),
        productsAPI.getAll()
      ]);
      setBatches(batchesRes.data);
      setProducts(productsRes.data);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const filteredBatches = batches.filter(b => 
    b.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.lot_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openModal = (batch = null) => {
    if (batch) {
      setEditingBatch(batch);
      setFormData({
        product_id: batch.product_id,
        lot_number: batch.lot_number,
        size: batch.size,
        color: batch.color,
        quantity: batch.quantity.toString()
      });
    } else {
      setEditingBatch(null);
      setFormData({ product_id: '', lot_number: '', size: '', color: '', quantity: '' });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const data = {
        ...formData,
        quantity: parseInt(formData.quantity)
      };

      if (editingBatch) {
        await batchesAPI.update(editingBatch.id, {
          quantity: data.quantity,
          size: data.size,
          color: data.color
        });
        toast.success('Lot modifié avec succès');
      } else {
        await batchesAPI.create(data);
        toast.success('Lot ajouté avec succès');
      }
      
      setModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (batch) => {
    if (!window.confirm(`Supprimer le lot "${batch.lot_number}"?`)) return;

    try {
      await batchesAPI.delete(batch.id);
      toast.success('Lot supprimé');
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const generateQR = async (batch) => {
    try {
      const response = await batchesAPI.generateQR(batch.id);
      setSelectedQR({ ...batch, qr_code: response.data.qr_code });
      setQrModalOpen(true);
      toast.success('QR Code généré');
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de la génération du QR');
    }
  };

  const downloadQR = () => {
    if (!selectedQR?.qr_code) return;
    
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${selectedQR.qr_code}`;
    link.download = `qr-${selectedQR.lot_number}.png`;
    link.click();
  };

  if (loading) {
    return (
      <DashboardLayout title="Gestion du Stock">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Gestion du Stock">
      <div className="space-y-6" data-testid="stock-content">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher un lot..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="search-batches"
            />
          </div>
          {(isCEO || isManager || isStockManager) && (
            <Button onClick={() => openModal()} data-testid="add-batch-btn">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau Lot
            </Button>
          )}
        </div>

        {/* Stock Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Boxes className="h-5 w-5" />
              Inventaire ({filteredBatches.length} lots)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead>N° Lot</TableHead>
                    <TableHead>Taille</TableHead>
                    <TableHead>Couleur</TableHead>
                    <TableHead>Quantité</TableHead>
                    <TableHead>QR Code</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBatches.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Aucun lot trouvé
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBatches.map((batch) => (
                      <TableRow key={batch.id} className="table-row-hover">
                        <TableCell className="font-medium">{batch.product_name}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">{batch.lot_number}</code>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{batch.size}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 rounded-full border"
                              style={{ backgroundColor: batch.color.toLowerCase() }}
                            />
                            {batch.color}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={batch.quantity > 20 ? 'default' : batch.quantity > 5 ? 'secondary' : 'destructive'}>
                            {batch.quantity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {batch.qr_code ? (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setSelectedQR(batch);
                                setQrModalOpen(true);
                              }}
                              data-testid={`view-qr-${batch.id}`}
                            >
                              <QrCode className="h-4 w-4 mr-1" />
                              Voir
                            </Button>
                          ) : (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => generateQR(batch)}
                              data-testid={`generate-qr-${batch.id}`}
                            >
                              <QrCode className="h-4 w-4 mr-1" />
                              Générer
                            </Button>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {(isCEO || isManager || isStockManager) && (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => openModal(batch)}
                                data-testid={`edit-batch-${batch.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {(isCEO || isManager) && (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDelete(batch)}
                                data-testid={`delete-batch-${batch.id}`}
                              >
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
            <DialogTitle>
              {editingBatch ? 'Modifier le lot' : 'Nouveau lot'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {!editingBatch && (
              <div className="space-y-2">
                <Label htmlFor="product">Produit</Label>
                <Select 
                  value={formData.product_id} 
                  onValueChange={(value) => setFormData({ ...formData, product_id: value })}
                >
                  <SelectTrigger data-testid="batch-product">
                    <SelectValue placeholder="Sélectionner un produit" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(prod => (
                      <SelectItem key={prod.id} value={prod.id}>{prod.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="size">Taille</Label>
                <Select 
                  value={formData.size} 
                  onValueChange={(value) => setFormData({ ...formData, size: value })}
                >
                  <SelectTrigger data-testid="batch-size">
                    <SelectValue placeholder="Taille" />
                  </SelectTrigger>
                  <SelectContent>
                    {sizes.map(size => (
                      <SelectItem key={size} value={size}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Couleur</Label>
                <Select 
                  value={formData.color} 
                  onValueChange={(value) => setFormData({ ...formData, color: value })}
                >
                  <SelectTrigger data-testid="batch-color">
                    <SelectValue placeholder="Couleur" />
                  </SelectTrigger>
                  <SelectContent>
                    {colors.map(color => (
                      <SelectItem key={color} value={color}>{color}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantité</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                required
                data-testid="batch-quantity"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={saving} data-testid="save-batch">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  editingBatch ? 'Modifier' : 'Ajouter'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* QR Code Modal */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>QR Code - {selectedQR?.lot_number}</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col items-center space-y-4">
            {selectedQR?.qr_code && (
              <img 
                src={`data:image/png;base64,${selectedQR.qr_code}`}
                alt="QR Code"
                className="w-48 h-48"
              />
            )}
            <div className="text-center text-sm text-muted-foreground">
              <p>Produit: {selectedQR?.product_name}</p>
              <p>Taille: {selectedQR?.size} | Couleur: {selectedQR?.color}</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setQrModalOpen(false)}>
              Fermer
            </Button>
            <Button onClick={downloadQR} data-testid="download-qr">
              <Download className="h-4 w-4 mr-2" />
              Télécharger
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default StockPage;
