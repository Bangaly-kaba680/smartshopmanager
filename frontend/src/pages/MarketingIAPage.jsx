import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { aiAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Megaphone, Briefcase, ShoppingBag, Sparkles, Loader2, 
  Copy, Facebook, MessageSquare, CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

const MarketingIAPage = () => {
  const [activeTab, setActiveTab] = useState('product');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: ''
  });
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!formData.title || !formData.description) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setGenerating(true);
    try {
      const response = activeTab === 'product' 
        ? await aiAPI.generateProductAd({
            type: 'product_ad',
            title: formData.title,
            description: formData.description,
            price: formData.price ? parseFloat(formData.price) : null
          })
        : await aiAPI.generateJobOffer({
            type: 'job_offer',
            title: formData.title,
            description: formData.description
          });
      
      setGeneratedContent(response.data.content);
      toast.success('Contenu généré avec succès!');
    } catch (error) {
      toast.error('Erreur lors de la génération');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    toast.success('Copié dans le presse-papier!');
    setTimeout(() => setCopied(false), 2000);
  };

  const resetForm = () => {
    setFormData({ title: '', description: '', price: '' });
    setGeneratedContent('');
  };

  return (
    <DashboardLayout title="Marketing IA">
      <div className="space-y-6" data-testid="marketing-ia-content">
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); resetForm(); }}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="product" data-testid="tab-product">
              <ShoppingBag className="h-4 w-4 mr-2" />
              Publicité Produit
            </TabsTrigger>
            <TabsTrigger value="job" data-testid="tab-job">
              <Briefcase className="h-4 w-4 mr-2" />
              Offre d'Emploi
            </TabsTrigger>
          </TabsList>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Input Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-orange-500" />
                  {activeTab === 'product' ? 'Créer une Publicité' : 'Créer une Offre'}
                </CardTitle>
                <CardDescription>
                  {activeTab === 'product' 
                    ? 'Décrivez votre produit pour générer du contenu marketing' 
                    : 'Décrivez le poste pour générer une offre d\'emploi'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TabsContent value="product" className="mt-0 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Nom du produit</Label>
                    <Input
                      id="title"
                      placeholder="Ex: Robe Élégante Collection Été"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      data-testid="product-title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Décrivez le produit, ses caractéristiques, matériaux..."
                      rows={4}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      data-testid="product-description"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Prix (GNF)</Label>
                    <Input
                      id="price"
                      type="number"
                      placeholder="35000"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      data-testid="product-price"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="job" className="mt-0 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Titre du poste</Label>
                    <Input
                      id="title"
                      placeholder="Ex: Manager Commercial"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      data-testid="job-title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description du poste</Label>
                    <Textarea
                      id="description"
                      placeholder="Décrivez les responsabilités, compétences requises..."
                      rows={6}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      data-testid="job-description"
                    />
                  </div>
                </TabsContent>

                <Button 
                  className="w-full mt-4 bg-orange-500 hover:bg-orange-600"
                  disabled={generating || !formData.title || !formData.description}
                  onClick={handleGenerate}
                  data-testid="generate-marketing"
                >
                  {generating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Génération en cours...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Générer avec l'IA
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Preview */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Aperçu du Contenu
                  </CardTitle>
                  {generatedContent && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={copyToClipboard}
                      data-testid="copy-content"
                    >
                      {copied ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1 text-emerald-500" />
                          Copié!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-1" />
                          Copier tout
                        </>
                      )}
                    </Button>
                  )}
                </div>
                <CardDescription>
                  Contenu optimisé pour Facebook et WhatsApp
                </CardDescription>
              </CardHeader>
              <CardContent>
                {generatedContent ? (
                  <ScrollArea className="h-[400px] border rounded-lg p-4">
                    <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                      {generatedContent}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="h-[400px] border rounded-lg flex flex-col items-center justify-center text-muted-foreground">
                    <div className="flex gap-4 mb-4">
                      <Facebook className="h-8 w-8 opacity-50" />
                      <MessageSquare className="h-8 w-8 opacity-50" />
                    </div>
                    <p>Le contenu généré apparaîtra ici</p>
                    <p className="text-sm">Optimisé pour Facebook et WhatsApp</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </Tabs>

        {/* Tips */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Conseils pour un meilleur résultat</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">📸 Ajoutez une image</h4>
                <p className="text-sm text-muted-foreground">
                  Les publications avec images obtiennent 2.3x plus d'engagement
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">⏰ Publiez au bon moment</h4>
                <p className="text-sm text-muted-foreground">
                  Les meilleurs horaires: 9h-11h et 18h-20h
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">📞 Call-to-action</h4>
                <p className="text-sm text-muted-foreground">
                  N'oubliez pas d'ajouter votre numéro WhatsApp
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default MarketingIAPage;
