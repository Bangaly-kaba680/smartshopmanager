import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { accountsAPI, salesAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  DollarSign, Banknote, Smartphone, Building2, 
  TrendingUp, TrendingDown, ArrowUpRight
} from 'lucide-react';
import { toast } from 'sonner';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('fr-FR', { style: 'decimal' }).format(value) + ' FCFA';
};

const FinancesPage = () => {
  const [accounts, setAccounts] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [accRes, salesRes] = await Promise.all([
        accountsAPI.getAll(),
        salesAPI.getAll()
      ]);
      setAccounts(accRes.data);
      setSales(salesRes.data);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const cashAccount = accounts.find(a => a.type === 'cash');
  const orangeAccount = accounts.find(a => a.type === 'orange_money');
  const bankAccount = accounts.find(a => a.type === 'bank');
  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  // Chart data
  const pieData = [
    { name: 'Cash', value: cashAccount?.balance || 0, color: '#10B981' },
    { name: 'Orange Money', value: orangeAccount?.balance || 0, color: '#F97316' },
    { name: 'Banque', value: bankAccount?.balance || 0, color: '#3B82F6' },
  ].filter(d => d.value > 0);

  // Mock trend data
  const trendData = [
    { date: 'Jan', value: 1500000 },
    { date: 'Fév', value: 1800000 },
    { date: 'Mar', value: 2200000 },
    { date: 'Avr', value: 2000000 },
    { date: 'Mai', value: 2500000 },
    { date: 'Juin', value: 3000000 },
  ];

  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case 'cash': return <Banknote className="h-4 w-4 text-emerald-500" />;
      case 'orange_money': return <Smartphone className="h-4 w-4 text-orange-500" />;
      case 'card': return <Building2 className="h-4 w-4 text-blue-500" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  const getPaymentMethodLabel = (method) => {
    switch (method) {
      case 'cash': return 'Espèces';
      case 'orange_money': return 'Orange Money';
      case 'card': return 'Carte';
      default: return method;
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Finances">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Finances">
      <div className="space-y-6" data-testid="finances-content">
        {/* Balance Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total */}
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <DollarSign className="h-8 w-8 opacity-80" />
                <ArrowUpRight className="h-5 w-5" />
              </div>
              <p className="text-sm opacity-80">Solde Total</p>
              <p className="text-2xl font-bold">{formatCurrency(totalBalance)}</p>
            </CardContent>
          </Card>

          {/* Cash */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <Banknote className="h-6 w-6 text-emerald-500" />
                </div>
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +5%
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">Cash</p>
              <p className="text-xl font-bold">{formatCurrency(cashAccount?.balance || 0)}</p>
            </CardContent>
          </Card>

          {/* Orange Money */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Smartphone className="h-6 w-6 text-orange-500" />
                </div>
                <Badge variant="secondary" className="bg-orange-500/10 text-orange-500">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +12%
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">Orange Money</p>
              <p className="text-xl font-bold">{formatCurrency(orangeAccount?.balance || 0)}</p>
            </CardContent>
          </Card>

          {/* Bank */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Building2 className="h-6 w-6 text-blue-500" />
                </div>
                <Badge variant="secondary" className="bg-blue-500/10 text-blue-500">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +8%
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">Banque</p>
              <p className="text-xl font-bold">{formatCurrency(bankAccount?.balance || 0)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Évolution des Revenus</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(243, 75%, 59%)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(243, 75%, 59%)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `${v/1000000}M`} />
                    <Tooltip 
                      formatter={(value) => [formatCurrency(value), 'Revenus']}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="hsl(243, 75%, 59%)" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorRevenue)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Distribution Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Répartition des Soldes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [formatCurrency(value)]}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-4">
                {pieData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-sm text-muted-foreground">{entry.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Historique des Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Mode de paiement</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Boutique</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Aucune transaction
                      </TableCell>
                    </TableRow>
                  ) : (
                    sales.slice(0, 10).map((sale) => (
                      <TableRow key={sale.id} className="table-row-hover">
                        <TableCell>
                          {new Date(sale.created_at).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getPaymentMethodIcon(sale.payment_method)}
                            <span>{getPaymentMethodLabel(sale.payment_method)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-emerald-500">
                          +{formatCurrency(sale.total)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">Boutique Principale</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default FinancesPage;
