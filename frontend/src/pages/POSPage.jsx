import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { productsAPI, salesAPI, messagingAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Search, QrCode, ShoppingCart, Plus, Minus, Trash2, 
  CreditCard, Smartphone, Banknote, Send, MessageSquare, Loader2, X
} from 'lucide-react';
import { toast } from 'sonner';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('fr-FR', { style: 'decimal' }).format(value) + ' GNF';
};

const POSPage = () => {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [customerPhone, setCustomerPhone] = useState('');
  const [processing, setProcessing] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await productsAPI.getAll();
      setProducts(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des produits');
    } finally {
      setLoading(false);
    }
  };

  const categories = ['all', ...new Set(products.map(p => p.category))];

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    toast.success(`${product.name} ajouté au panier`);
  };

  const updateQuantity = (productId, delta) => {
    setCart(cart.map(item => {
      if (item.id === productId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handlePayment = async () => {
    if (cart.length === 0) {
      toast.error('Le panier est vide');
      return;
    }

    setProcessing(true);
    try {
      const saleData = {
        items: cart.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          price: item.price
        })),
        payment_method: paymentMethod,
        customer_phone: customerPhone || null
      };

      const response = await salesAPI.create(saleData);
      setLastSale(response.data);
      setCart([]);
      setPaymentModalOpen(false);
      setReceiptModalOpen(true);
      toast.success('Vente enregistrée avec succès!');
    } catch (error) {
      toast.error('Erreur lors du paiement');
    } finally {
      setProcessing(false);
    }
  };

  const sendReceipt = async (method) => {
    if (!lastSale || !customerPhone) {
      toast.error('Numéro de téléphone requis');
      return;
    }

    try {
      if (method === 'whatsapp') {
        await messagingAPI.sendWhatsApp(customerPhone, lastSale.id);
        toast.success('Reçu envoyé via WhatsApp');
      } else {
        await messagingAPI.sendSMS(customerPhone, lastSale.id);
        toast.success('Reçu envoyé par SMS');
      }
    } catch (error) {
      toast.error("Erreur lors de l'envoi");
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Point de Vente (POS)">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Point de Vente (POS)">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]" data-testid="pos-content">
        {/* Products Section */}
        <div className="lg:col-span-2 flex flex-col">
          {/* Search & Filters */}
          <div className="mb-4 space-y-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Rechercher un produit..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="pos-search"
                />
              </div>
              <Button variant="outline" data-testid="scan-qr-btn">
                <QrCode className="h-4 w-4 mr-2" />
                Scanner QR
              </Button>
            </div>
            
            {/* Category Pills */}
            <div className="flex gap-2 flex-wrap">
              {categories.map(cat => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  data-testid={`category-${cat}`}
                >
                  {cat === 'all' ? 'Tous' : cat}
                </Button>
              ))}
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filteredProducts.map(product => (
                <Card 
                  key={product.id} 
                  className="pos-product-card cursor-pointer"
                  onClick={() => addToCart(product)}
                  data-testid={`product-${product.id}`}
                >
                  <CardContent className="p-4">
                    <div className="aspect-square bg-muted rounded-lg mb-3 flex items-center justify-center">
                      <span className="text-3xl">📦</span>
                    </div>
                    <h3 className="font-medium text-sm truncate">{product.name}</h3>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-bold text-primary">{formatCurrency(product.price)}</span>
                      <Badge variant="secondary" className="text-xs">
                        Stock: {product.stock_quantity}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Cart Section */}
        <Card className="flex flex-col" data-testid="cart-section">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Panier ({cart.length})
              </CardTitle>
              {cart.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearCart} data-testid="clear-cart">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-auto p-4">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mb-2 opacity-50" />
                <p>Panier vide</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{formatCurrency(item.price)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.id, -1)}
                        data-testid={`decrease-${item.id}`}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.id, 1)}
                        data-testid={`increase-${item.id}`}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeFromCart(item.id)}
                      data-testid={`remove-${item.id}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>

          {/* Total & Pay */}
          <div className="border-t p-4 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Total</span>
              <span className="text-2xl font-bold text-primary">{formatCurrency(total)}</span>
            </div>
            <Button 
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg h-12"
              disabled={cart.length === 0}
              onClick={() => setPaymentModalOpen(true)}
              data-testid="pay-btn"
            >
              Payer
            </Button>
          </div>
        </Card>
      </div>

      {/* Payment Modal */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mode de Paiement</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              <div className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50" onClick={() => setPaymentMethod('cash')}>
                <RadioGroupItem value="cash" id="cash" />
                <Banknote className="h-5 w-5 text-emerald-500" />
                <Label htmlFor="cash" className="flex-1 cursor-pointer">Espèces (Cash)</Label>
              </div>
              <div className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50" onClick={() => setPaymentMethod('orange_money')}>
                <RadioGroupItem value="orange_money" id="orange" />
                <Smartphone className="h-5 w-5 text-orange-500" />
                <Label htmlFor="orange" className="flex-1 cursor-pointer">Orange Money</Label>
              </div>
              <div className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50" onClick={() => setPaymentMethod('card')}>
                <RadioGroupItem value="card" id="card" />
                <CreditCard className="h-5 w-5 text-blue-500" />
                <Label htmlFor="card" className="flex-1 cursor-pointer">Carte Bancaire</Label>
              </div>
            </RadioGroup>

            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone client (optionnel)</Label>
              <Input 
                id="phone"
                placeholder="+221 77 xxx xxxx"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                data-testid="customer-phone"
              />
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between text-lg font-bold">
                <span>Total à payer</span>
                <span className="text-primary">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentModalOpen(false)}>
              Annuler
            </Button>
            <Button 
              className="bg-orange-500 hover:bg-orange-600"
              onClick={handlePayment}
              disabled={processing}
              data-testid="confirm-payment"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Traitement...
                </>
              ) : (
                'Confirmer le paiement'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Modal */}
      <Dialog open={receiptModalOpen} onOpenChange={setReceiptModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Vente Réussie!</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingCart className="h-8 w-8 text-emerald-500" />
              </div>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(lastSale?.total || 0)}</p>
              <p className="text-muted-foreground">Transaction #{lastSale?.id?.slice(0, 8)}</p>
            </div>

            {customerPhone && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Envoyer le reçu au {customerPhone}</p>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => sendReceipt('whatsapp')}
                    data-testid="send-whatsapp"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    WhatsApp
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => sendReceipt('sms')}
                    data-testid="send-sms"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    SMS
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setReceiptModalOpen(false)} className="w-full">
              Nouvelle Vente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default POSPage;
