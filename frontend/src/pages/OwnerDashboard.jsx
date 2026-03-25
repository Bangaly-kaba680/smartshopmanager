import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCurrency } from '@/contexts/CurrencyContext';
import {
  Users, Store, DollarSign, TrendingUp, Package, ShoppingCart,
  RefreshCw, UserPlus, Eye, Ban, Trash2, Edit, Check,
  ArrowRight, Clock, Activity, UserCheck, RotateCcw, Search, ChevronDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import api from '@/lib/api';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const ROLE_LABELS = {
  manager: 'Manager',
  seller: 'Vendeur',
  cashier: 'Caissier',
  stock_manager: 'Gest. Stock',
};
const ROLE_COLORS = {
  manager: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
  seller: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  cashier: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  stock_manager: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
};

const OwnerDashboard = () => {
  const { formatAmount } = useCurrency();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchEmp, setSearchEmp] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newEmp, setNewEmp] = useState({ name: '', email: '', position: '', role: 'seller', salary: 0, contract_type: 'CDI', phone: '' });
  const [creating, setCreating] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, empRes, logRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/owner/employees'),
        api.get('/owner/activity-log?limit=20')
      ]);
      setStats(statsRes.data);
      setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
      setActivityLog(Array.isArray(logRes.data) ? logRes.data : []);
    } catch (error) {
      console.error('Error fetching owner data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreateEmployee = async () => {
    if (!newEmp.name || !newEmp.email || !newEmp.position) {
      toast.error('Remplissez tous les champs obligatoires');
      return;
    }
    setCreating(true);
    try {
      const res = await api.post('/owner/employees', newEmp);
      toast.success(res.data.message);
      if (res.data.account_created) {
        toast.info(`Mot de passe par defaut: ${res.data.default_password}`);
      }
      setShowCreate(false);
      setNewEmp({ name: '', email: '', position: '', role: 'seller', salary: 0, contract_type: 'CDI', phone: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la creation');
    } finally {
      setCreating(false);
    }
  };

  const handleBlock = async (id) => {
    try {
      await api.post(`/owner/employees/${id}/block`);
      toast.success('Employe bloque');
      fetchData();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleActivate = async (id) => {
    try {
      await api.post(`/owner/employees/${id}/activate`);
      toast.success('Employe active');
      fetchData();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cet employe et son compte ?')) return;
    try {
      await api.delete(`/owner/employees/${id}`);
      toast.success('Employe supprime');
      fetchData();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const filteredEmps = employees.filter(e =>
    e.name?.toLowerCase().includes(searchEmp.toLowerCase()) ||
    e.role?.toLowerCase().includes(searchEmp.toLowerCase()) ||
    e.email?.toLowerCase().includes(searchEmp.toLowerCase())
  );

  if (loading) {
    return (
      <DashboardLayout title="Dashboard Proprietaire">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const quickLinks = [
    { label: 'Produits', icon: Package, path: '/products', color: 'bg-emerald-500/10 text-emerald-500' },
    { label: 'Stock', icon: Package, path: '/stock', color: 'bg-amber-500/10 text-amber-500' },
    { label: 'Ventes', icon: ShoppingCart, path: '/pos', color: 'bg-blue-500/10 text-blue-500' },
    { label: 'Finances', icon: DollarSign, path: '/finances', color: 'bg-purple-500/10 text-purple-500' },
    { label: 'Retours', icon: RotateCcw, path: '/returns', color: 'bg-red-500/10 text-red-500' },
  ];

  return (
    <DashboardLayout title="Dashboard Proprietaire">
      <div className="space-y-6" data-testid="owner-dashboard">
        {/* KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500" data-testid="stat-today-sales">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Ventes Aujourd'hui</p>
              <p className="text-2xl font-bold mt-1">{formatAmount(stats?.today_sales || 0)}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-emerald-500" data-testid="stat-monthly-revenue">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Revenus Mensuels</p>
              <p className="text-2xl font-bold mt-1">{formatAmount(stats?.monthly_revenue || 0)}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500" data-testid="stat-products">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Produits</p>
              <p className="text-2xl font-bold mt-1">{stats?.total_products || 0}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-purple-500" data-testid="stat-employees">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Employes</p>
              <p className="text-2xl font-bold mt-1">{employees.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-5 gap-3">
          {quickLinks.map(link => (
            <button key={link.path} onClick={() => navigate(link.path)}
              data-testid={`quick-${link.path.slice(1)}`}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border hover:border-primary/40 hover:bg-muted/50 transition-all">
              <div className={`p-2 rounded-lg ${link.color}`}><link.icon className="h-5 w-5" /></div>
              <span className="text-xs font-medium">{link.label}</span>
            </button>
          ))}
        </div>

        {/* Employee Management */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" /> Gestion Employes
              </CardTitle>
              <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogTrigger asChild>
                  <Button size="sm" data-testid="add-employee-btn"><UserPlus className="h-4 w-4 mr-2" /> Ajouter</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader><DialogTitle>Nouvel Employe</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>Nom *</Label>
                      <Input value={newEmp.name} onChange={e => setNewEmp({...newEmp, name: e.target.value})} data-testid="emp-name-input" />
                    </div>
                    <div>
                      <Label>Email *</Label>
                      <Input type="email" value={newEmp.email} onChange={e => setNewEmp({...newEmp, email: e.target.value})} data-testid="emp-email-input" />
                    </div>
                    <div>
                      <Label>Role *</Label>
                      <Select value={newEmp.role} onValueChange={v => setNewEmp({...newEmp, role: v})}>
                        <SelectTrigger data-testid="emp-role-select"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="seller">Vendeur</SelectItem>
                          <SelectItem value="cashier">Caissier</SelectItem>
                          <SelectItem value="stock_manager">Gestionnaire Stock</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Poste</Label>
                      <Input value={newEmp.position} onChange={e => setNewEmp({...newEmp, position: e.target.value})} data-testid="emp-position-input" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Salaire</Label>
                        <Input type="number" value={newEmp.salary} onChange={e => setNewEmp({...newEmp, salary: parseFloat(e.target.value) || 0})} />
                      </div>
                      <div>
                        <Label>Contrat</Label>
                        <Select value={newEmp.contract_type} onValueChange={v => setNewEmp({...newEmp, contract_type: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CDI">CDI</SelectItem>
                            <SelectItem value="CDD">CDD</SelectItem>
                            <SelectItem value="Stage">Stage</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>Telephone</Label>
                      <Input value={newEmp.phone} onChange={e => setNewEmp({...newEmp, phone: e.target.value})} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowCreate(false)}>Annuler</Button>
                    <Button onClick={handleCreateEmployee} disabled={creating} data-testid="submit-employee-btn">
                      {creating ? 'Creation...' : 'Creer'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher employe..." value={searchEmp} onChange={e => setSearchEmp(e.target.value)}
                className="pl-10" data-testid="search-employee-input" />
            </div>
          </CardHeader>
          <CardContent>
            {filteredEmps.length > 0 ? (
              <div className="space-y-2">
                {filteredEmps.map(emp => (
                  <div key={emp.id} className={`flex items-center justify-between p-3 rounded-lg border ${emp.is_active === false ? 'opacity-50 bg-red-500/5 border-red-500/20' : 'bg-muted/30'}`}
                    data-testid={`employee-row-${emp.id}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                        {(emp.name || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{emp.name}</p>
                        <p className="text-xs text-muted-foreground">{emp.email || emp.position}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${ROLE_COLORS[emp.role] || 'bg-gray-100 text-gray-600'}`}>
                        {ROLE_LABELS[emp.role] || emp.role}
                      </Badge>
                      {emp.is_active === false && <Badge variant="destructive" className="text-xs">Bloque</Badge>}
                      <div className="flex gap-1 ml-2">
                        {emp.is_active !== false ? (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-500 hover:text-amber-600"
                            onClick={() => handleBlock(emp.id)} title="Bloquer" data-testid={`block-emp-${emp.id}`}>
                            <Ban className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-500 hover:text-emerald-600"
                            onClick={() => handleActivate(emp.id)} title="Activer" data-testid={`activate-emp-${emp.id}`}>
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600"
                          onClick={() => handleDelete(emp.id)} title="Supprimer" data-testid={`delete-emp-${emp.id}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-6 text-sm">Aucun employe</p>
            )}
          </CardContent>
        </Card>

        {/* Activity Log */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" /> Journal d'Activite
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activityLog.length > 0 ? (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {activityLog.map((log, idx) => (
                  <div key={log.id || idx} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{log.user_name}</span>
                        <Badge variant="outline" className="text-[10px]">{ROLE_LABELS[log.user_role] || log.user_role}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{log.details}</p>
                      <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                        {log.created_at ? new Date(log.created_at).toLocaleString('fr-FR') : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-6 text-sm">Aucune activite enregistree</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default OwnerDashboard;
