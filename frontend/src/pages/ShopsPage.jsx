import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { shopsAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Store, MapPin, Phone, Smartphone, Building2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const ShopsPage = () => {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    orange_money_number: '',
    bank_account: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    try {
      const response = await shopsAPI.getAll();
      setShops(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await shopsAPI.create(formData);
      toast.success('Boutique créée avec succès!');
      setModalOpen(false);
      setFormData({ name: '', address: '', phone: '', orange_money_number: '', bank_account: '' });
      fetchShops();
    } catch (error) {
      toast.error('Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Boutiques">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Boutiques">
      <div className="space-y-6" data-testid="shops-content">
        {/* Header */}
        <div className="flex justify-between items-center">
          <p className="text-muted-foreground">
            Gérez vos boutiques et points de vente
          </p>
          <Button onClick={() => setModalOpen(true)} data-testid="add-shop-btn">
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle Boutique
          </Button>
        </div>

        {/* Shops Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shops.map((shop) => (
            <Card key={shop.id} className="card-hover">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Store className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{shop.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{shop.address}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{shop.phone}</span>
                </div>
                {shop.orange_money_number && (
                  <div className="flex items-center gap-2 text-sm">
                    <Smartphone className="h-4 w-4 text-orange-500" />
                    <span>{shop.orange_money_number}</span>
                  </div>
                )}
                {shop.bank_account && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-blue-500" />
                    <span>{shop.bank_account}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {shops.length === 0 && (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Store className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucune boutique</p>
                <Button className="mt-4" onClick={() => setModalOpen(true)}>
                  Créer ma première boutique
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Add Shop Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle Boutique</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom de la boutique</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ma Boutique"
                required
                data-testid="shop-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Adresse</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 Rue Commerce, Dakar"
                required
                data-testid="shop-address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+221 77 xxx xxxx"
                required
                data-testid="shop-phone"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="orange">Numéro Orange Money (optionnel)</Label>
              <Input
                id="orange"
                value={formData.orange_money_number}
                onChange={(e) => setFormData({ ...formData, orange_money_number: e.target.value })}
                placeholder="+221 77 xxx xxxx"
                data-testid="shop-orange"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bank">Compte bancaire (optionnel)</Label>
              <Input
                id="bank"
                value={formData.bank_account}
                onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                placeholder="SN001234567890"
                data-testid="shop-bank"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={saving} data-testid="save-shop">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Création...
                  </>
                ) : (
                  'Créer la boutique'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default ShopsPage;
