import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Shield, Users, Clock, CheckCircle, XCircle, Ban, 
  UserPlus, Trash2, Eye, RefreshCw, AlertTriangle,
  FileText, Search, Loader2, Mail, Globe, Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const ROLE_CONFIG = {
  super_admin: { label: 'Super Admin', color: 'bg-red-500', icon: Shield },
  ceo: { label: 'CEO/PDG', color: 'bg-orange-500', icon: Shield },
  manager: { label: 'Manager', color: 'bg-purple-500', icon: Users },
  cashier: { label: 'Caissier', color: 'bg-blue-500', icon: Users },
  stock_manager: { label: 'Stock Manager', color: 'bg-green-500', icon: Users },
  viewer: { label: 'Visiteur', color: 'bg-gray-500', icon: Eye },
};

const SecurityAdminPage = () => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [whitelist, setWhitelist] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Dialog states
  const [addUserDialog, setAddUserDialog] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', name: '', role: 'viewer' });
  const [blockDialog, setBlockDialog] = useState({ open: false, email: '', reason: '' });
  const [approveDialog, setApproveDialog] = useState({ open: false, request: null, role: 'viewer' });

  const fetchData = async () => {
    try {
      const [requestsRes, whitelistRes, blockedRes, auditRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/security/pending-requests`),
        axios.get(`${BACKEND_URL}/api/security/whitelist`),
        axios.get(`${BACKEND_URL}/api/security/blocked-users`),
        axios.get(`${BACKEND_URL}/api/security/audit-log?limit=50`)
      ]);
      
      setPendingRequests(requestsRes.data);
      setWhitelist(whitelistRes.data);
      setBlockedUsers(blockedRes.data);
      setAuditLog(auditRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleApproveRequest = async () => {
    if (!approveDialog.request) return;
    
    try {
      await axios.post(`${BACKEND_URL}/api/security/approve-request`, {
        attempt_id: approveDialog.request.id,
        role: approveDialog.role
      });
      toast.success(`Accès accordé avec le rôle: ${ROLE_CONFIG[approveDialog.role]?.label}`);
      setApproveDialog({ open: false, request: null, role: 'viewer' });
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de l\'approbation');
    }
  };

  const handleDenyRequest = async (attemptId) => {
    try {
      await axios.post(`${BACKEND_URL}/api/security/deny-request/${attemptId}`);
      toast.success('Accès refusé');
      fetchData();
    } catch (error) {
      toast.error('Erreur lors du refus');
    }
  };

  const handleAddToWhitelist = async () => {
    if (!newUser.email || !newUser.name) {
      toast.error('Email et nom requis');
      return;
    }
    
    try {
      await axios.post(`${BACKEND_URL}/api/security/whitelist`, newUser);
      toast.success('Utilisateur ajouté à la liste blanche');
      setAddUserDialog(false);
      setNewUser({ email: '', name: '', role: 'viewer' });
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de l\'ajout');
    }
  };

  const handleRemoveFromWhitelist = async (email) => {
    try {
      await axios.delete(`${BACKEND_URL}/api/security/whitelist/${encodeURIComponent(email)}`);
      toast.success('Utilisateur retiré');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
    }
  };

  const handleBlockUser = async () => {
    if (!blockDialog.email) return;
    
    try {
      await axios.post(`${BACKEND_URL}/api/security/block`, {
        email: blockDialog.email,
        reason: blockDialog.reason
      });
      toast.success('Utilisateur bloqué');
      setBlockDialog({ open: false, email: '', reason: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors du blocage');
    }
  };

  const handleUnblockUser = async (email) => {
    try {
      await axios.post(`${BACKEND_URL}/api/security/unblock/${encodeURIComponent(email)}`);
      toast.success('Utilisateur débloqué');
      fetchData();
    } catch (error) {
      toast.error('Erreur lors du déblocage');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Centre de Sécurité
            </h1>
            <p className="text-muted-foreground">Gérez les accès et la sécurité de votre application</p>
          </div>
          <Button onClick={handleRefresh} variant="outline" disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingRequests.length}</p>
                  <p className="text-sm text-muted-foreground">En attente</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{whitelist.length}</p>
                  <p className="text-sm text-muted-foreground">Autorisés</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <Ban className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{blockedUsers.length}</p>
                  <p className="text-sm text-muted-foreground">Bloqués</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{auditLog.length}</p>
                  <p className="text-sm text-muted-foreground">Actions audit</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pending" className="relative">
              Demandes
              {pendingRequests.length > 0 && (
                <Badge className="ml-2 bg-red-500 text-white">{pendingRequests.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="whitelist">Liste Blanche</TabsTrigger>
            <TabsTrigger value="blocked">Bloqués</TabsTrigger>
            <TabsTrigger value="audit">Journal d'Audit</TabsTrigger>
          </TabsList>

          {/* Pending Requests Tab */}
          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle>Demandes d'Accès en Attente</CardTitle>
                <CardDescription>Approuvez ou refusez les demandes d'accès</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>Aucune demande en attente</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingRequests.map((request) => (
                      <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                            <Clock className="h-5 w-5 text-yellow-600" />
                          </div>
                          <div>
                            <p className="font-medium">{request.name}</p>
                            <p className="text-sm text-muted-foreground">{request.email}</p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <Globe className="h-3 w-3" />
                              <span>{request.ip_address || 'IP inconnue'}</span>
                              <Calendar className="h-3 w-3 ml-2" />
                              <span>{formatDate(request.created_at)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-green-600 border-green-600 hover:bg-green-50"
                            onClick={() => setApproveDialog({ open: true, request, role: 'viewer' })}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approuver
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-red-600 border-red-600 hover:bg-red-50"
                            onClick={() => handleDenyRequest(request.id)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Refuser
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Whitelist Tab */}
          <TabsContent value="whitelist">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Liste Blanche</CardTitle>
                  <CardDescription>Utilisateurs autorisés à accéder à l'application</CardDescription>
                </div>
                <Button onClick={() => setAddUserDialog(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Ajouter
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {whitelist.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${ROLE_CONFIG[user.role]?.color || 'bg-gray-500'} bg-opacity-20`}>
                          {React.createElement(ROLE_CONFIG[user.role]?.icon || Users, { 
                            className: `h-5 w-5 ${user.role === 'super_admin' ? 'text-red-600' : 'text-current'}` 
                          })}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{user.name}</p>
                            {user.is_super_admin && (
                              <Badge className="bg-red-500 text-white text-xs">SUPER ADMIN</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{ROLE_CONFIG[user.role]?.label || user.role}</Badge>
                        {!user.is_super_admin && (
                          <div className="flex gap-1">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="text-red-600 hover:bg-red-50"
                              onClick={() => setBlockDialog({ open: true, email: user.email, reason: '' })}
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="text-red-600 hover:bg-red-50"
                              onClick={() => handleRemoveFromWhitelist(user.email)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Blocked Users Tab */}
          <TabsContent value="blocked">
            <Card>
              <CardHeader>
                <CardTitle>Utilisateurs Bloqués</CardTitle>
                <CardDescription>Ces utilisateurs ne peuvent pas accéder à l'application</CardDescription>
              </CardHeader>
              <CardContent>
                {blockedUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>Aucun utilisateur bloqué</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {blockedUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg border-red-200 bg-red-50 dark:bg-red-900/10">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                            <Ban className="h-5 w-5 text-red-600" />
                          </div>
                          <div>
                            <p className="font-medium">{user.email}</p>
                            <p className="text-sm text-muted-foreground">
                              Raison: {user.reason || 'Non spécifiée'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Bloqué le: {formatDate(user.blocked_at)}
                            </p>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleUnblockUser(user.email)}
                        >
                          Débloquer
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Log Tab */}
          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <CardTitle>Journal d'Audit</CardTitle>
                <CardDescription>Historique de toutes les actions de sécurité</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {auditLog.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 p-3 border rounded-lg text-sm">
                      <div className="p-1.5 bg-muted rounded">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{log.action}</Badge>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-medium">{log.resource}</span>
                        </div>
                        <p className="text-muted-foreground mt-1">
                          Par: {log.user_email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(log.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Approve Dialog */}
      <Dialog open={approveDialog.open} onOpenChange={(open) => setApproveDialog({ ...approveDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approuver l'Accès</DialogTitle>
            <DialogDescription>
              Choisissez le rôle pour {approveDialog.request?.name} ({approveDialog.request?.email})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rôle</Label>
              <Select value={approveDialog.role} onValueChange={(v) => setApproveDialog({ ...approveDialog, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">👁️ Visiteur (Lecture seule)</SelectItem>
                  <SelectItem value="cashier">💰 Caissier (Ventes uniquement)</SelectItem>
                  <SelectItem value="stock_manager">📦 Stock Manager</SelectItem>
                  <SelectItem value="manager">👔 Manager (Créer/Modifier)</SelectItem>
                  <SelectItem value="ceo">🏢 CEO/PDG (Accès complet)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialog({ open: false, request: null, role: 'viewer' })}>
              Annuler
            </Button>
            <Button onClick={handleApproveRequest} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="h-4 w-4 mr-2" />
              Approuver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={addUserDialog} onOpenChange={setAddUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter à la Liste Blanche</DialogTitle>
            <DialogDescription>
              Ajoutez manuellement un utilisateur autorisé
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input 
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="Nom complet"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input 
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="email@exemple.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Rôle</Label>
              <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">👁️ Visiteur</SelectItem>
                  <SelectItem value="cashier">💰 Caissier</SelectItem>
                  <SelectItem value="stock_manager">📦 Stock Manager</SelectItem>
                  <SelectItem value="manager">👔 Manager</SelectItem>
                  <SelectItem value="ceo">🏢 CEO/PDG</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddUserDialog(false)}>Annuler</Button>
            <Button onClick={handleAddToWhitelist}>
              <UserPlus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block User Dialog */}
      <Dialog open={blockDialog.open} onOpenChange={(open) => setBlockDialog({ ...blockDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Bloquer l'Utilisateur</DialogTitle>
            <DialogDescription>
              Bloquer {blockDialog.email} ? Cette action révoquera tous ses accès.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Raison (optionnel)</Label>
              <Input 
                value={blockDialog.reason}
                onChange={(e) => setBlockDialog({ ...blockDialog, reason: e.target.value })}
                placeholder="Raison du blocage..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialog({ open: false, email: '', reason: '' })}>
              Annuler
            </Button>
            <Button onClick={handleBlockUser} className="bg-red-600 hover:bg-red-700">
              <Ban className="h-4 w-4 mr-2" />
              Bloquer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default SecurityAdminPage;
