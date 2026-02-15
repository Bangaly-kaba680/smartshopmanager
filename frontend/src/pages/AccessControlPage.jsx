import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, Clock, CheckCircle, XCircle, UserX, Users, 
  Bell, Loader2, Timer, Infinity
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const AccessControlPage = () => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [authorizedUsers, setAuthorizedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchData();
    // Poll for new requests every 10 seconds
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [requestsRes, authorizedRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/access/requests`),
        axios.get(`${BACKEND_URL}/api/access/authorized`)
      ]);
      
      const pending = requestsRes.data.filter(r => r.status === 'pending');
      setPendingRequests(pending);
      setAuthorizedUsers(authorizedRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveRequest = async (requestId, accessType) => {
    setProcessingId(requestId);
    try {
      await axios.put(`${BACKEND_URL}/api/access/approve/${requestId}`, {
        access_type: accessType
      });
      toast.success(accessType === 'permanent' 
        ? 'Accès permanent accordé!' 
        : 'Accès temporaire (20 min) accordé!'
      );
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de l\'approbation');
    } finally {
      setProcessingId(null);
    }
  };

  const denyRequest = async (requestId) => {
    setProcessingId(requestId);
    try {
      await axios.put(`${BACKEND_URL}/api/access/deny/${requestId}`);
      toast.success('Demande refusée');
      fetchData();
    } catch (error) {
      toast.error('Erreur lors du refus');
    } finally {
      setProcessingId(null);
    }
  };

  const revokeAccess = async (email) => {
    try {
      await axios.delete(`${BACKEND_URL}/api/access/revoke/${encodeURIComponent(email)}`);
      toast.success('Accès révoqué');
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de la révocation');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRemainingTime = (expiresAt) => {
    if (!expiresAt) return null;
    const remaining = new Date(expiresAt) - new Date();
    if (remaining <= 0) return 'Expiré';
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <DashboardLayout title="Contrôle d'Accès">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Contrôle d'Accès">
      <div className="space-y-6" data-testid="access-control-content">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-500/10 rounded-xl">
                  <Bell className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingRequests.length}</p>
                  <p className="text-sm text-muted-foreground">Demandes en attente</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 rounded-xl">
                  <Users className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{authorizedUsers.length}</p>
                  <p className="text-sm text-muted-foreground">Utilisateurs autorisés</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">Actif</p>
                  <p className="text-sm text-muted-foreground">Système de sécurité</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending" className="relative">
              Demandes en attente
              {pendingRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center">
                  {pendingRequests.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="authorized">Utilisateurs autorisés</TabsTrigger>
          </TabsList>

          {/* Pending Requests Tab */}
          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-amber-500" />
                  Demandes d'accès en attente
                </CardTitle>
                <CardDescription>
                  Approuvez ou refusez les demandes d'accès à votre application
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingRequests.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune demande en attente</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingRequests.map((request) => (
                      <div 
                        key={request.id}
                        className="p-4 border rounded-lg bg-amber-500/5 border-amber-500/20"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold">{request.name}</h4>
                              <Badge variant="outline" className="text-amber-500 border-amber-500">
                                <Clock className="h-3 w-3 mr-1" />
                                En attente
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{request.email}</p>
                            {request.reason && (
                              <p className="text-sm mt-2 p-2 bg-muted rounded">
                                <strong>Motif:</strong> {request.reason}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              Demande reçue: {formatDate(request.created_at)}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-emerald-500 text-emerald-500 hover:bg-emerald-500 hover:text-white"
                              onClick={() => approveRequest(request.id, 'permanent')}
                              disabled={processingId === request.id}
                            >
                              {processingId === request.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Infinity className="h-4 w-4 mr-1" />
                                  Permanent
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white"
                              onClick={() => approveRequest(request.id, 'temporary')}
                              disabled={processingId === request.id}
                            >
                              {processingId === request.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Timer className="h-4 w-4 mr-1" />
                                  20 min
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                              onClick={() => denyRequest(request.id)}
                              disabled={processingId === request.id}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Refuser
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Authorized Users Tab */}
          <TabsContent value="authorized">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-emerald-500" />
                  Utilisateurs autorisés
                </CardTitle>
                <CardDescription>
                  Gérez les accès accordés à votre application
                </CardDescription>
              </CardHeader>
              <CardContent>
                {authorizedUsers.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucun utilisateur autorisé</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Utilisateur</TableHead>
                        <TableHead>Type d'accès</TableHead>
                        <TableHead>Temps restant</TableHead>
                        <TableHead>Accordé le</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {authorizedUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{user.name}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {user.access_type === 'permanent' ? (
                              <Badge className="bg-emerald-500">
                                <Infinity className="h-3 w-3 mr-1" />
                                Permanent
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-blue-500/10 text-blue-500">
                                <Timer className="h-3 w-3 mr-1" />
                                Temporaire
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {user.access_type === 'permanent' ? (
                              <span className="text-emerald-500">∞</span>
                            ) : (
                              <span className="font-mono text-blue-500">
                                {getRemainingTime(user.expires_at)}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(user.approved_at)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                              onClick={() => revokeAccess(user.email)}
                            >
                              <UserX className="h-4 w-4 mr-1" />
                              Révoquer
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AccessControlPage;
