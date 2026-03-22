import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { Store, Edit, Power, PowerOff, Search, Mail, Phone } from 'lucide-react';
import api from '../lib/api';
import DashboardLayout from '../components/DashboardLayout';

const AdminShopsPage = () => {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editShop, setEditShop] = useState(null);
  const [form, setForm] = useState({ name: '', address: '', phone: '' });

  const load = useCallback(async () => {
    try { const { data } = await api.get('/admin/shops'); setShops(data); }
    catch { toast.error('Erreur chargement boutiques'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (shop) => {
    const active = shop.is_active === false || shop.is_active === 'false';
    try {
      await api.post(`/admin/shops/${shop.id}/${active ? 'activate' : 'deactivate'}`);
      toast.success(active ? 'Boutique réactivée' : 'Boutique désactivée');
      load();
    } catch { toast.error('Erreur'); }
  };

  const handleSave = async () => {
    try {
      await api.put(`/admin/shops/${editShop.id}`, form);
      toast.success('Boutique mise à jour');
      setEditShop(null);
      load();
    } catch { toast.error('Erreur'); }
  };

  const filtered = shops.filter(s => s.name?.toLowerCase().includes(search.toLowerCase()) || s.owner_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="admin-shops-page">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestion des Boutiques</h1>
          <p className="text-muted-foreground text-sm">{shops.length} boutiques enregistrées</p>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>

        {loading ? <p className="text-muted-foreground">Chargement...</p> : (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map(shop => (
              <Card key={shop.id} data-testid={`shop-card-${shop.id}`} className={`${shop.is_active === false || shop.is_active === 'false' ? 'opacity-50 border-red-500/30' : ''}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <Store className="h-5 w-5 text-emerald-500" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{shop.name}</CardTitle>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${shop.is_active === false || shop.is_active === 'false' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                          {shop.is_active === false || shop.is_active === 'false' ? 'Désactivée' : 'Active'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditShop(shop); setForm({ name: shop.name, address: shop.address, phone: shop.phone }); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleToggle(shop)}>
                        {shop.is_active === false || shop.is_active === 'false' ? <Power className="h-4 w-4 text-green-500" /> : <PowerOff className="h-4 w-4 text-red-500" />}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-1">
                  {shop.address && <p>{shop.address}</p>}
                  <div className="flex items-center gap-4 mt-2">
                    {shop.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{shop.phone}</span>}
                    {shop.owner_email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{shop.owner_email}</span>}
                  </div>
                  <p className="text-xs mt-1">Propriétaire: <span className="text-foreground font-medium">{shop.owner_name || 'N/A'}</span></p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {editShop && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
              <CardHeader><CardTitle>Modifier {editShop.name}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Input placeholder="Nom" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} />
                <Input placeholder="Adresse" value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} />
                <Input placeholder="Téléphone" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} />
                <div className="flex gap-2">
                  <Button onClick={handleSave} className="flex-1">Enregistrer</Button>
                  <Button variant="outline" onClick={() => setEditShop(null)} className="flex-1">Annuler</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminShopsPage;
