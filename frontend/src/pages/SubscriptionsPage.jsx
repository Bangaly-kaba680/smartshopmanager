import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { CreditCard, Plus, Check, X, Sparkles } from 'lucide-react';
import api from '../lib/api';
import DashboardLayout from '../components/DashboardLayout';

const SubscriptionsPage = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', price: 0, duration_days: 30, max_products: 50, max_employees: 5, features: '' });

  const load = useCallback(async () => {
    try { const { data } = await api.get('/admin/subscriptions'); setPlans(data); }
    catch { toast.error('Erreur chargement plans'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/subscriptions', { ...form, features: form.features.split(',').map(f => f.trim()).filter(Boolean) });
      toast.success('Plan créé');
      setShowForm(false);
      setForm({ name: '', price: 0, duration_days: 30, max_products: 50, max_employees: 5, features: '' });
      load();
    } catch { toast.error('Erreur création'); }
  };

  const tierColors = { 0: 'border-gray-500/30 bg-gray-500/5', 1: 'border-blue-500/30 bg-blue-500/5', 2: 'border-amber-500/30 bg-amber-500/5' };
  const tierIcons = { 0: 'text-gray-400', 1: 'text-blue-400', 2: 'text-amber-400' };

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="subscriptions-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Plans d'Abonnement</h1>
            <p className="text-muted-foreground text-sm">{plans.length} plans disponibles</p>
          </div>
          <Button data-testid="add-plan-btn" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" /> Nouveau Plan
          </Button>
        </div>

        {loading ? <p className="text-muted-foreground">Chargement...</p> : (
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan, i) => (
              <Card key={plan.id} data-testid={`plan-card-${plan.id}`} className={`${tierColors[i] || tierColors[0]} relative overflow-hidden`}>
                {i === 2 && <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">POPULAIRE</div>}
                <CardHeader className="text-center pb-2">
                  <Sparkles className={`h-8 w-8 mx-auto mb-2 ${tierIcons[i] || tierIcons[0]}`} />
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-foreground">{plan.price?.toLocaleString()}</span>
                    <span className="text-muted-foreground text-sm"> GNF{plan.duration_days > 0 ? '/mois' : ''}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    <p className="text-sm text-muted-foreground">Max produits: <span className="text-foreground font-medium">{plan.max_products >= 9999 ? 'Illimité' : plan.max_products}</span></p>
                    <p className="text-sm text-muted-foreground">Max employés: <span className="text-foreground font-medium">{plan.max_employees >= 9999 ? 'Illimité' : plan.max_employees}</span></p>
                  </div>
                  <ul className="space-y-2">
                    {(plan.features || []).map((f, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                        <span className="text-muted-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Nouveau Plan</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreate} className="space-y-4">
                  <Input placeholder="Nom du plan" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required />
                  <Input type="number" placeholder="Prix (GNF)" value={form.price} onChange={(e) => setForm({...form, price: parseFloat(e.target.value)})} required />
                  <Input type="number" placeholder="Durée (jours)" value={form.duration_days} onChange={(e) => setForm({...form, duration_days: parseInt(e.target.value)})} />
                  <Input type="number" placeholder="Max produits" value={form.max_products} onChange={(e) => setForm({...form, max_products: parseInt(e.target.value)})} />
                  <Input type="number" placeholder="Max employés" value={form.max_employees} onChange={(e) => setForm({...form, max_employees: parseInt(e.target.value)})} />
                  <Input placeholder="Fonctionnalités (séparées par virgule)" value={form.features} onChange={(e) => setForm({...form, features: e.target.value})} />
                  <Button type="submit" className="w-full">Créer le Plan</Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SubscriptionsPage;
