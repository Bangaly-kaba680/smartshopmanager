import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertTriangle, Plus, RefreshCw, Brain, Clock, CheckCircle,
  AlertOctagon, Shield, Activity, FileText, Search, Filter,
  ChevronRight, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const IRPPage = () => {
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  
  const [newIncident, setNewIncident] = useState({
    title: '',
    description: '',
    severity: 'medium',
    category: 'technical',
    affected_area: ''
  });

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchIncidents();
    fetchStats();
  }, []);

  const fetchIncidents = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/irp/incidents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIncidents(res.data.incidents || []);
    } catch (error) {
      console.error('Error fetching incidents:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/irp/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const createIncident = async () => {
    try {
      const res = await axios.post(`${BACKEND_URL}/api/irp/incidents`, newIncident, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Incident créé');
      setShowCreateDialog(false);
      setNewIncident({ title: '', description: '', severity: 'medium', category: 'technical', affected_area: '' });
      fetchIncidents();
      fetchStats();
    } catch (error) {
      toast.error('Erreur lors de la création');
    }
  };

  const analyzeWithAI = async (incidentId) => {
    setAnalyzing(true);
    try {
      const res = await axios.post(
        `${BACKEND_URL}/api/irp/incidents/${incidentId}/ai-analyze`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Analyse IA terminée');
      fetchIncidents();
      if (selectedIncident?.id === incidentId) {
        setSelectedIncident({ ...selectedIncident, ai_analysis: res.data.ai_analysis });
      }
    } catch (error) {
      toast.error('Erreur lors de l\'analyse');
    } finally {
      setAnalyzing(false);
    }
  };

  const updateIncidentStatus = async (incidentId, status) => {
    try {
      await axios.put(
        `${BACKEND_URL}/api/irp/incidents/${incidentId}`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Status mis à jour');
      fetchIncidents();
      fetchStats();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-red-500';
      case 'in_progress': return 'bg-yellow-500';
      case 'resolved': return 'bg-green-500';
      case 'closed': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <DashboardLayout title="IRP - Gestion des Incidents">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-500/20 rounded-xl">
              <Shield className="h-8 w-8 text-red-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">IRP - Plan de Réponse aux Incidents</h1>
              <p className="text-muted-foreground">Gérez et résolvez les incidents avec l'aide de l'IA</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { fetchIncidents(); fetchStats(); }}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-red-500 hover:bg-red-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvel Incident
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    Créer un Incident
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Titre</Label>
                    <Input
                      placeholder="Titre de l'incident"
                      value={newIncident.title}
                      onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Décrivez l'incident en détail..."
                      value={newIncident.description}
                      onChange={(e) => setNewIncident({ ...newIncident, description: e.target.value })}
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Sévérité</Label>
                      <Select
                        value={newIncident.severity}
                        onValueChange={(value) => setNewIncident({ ...newIncident, severity: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="critical">🔴 Critique</SelectItem>
                          <SelectItem value="high">🟠 Haute</SelectItem>
                          <SelectItem value="medium">🟡 Moyenne</SelectItem>
                          <SelectItem value="low">🔵 Basse</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Catégorie</Label>
                      <Select
                        value={newIncident.category}
                        onValueChange={(value) => setNewIncident({ ...newIncident, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="technical">Technique</SelectItem>
                          <SelectItem value="security">Sécurité</SelectItem>
                          <SelectItem value="performance">Performance</SelectItem>
                          <SelectItem value="business">Business</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Zone Affectée</Label>
                    <Input
                      placeholder="Ex: Module POS, API, Base de données..."
                      value={newIncident.affected_area}
                      onChange={(e) => setNewIncident({ ...newIncident, affected_area: e.target.value })}
                    />
                  </div>

                  <Button onClick={createIncident} className="w-full bg-red-500 hover:bg-red-600">
                    Créer l'Incident
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-red-500/10 border-red-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-400">Ouverts</p>
                    <p className="text-3xl font-bold text-red-500">{stats.open}</p>
                  </div>
                  <AlertOctagon className="h-8 w-8 text-red-500/50" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-yellow-500/10 border-yellow-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-yellow-400">En cours</p>
                    <p className="text-3xl font-bold text-yellow-500">{stats.in_progress}</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-500/50" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-green-500/10 border-green-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-400">Résolus</p>
                    <p className="text-3xl font-bold text-green-500">{stats.resolved}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500/50" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-slate-500/10 border-slate-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">Total</p>
                    <p className="text-3xl font-bold">{stats.total}</p>
                  </div>
                  <Activity className="h-8 w-8 text-slate-500/50" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Incidents List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-red-500" />
                Incidents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {loading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </div>
                ) : incidents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Aucun incident</p>
                    <p className="text-xs">Tout fonctionne bien! 🎉</p>
                  </div>
                ) : (
                  incidents.map((incident) => (
                    <div
                      key={incident.id}
                      onClick={() => setSelectedIncident(incident)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedIncident?.id === incident.id
                          ? 'bg-primary/20 border border-primary/50'
                          : 'bg-muted/50 hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm truncate">{incident.title}</span>
                        <Badge className={getSeverityColor(incident.severity)} variant="secondary">
                          {incident.severity}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge className={getStatusColor(incident.status)} variant="outline">
                          {incident.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{incident.category}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Incident Detail */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-500" />
                Détail & Analyse IA
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedIncident ? (
                <div className="space-y-4">
                  {/* Incident Info */}
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-lg">{selectedIncident.title}</h3>
                      <div className="flex gap-2">
                        <Badge className={getSeverityColor(selectedIncident.severity)}>
                          {selectedIncident.severity}
                        </Badge>
                        <Badge className={getStatusColor(selectedIncident.status)}>
                          {selectedIncident.status}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{selectedIncident.description}</p>
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span>Catégorie: {selectedIncident.category}</span>
                      <span>Zone: {selectedIncident.affected_area || 'Non spécifiée'}</span>
                      <span>Créé: {new Date(selectedIncident.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>

                  {/* Status Actions */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={selectedIncident.status === 'open' ? 'default' : 'outline'}
                      onClick={() => updateIncidentStatus(selectedIncident.id, 'open')}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      Ouvert
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedIncident.status === 'in_progress' ? 'default' : 'outline'}
                      onClick={() => updateIncidentStatus(selectedIncident.id, 'in_progress')}
                      className="bg-yellow-500 hover:bg-yellow-600"
                    >
                      En cours
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedIncident.status === 'resolved' ? 'default' : 'outline'}
                      onClick={() => updateIncidentStatus(selectedIncident.id, 'resolved')}
                      className="bg-green-500 hover:bg-green-600"
                    >
                      Résolu
                    </Button>
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
                        onClick={() => analyzeWithAI(selectedIncident.id)}
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
                    {selectedIncident.ai_analysis ? (
                      <div className="text-sm whitespace-pre-line">
                        {selectedIncident.ai_analysis}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        Cliquez sur "Analyser" pour obtenir des suggestions IA pour résoudre cet incident.
                      </p>
                    )}
                  </div>

                  {/* Timeline */}
                  {selectedIncident.timeline && selectedIncident.timeline.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Chronologie</h4>
                      <div className="space-y-2">
                        {selectedIncident.timeline.map((event, idx) => (
                          <div key={idx} className="flex items-center gap-3 text-sm">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                            <span className="text-muted-foreground">{event.action}</span>
                            <span className="text-xs text-muted-foreground">
                              - {event.by} ({new Date(event.at).toLocaleString('fr-FR')})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Shield className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Sélectionnez un incident pour voir les détails</p>
                  <p className="text-sm">Ou créez un nouvel incident</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default IRPPage;
