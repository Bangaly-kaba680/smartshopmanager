import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Building2, Users, ShoppingCart, DollarSign, TrendingUp,
  AlertTriangle, CheckCircle, Clock, MessageSquare, Brain,
  Server, Database, Wifi, Shield, BarChart3, RefreshCw,
  Search, Filter, Eye, Send, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const CEOControlCenter = () => {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketResponse, setTicketResponse] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchDashboard();
    fetchTenants();
    fetchTickets();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/ceo/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboard(res.data);
    } catch (error) {
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTenants = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/ceo/tenants`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTenants(res.data.tenants || []);
    } catch (error) {
      console.error('Tenants error:', error);
    }
  };

  const fetchTickets = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/ceo/support-tickets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTickets(res.data.tickets || []);
    } catch (error) {
      console.error('Tickets error:', error);
    }
  };

  const analyzeTicketWithAI = async (ticketId) => {
    setAnalyzing(true);
    try {
      const res = await axios.post(
        `${BACKEND_URL}/api/ceo/support-tickets/${ticketId}/ai-analyze`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Analyse IA terminée');
      fetchTickets();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, ai_analysis: res.data.ai_analysis });
      }
    } catch (error) {
      toast.error('Erreur lors de l\'analyse');
    } finally {
      setAnalyzing(false);
    }
  };

  const respondToTicket = async (ticketId) => {
    if (!ticketResponse.trim()) return;
    
    try {
      await axios.post(
        `${BACKEND_URL}/api/ceo/support-tickets/${ticketId}/respond`,
        { message: ticketResponse },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Réponse envoyée');
      setTicketResponse('');
      fetchTickets();
    } catch (error) {
      toast.error('Erreur lors de l\'envoi');
    }
  };

  const resolveTicket = async (ticketId) => {
    try {
      await axios.put(
        `${BACKEND_URL}/api/ceo/support-tickets/${ticketId}/resolve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Ticket résolu');
      setSelectedTicket(null);
      fetchTickets();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const StatCard = ({ title, value, icon: Icon, trend, color = "emerald" }) => (
    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">{title}</p>
            <p className={`text-3xl font-bold text-${color}-400 mt-1`}>{value}</p>
            {trend && (
              <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {trend}
              </p>
            )}
          </div>
          <div className={`p-4 rounded-xl bg-${color}-500/20`}>
            <Icon className={`h-8 w-8 text-${color}-400`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const SystemStatus = ({ name, status }) => (
    <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
      <span className="text-sm text-slate-300">{name}</span>
      <Badge className={status === 'OK' ? 'bg-green-500' : 'bg-red-500'}>
        {status}
      </Badge>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <RefreshCw className="h-6 w-6 text-emerald-400 animate-spin" />
          <span className="text-white">Chargement du Control Center...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="bg-slate-900/80 border-b border-slate-800 sticky top-0 z-50 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/assets/bintronix-logo.png" alt="BINTRONIX" className="h-10 w-10 rounded-lg" />
            <div>
              <h1 className="text-xl font-bold text-emerald-400">CEO Control Center</h1>
              <p className="text-xs text-slate-400">SmartShopManager SaaS - BINTRONIX</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => { fetchDashboard(); fetchTenants(); fetchTickets(); }}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
            <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600">
              <Shield className="h-4 w-4 mr-2" />
              Super Admin
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-slate-800 border border-slate-700">
            <TabsTrigger value="overview" className="data-[state=active]:bg-emerald-500">
              <BarChart3 className="h-4 w-4 mr-2" />
              Vue Globale
            </TabsTrigger>
            <TabsTrigger value="tenants" className="data-[state=active]:bg-emerald-500">
              <Building2 className="h-4 w-4 mr-2" />
              Abonnés
            </TabsTrigger>
            <TabsTrigger value="support" className="data-[state=active]:bg-emerald-500">
              <MessageSquare className="h-4 w-4 mr-2" />
              Support IA
            </TabsTrigger>
            <TabsTrigger value="system" className="data-[state=active]:bg-emerald-500">
              <Server className="h-4 w-4 mr-2" />
              Système
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Boutiques Actives"
                value={dashboard?.global_stats?.total_shops || 0}
                icon={Building2}
                color="emerald"
              />
              <StatCard
                title="Utilisateurs"
                value={dashboard?.global_stats?.total_users || 0}
                icon={Users}
                color="cyan"
              />
              <StatCard
                title="Transactions Aujourd'hui"
                value={dashboard?.today?.sales_count || 0}
                icon={ShoppingCart}
                color="purple"
              />
              <StatCard
                title="Revenus Mensuels"
                value={`${(dashboard?.monthly_revenue || 0).toLocaleString()} GNF`}
                icon={DollarSign}
                color="yellow"
              />
            </div>

            {/* Subscriptions & Recent */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Subscription Stats */}
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-emerald-400" />
                    Abonnements par Plan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(dashboard?.subscriptions || {}).map(([plan, count]) => (
                      <div key={plan} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            plan === 'enterprise' ? 'bg-purple-500' :
                            plan === 'business' ? 'bg-emerald-500' :
                            plan === 'starter' ? 'bg-cyan-500' : 'bg-yellow-500'
                          }`} />
                          <span className="capitalize">{plan}</span>
                        </div>
                        <Badge variant="secondary">{count} boutiques</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Tenants */}
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-cyan-400" />
                    Nouveaux Abonnés
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(dashboard?.recent_tenants || []).map((tenant) => (
                      <div key={tenant.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                        <div>
                          <p className="font-medium">{tenant.company_name}</p>
                          <p className="text-xs text-slate-400">{tenant.email}</p>
                        </div>
                        <Badge className={
                          tenant.subscription_plan === 'enterprise' ? 'bg-purple-500' :
                          tenant.subscription_plan === 'business' ? 'bg-emerald-500' : 'bg-cyan-500'
                        }>
                          {tenant.subscription_plan}
                        </Badge>
                      </div>
                    ))}
                    {(!dashboard?.recent_tenants || dashboard.recent_tenants.length === 0) && (
                      <p className="text-center text-slate-500 py-4">Aucun abonné récent</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Open Tickets Alert */}
            {dashboard?.open_tickets > 0 && (
              <Card className="bg-orange-500/10 border-orange-500/30">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-6 w-6 text-orange-400" />
                    <div>
                      <p className="font-medium text-orange-400">{dashboard.open_tickets} tickets en attente</p>
                      <p className="text-sm text-slate-400">Des clients ont besoin d'aide</p>
                    </div>
                  </div>
                  <Button variant="outline" className="border-orange-500 text-orange-400">
                    Voir les tickets
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tenants Tab */}
          <TabsContent value="tenants" className="space-y-6">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Tous les Abonnés</CardTitle>
                    <CardDescription>{tenants.length} entreprises inscrites</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Input placeholder="Rechercher..." className="w-64 bg-slate-800 border-slate-700" />
                    <Button variant="outline" size="icon">
                      <Filter className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-800">
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Entreprise</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Propriétaire</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Plan</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Boutiques</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Utilisateurs</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tenants.map((tenant) => (
                        <tr key={tenant.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                          <td className="py-3 px-4">
                            <p className="font-medium">{tenant.company_name}</p>
                            <p className="text-xs text-slate-500">{tenant.email}</p>
                          </td>
                          <td className="py-3 px-4 text-slate-300">{tenant.owner_name}</td>
                          <td className="py-3 px-4">
                            <Badge className={
                              tenant.subscription_plan === 'enterprise' ? 'bg-purple-500' :
                              tenant.subscription_plan === 'business' ? 'bg-emerald-500' :
                              tenant.subscription_plan === 'starter' ? 'bg-cyan-500' : 'bg-yellow-500'
                            }>
                              {tenant.subscription_plan}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">{tenant.shops_count}</td>
                          <td className="py-3 px-4">{tenant.users_count}</td>
                          <td className="py-3 px-4">
                            {tenant.is_active ? (
                              <Badge className="bg-green-500">Actif</Badge>
                            ) : (
                              <Badge className="bg-red-500">Inactif</Badge>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {tenants.length === 0 && (
                    <p className="text-center text-slate-500 py-8">Aucun abonné pour le moment</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Support Tab */}
          <TabsContent value="support" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Tickets List */}
              <Card className="lg:col-span-1 bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-orange-400" />
                    Tickets Support
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {tickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        onClick={() => setSelectedTicket(ticket)}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedTicket?.id === ticket.id 
                            ? 'bg-emerald-500/20 border border-emerald-500/50' 
                            : 'bg-slate-800/50 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm truncate">{ticket.subject}</span>
                          <Badge className={
                            ticket.status === 'open' ? 'bg-orange-500' :
                            ticket.status === 'in_progress' ? 'bg-blue-500' : 'bg-green-500'
                          } variant="secondary">
                            {ticket.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400 truncate">{ticket.tenant?.company_name}</p>
                        <p className="text-xs text-slate-500">{ticket.priority}</p>
                      </div>
                    ))}
                    {tickets.length === 0 && (
                      <p className="text-center text-slate-500 py-4">Aucun ticket</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Ticket Detail */}
              <Card className="lg:col-span-2 bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-400" />
                    Détail du Ticket & IA
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedTicket ? (
                    <div className="space-y-4">
                      {/* Ticket Info */}
                      <div className="p-4 bg-slate-800/50 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-bold text-lg">{selectedTicket.subject}</h3>
                          <Badge className={
                            selectedTicket.priority === 'urgent' ? 'bg-red-500' :
                            selectedTicket.priority === 'high' ? 'bg-orange-500' : 'bg-blue-500'
                          }>
                            {selectedTicket.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-300 mb-2">{selectedTicket.description}</p>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span>De: {selectedTicket.tenant?.company_name}</span>
                          <span>Catégorie: {selectedTicket.category}</span>
                        </div>
                      </div>

                      {/* AI Analysis */}
                      <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-purple-400 flex items-center gap-2">
                            <Sparkles className="h-4 w-4" />
                            Analyse IA
                          </h4>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="border-purple-500 text-purple-400"
                            onClick={() => analyzeTicketWithAI(selectedTicket.id)}
                            disabled={analyzing}
                          >
                            {analyzing ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Analyse...
                              </>
                            ) : (
                              <>
                                <Brain className="h-4 w-4 mr-2" />
                                Analyser
                              </>
                            )}
                          </Button>
                        </div>
                        {selectedTicket.ai_analysis ? (
                          <p className="text-sm text-slate-300 whitespace-pre-line">
                            {selectedTicket.ai_analysis}
                          </p>
                        ) : (
                          <p className="text-sm text-slate-500 italic">
                            Cliquez sur "Analyser" pour obtenir une suggestion IA
                          </p>
                        )}
                      </div>

                      {/* Response Form */}
                      <div className="space-y-3">
                        <Textarea
                          placeholder="Écrivez votre réponse..."
                          value={ticketResponse}
                          onChange={(e) => setTicketResponse(e.target.value)}
                          className="bg-slate-800 border-slate-700"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button 
                            className="bg-emerald-500 hover:bg-emerald-600"
                            onClick={() => respondToTicket(selectedTicket.id)}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Répondre
                          </Button>
                          <Button 
                            variant="outline"
                            className="border-green-500 text-green-400"
                            onClick={() => resolveTicket(selectedTicket.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Marquer résolu
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-500">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Sélectionnez un ticket pour voir les détails</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* System Health */}
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5 text-green-400" />
                    Santé du Système
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <SystemStatus name="Serveur API" status={dashboard?.system_health?.api || 'OK'} />
                  <SystemStatus name="Base de données PostgreSQL" status={dashboard?.system_health?.database || 'OK'} />
                  <SystemStatus name="Service IA" status={dashboard?.system_health?.ai_service || 'OK'} />
                  <SystemStatus name="Sauvegarde automatique" status="OK" />
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-cyan-400" />
                    Statistiques Rapides
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Total Abonnés</span>
                    <span className="font-bold text-2xl text-emerald-400">{dashboard?.global_stats?.total_tenants || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Abonnés Actifs</span>
                    <span className="font-bold text-2xl text-cyan-400">{dashboard?.global_stats?.active_tenants || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Tickets Ouverts</span>
                    <span className="font-bold text-2xl text-orange-400">{dashboard?.open_tickets || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Revenus Aujourd'hui</span>
                    <span className="font-bold text-lg text-yellow-400">{(dashboard?.today?.revenue || 0).toLocaleString()} GNF</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm">
          <p>© 2026 BINTRONIX - Building the Future | SmartShopManager SaaS v3.0</p>
        </div>
      </footer>
    </div>
  );
};

export default CEOControlCenter;
