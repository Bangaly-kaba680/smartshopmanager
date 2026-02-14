import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { employeesAPI, aiAPI, documentsAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, FileText, PenTool, Download, Loader2, Sparkles, 
  CheckCircle, XCircle, Users, FileSignature
} from 'lucide-react';
import { toast } from 'sonner';

const RHIAPage = () => {
  const [employees, setEmployees] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [empRes, docRes] = await Promise.all([
        employeesAPI.getAll(),
        documentsAPI.getAll()
      ]);
      setEmployees(empRes.data);
      setDocuments(docRes.data);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const generateDocument = async (type) => {
    if (!selectedEmployee) {
      toast.error('Veuillez sélectionner un employé');
      return;
    }

    setGenerating(true);
    try {
      let response;
      switch (type) {
        case 'contract':
          response = await aiAPI.generateContract(selectedEmployee);
          break;
        case 'work':
          response = await aiAPI.generateWorkAttestation(selectedEmployee);
          break;
        case 'stage':
          response = await aiAPI.generateStageAttestation(selectedEmployee);
          break;
        default:
          throw new Error('Type de document inconnu');
      }
      
      setGeneratedContent(response.data);
      setPreviewModalOpen(true);
      toast.success('Document généré avec succès!');
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de la génération');
    } finally {
      setGenerating(false);
    }
  };

  const signDocument = async (docId) => {
    try {
      await documentsAPI.sign(docId);
      toast.success('Document signé!');
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de la signature');
    }
  };

  const downloadPDF = async (docId, docType, empName) => {
    try {
      const response = await documentsAPI.downloadPDF(docId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${docType}_${empName.replace(' ', '_')}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('PDF téléchargé');
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    }
  };

  const getDocTypeLabel = (type) => {
    switch (type) {
      case 'contrat': return 'Contrat de travail';
      case 'attestation_travail': return 'Attestation de travail';
      case 'attestation_stage': return 'Attestation de stage';
      default: return type;
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="RH IA">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="RH IA">
      <div className="space-y-6" data-testid="rh-ia-content">
        <Tabs defaultValue="generate" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="generate" data-testid="tab-generate">
              <Sparkles className="h-4 w-4 mr-2" />
              Génération IA
            </TabsTrigger>
            <TabsTrigger value="documents" data-testid="tab-documents">
              <FileText className="h-4 w-4 mr-2" />
              Documents
            </TabsTrigger>
          </TabsList>

          {/* Generate Tab */}
          <TabsContent value="generate" className="space-y-6">
            {/* Employee Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Sélectionner un Employé
                </CardTitle>
                <CardDescription>
                  Choisissez l'employé pour lequel vous souhaitez générer des documents RH
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger className="max-w-md" data-testid="select-employee">
                    <SelectValue placeholder="Sélectionner un employé" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name} - {emp.position} ({emp.contract_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Document Generation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Contract */}
              <Card className="card-hover">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileSignature className="h-5 w-5 text-primary" />
                    Contrat de Travail
                  </CardTitle>
                  <CardDescription>
                    Générer un contrat de travail complet et conforme au droit sénégalais
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full"
                    disabled={!selectedEmployee || generating}
                    onClick={() => generateDocument('contract')}
                    data-testid="generate-contract"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Génération...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Générer Contrat IA
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Work Attestation */}
              <Card className="card-hover">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5 text-emerald-500" />
                    Attestation de Travail
                  </CardTitle>
                  <CardDescription>
                    Générer une attestation de travail officielle
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full"
                    variant="secondary"
                    disabled={!selectedEmployee || generating}
                    onClick={() => generateDocument('work')}
                    data-testid="generate-work-attestation"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Génération...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Générer Attestation
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Stage Attestation */}
              <Card className="card-hover">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5 text-orange-500" />
                    Attestation de Stage
                  </CardTitle>
                  <CardDescription>
                    Générer une attestation de fin de stage
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full"
                    variant="secondary"
                    disabled={!selectedEmployee || generating}
                    onClick={() => generateDocument('stage')}
                    data-testid="generate-stage-attestation"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Génération...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Générer Attestation
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Documents Générés ({documents.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employé</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Signé</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            Aucun document généré
                          </TableCell>
                        </TableRow>
                      ) : (
                        documents.map((doc) => (
                          <TableRow key={doc.id} className="table-row-hover">
                            <TableCell className="font-medium">{doc.employee_name}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{getDocTypeLabel(doc.type)}</Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                            </TableCell>
                            <TableCell>
                              {doc.signed ? (
                                <Badge className="bg-emerald-500">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Signé
                                </Badge>
                              ) : (
                                <Badge variant="outline">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Non signé
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {!doc.signed && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => signDocument(doc.id)}
                                    data-testid={`sign-doc-${doc.id}`}
                                  >
                                    <PenTool className="h-4 w-4 mr-1" />
                                    Signer
                                  </Button>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => downloadPDF(doc.id, doc.type, doc.employee_name)}
                                  data-testid={`download-doc-${doc.id}`}
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  PDF
                                </Button>
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
          </TabsContent>
        </Tabs>
      </div>

      {/* Preview Modal */}
      <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Document Généré par IA
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="h-[50vh] border rounded-lg p-4">
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
              {generatedContent?.content}
            </div>
          </ScrollArea>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPreviewModalOpen(false)}>
              Fermer
            </Button>
            {generatedContent && !generatedContent.signed && (
              <Button onClick={() => {
                signDocument(generatedContent.id);
                setPreviewModalOpen(false);
              }}>
                <PenTool className="h-4 w-4 mr-2" />
                Signer électroniquement
              </Button>
            )}
            {generatedContent && (
              <Button 
                variant="secondary"
                onClick={() => {
                  downloadPDF(generatedContent.id, generatedContent.type, generatedContent.employee_name);
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Télécharger PDF
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default RHIAPage;
