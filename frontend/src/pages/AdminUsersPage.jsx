import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { Users, Plus, Edit, Trash2, Ban, CheckCircle, Search, X } from 'lucide-react';
import api from '../lib/api';
import DashboardLayout from '../components/DashboardLayout';

const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'owner', company_name: '', phone: '' });

  const loadUsers = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/users');
      setUsers(data);
    } catch { toast.error('Erreur chargement utilisateurs'); }
    setLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editUser) {
        await api.put(`/admin/users/${editUser.id}`, { name: form.name, role: form.role, company_name: form.company_name, phone: form.phone, is_active: true });
        toast.success('Utilisateur mis à jour');
      } else {
        await api.post('/admin/users', form);
        toast.success('Utilisateur créé');
      }
      setShowModal(false);
      setEditUser(null);
      setForm({ name: '', email: '', password: '', role: 'owner', company_name: '', phone: '' });
      loadUsers();
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur'); }
  };

  const handleSuspend = async (id) => {
    if (!window.confirm('Suspendre cet utilisateur ?')) return;
    try { await api.post(`/admin/users/${id}/suspend`); toast.success('Utilisateur suspendu'); loadUsers(); }
    catch { toast.error('Erreur'); }
  };

  const handleActivate = async (id) => {
    try { await api.post(`/admin/users/${id}/activate`); toast.success('Utilisateur réactivé'); loadUsers(); }
    catch { toast.error('Erreur'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer définitivement cet utilisateur ?')) return;
    try { await api.delete(`/admin/users/${id}`); toast.success('Utilisateur supprimé'); loadUsers(); }
    catch (err) { toast.error(err.response?.data?.detail || 'Erreur'); }
  };

  const openEdit = (user) => {
    setEditUser(user);
    setForm({ name: user.name, email: user.email, password: '', role: user.role, company_name: user.company_name || '', phone: user.phone || '' });
    setShowModal(true);
  };

  const roleColors = { super_admin: 'bg-red-500/20 text-red-400', ceo: 'bg-amber-500/20 text-amber-400', owner: 'bg-emerald-500/20 text-emerald-400', manager: 'bg-blue-500/20 text-blue-400', seller: 'bg-purple-500/20 text-purple-400', cashier: 'bg-cyan-500/20 text-cyan-400' };

  const filtered = users.filter(u => u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()));

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="admin-users-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestion des Utilisateurs</h1>
            <p className="text-muted-foreground text-sm">{users.length} utilisateurs enregistrés</p>
          </div>
          <Button data-testid="add-user-btn" onClick={() => { setEditUser(null); setForm({ name: '', email: '', password: '', role: 'owner', company_name: '', phone: '' }); setShowModal(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Ajouter
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>

        {loading ? <p className="text-muted-foreground">Chargement...</p> : (
          <div className="grid gap-3">
            {filtered.map(user => (
              <Card key={user.id} data-testid={`user-card-${user.id}`} className={`${user.is_active === false || user.is_active === 'false' ? 'opacity-50 border-red-500/30' : ''}`}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      {user.company_name && <p className="text-xs text-muted-foreground">{user.company_name}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${roleColors[user.role] || 'bg-gray-500/20 text-gray-400'}`}>
                      {user.role === 'super_admin' ? 'Super Admin' : user.role}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${user.is_active === false || user.is_active === 'false' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                      {user.is_active === false || user.is_active === 'false' ? 'Suspendu' : 'Actif'}
                    </span>
                    {user.role !== 'super_admin' && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(user)}><Edit className="h-4 w-4" /></Button>
                        {user.is_active === false || user.is_active === 'false' ? (
                          <Button variant="ghost" size="icon" onClick={() => handleActivate(user.id)}><CheckCircle className="h-4 w-4 text-green-500" /></Button>
                        ) : (
                          <Button variant="ghost" size="icon" onClick={() => handleSuspend(user.id)}><Ban className="h-4 w-4 text-orange-500" /></Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(user.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{editUser ? 'Modifier' : 'Nouvel'} Utilisateur</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowModal(false)}><X className="h-4 w-4" /></Button>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input data-testid="user-name-input" placeholder="Nom complet" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required />
                  {!editUser && <Input data-testid="user-email-input" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} required />}
                  {!editUser && <Input data-testid="user-password-input" type="password" placeholder="Mot de passe" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} required />}
                  <select data-testid="user-role-select" value={form.role} onChange={(e) => setForm({...form, role: e.target.value})} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="owner">Propriétaire</option>
                    <option value="manager">Manager</option>
                    <option value="seller">Vendeur</option>
                    <option value="cashier">Caissier</option>
                  </select>
                  <Input placeholder="Nom de l'entreprise" value={form.company_name} onChange={(e) => setForm({...form, company_name: e.target.value})} />
                  <Input placeholder="Téléphone" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} />
                  <Button type="submit" className="w-full" data-testid="user-submit-btn">{editUser ? 'Modifier' : 'Créer'}</Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminUsersPage;
