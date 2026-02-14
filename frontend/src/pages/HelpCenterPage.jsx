import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { aiAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  HelpCircle, Search, MessageSquare, Package, ShoppingCart, 
  Boxes, FileText, Loader2, Send, Bot
} from 'lucide-react';
import { toast } from 'sonner';

const guides = [
  {
    id: 'add-product',
    icon: Package,
    title: 'Ajouter un produit',
    category: 'Produits',
    content: `
1. Allez dans "Produits" depuis le menu latéral
2. Cliquez sur "Ajouter un produit"
3. Remplissez les informations:
   - Nom du produit
   - Catégorie
   - Prix
   - Description (optionnel)
4. Cliquez sur "Ajouter" pour sauvegarder

Conseil: Ajoutez ensuite du stock via la page "Stock" pour rendre le produit disponible à la vente.
    `
  },
  {
    id: 'make-sale',
    icon: ShoppingCart,
    title: 'Faire une vente',
    category: 'Ventes',
    content: `
1. Accédez à "Ventes (POS)" depuis le menu
2. Recherchez ou parcourez les produits
3. Cliquez sur un produit pour l'ajouter au panier
4. Ajustez les quantités si nécessaire
5. Cliquez sur "Payer"
6. Choisissez le mode de paiement:
   - Espèces
   - Orange Money
   - Carte bancaire
7. Entrez le numéro du client (optionnel)
8. Confirmez le paiement

Après la vente, vous pouvez envoyer le reçu par WhatsApp ou SMS.
    `
  },
  {
    id: 'manage-stock',
    icon: Boxes,
    title: 'Gérer le stock',
    category: 'Stock',
    content: `
1. Allez dans "Stock" depuis le menu
2. Pour ajouter un nouveau lot:
   - Cliquez sur "Nouveau Lot"
   - Sélectionnez le produit
   - Indiquez la taille et couleur
   - Entrez la quantité
3. Pour générer un QR Code:
   - Cliquez sur "Générer" à côté du lot
   - Téléchargez et imprimez le QR
4. Pour modifier un lot:
   - Cliquez sur l'icône crayon
   - Modifiez la quantité
   - Sauvegardez

Le stock se met à jour automatiquement après chaque vente.
    `
  },
  {
    id: 'generate-contract',
    icon: FileText,
    title: 'Générer un contrat',
    category: 'RH IA',
    content: `
1. Accédez à "RH IA" (PDG uniquement)
2. Sélectionnez un employé dans la liste
3. Choisissez le type de document:
   - Contrat de travail
   - Attestation de travail
   - Attestation de stage
4. Cliquez sur "Générer"
5. L'IA génère le document automatiquement
6. Prévisualisez le contenu
7. Signez électroniquement si satisfait
8. Téléchargez le PDF

Les documents sont sauvegardés et accessibles dans l'onglet "Documents".
    `
  }
];

const HelpCenterPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const filteredGuides = guides.filter(g => 
    g.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAskAI = async () => {
    if (!question.trim()) return;

    const userMessage = question;
    setQuestion('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await aiAPI.getHelp(userMessage);
      setChatHistory(prev => [...prev, { role: 'assistant', content: response.data.response }]);
    } catch (error) {
      toast.error('Erreur lors de la réponse');
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: 'Désolé, je ne peux pas répondre pour le moment. Veuillez réessayer.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="Centre d'aide">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" data-testid="help-content">
        {/* Guides Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher dans les guides..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="search-help"
            />
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {guides.map(guide => (
              <Card 
                key={guide.id} 
                className="card-hover cursor-pointer"
                onClick={() => document.getElementById(guide.id)?.scrollIntoView({ behavior: 'smooth' })}
              >
                <CardContent className="p-4 text-center">
                  <guide.icon className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="text-sm font-medium">{guide.title}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Guides Accordion */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Guides d'utilisation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {filteredGuides.map(guide => (
                  <AccordionItem key={guide.id} value={guide.id} id={guide.id}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3">
                        <guide.icon className="h-5 w-5 text-muted-foreground" />
                        <div className="text-left">
                          <p className="font-medium">{guide.title}</p>
                          <p className="text-xs text-muted-foreground">{guide.category}</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pl-8 prose prose-sm dark:prose-invert max-w-none whitespace-pre-line">
                        {guide.content}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </div>

        {/* AI Assistant */}
        <Card className="h-fit lg:sticky lg:top-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Assistant IA
            </CardTitle>
            <CardDescription>
              Posez vos questions, je suis là pour vous aider
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Chat History */}
            <ScrollArea className="h-[300px] border rounded-lg p-4">
              {chatHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mb-2 opacity-50" />
                  <p className="text-sm text-center">
                    Posez une question pour commencer
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {chatHistory.map((msg, idx) => (
                    <div 
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-[85%] p-3 rounded-lg ${
                          msg.role === 'user' 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-muted p-3 rounded-lg">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Input */}
            <div className="flex gap-2">
              <Input 
                placeholder="Tapez votre question..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
                disabled={loading}
                data-testid="ai-question"
              />
              <Button 
                size="icon"
                onClick={handleAskAI}
                disabled={loading || !question.trim()}
                data-testid="ask-ai-btn"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default HelpCenterPage;
