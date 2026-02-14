import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { employeesAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Users, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/App';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('fr-FR', { style: 'decimal' }).format(value) + ' FCFA';
};

const EmployeesPage = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    salary: '',
    contract_type: ''
  });
  const [saving, setSaving] = useState(false);
  const { isCEO, isManager } = useAuth();

  const positions = ['Manager', 'Caissier', 'Stock Manager', 'Vendeur', 'Comptable', 'RH', 'Marketing'];
  const contractTypes = [
    { value: 'CDI', label: 'CDI - Contrat à Durée Indéterminée' },
    { value: 'CDD', label: 'CDD - Contrat à Durée Déterminée' },
    { value: 'Stage', label: 'Stage' }
  ];

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await employeesAPI.getAll();
      setEmployees(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openModal = (employee = null) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormData({
        name: employee.name,
        position: employee.position,
        salary: employee.salary.toString(),
        contract_type: employee.contract_type
      });
    } else {
      setEditingEmployee(null);
      setFormData({ name: '', position: '', salary: '', contract_type: '' });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const data = {
        ...formData,
        salary: parseFloat(formData.salary)
      };

      if (editingEmployee) {
        await employeesAPI.update(editingEmployee.id, data);
        toast.success('Employé modifié avec succès');
      } else {
        await employeesAPI.create(data);
        toast.success('Employé ajouté avec succès');
      }
      
      setModalOpen(false);
      fetchEmployees();
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (employee) => {
    if (!window.confirm(`Supprimer "${employee.name}"?`)) return;

    try {
      await employeesAPI.delete(employee.id);
      toast.success('Employé supprimé');
      fetchEmployees();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const getContractBadgeVariant = (type) => {
    switch (type) {
      case 'CDI': return 'default';
      case 'CDD': return 'secondary';
      case 'Stage': return 'outline';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Employés">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Employés">
      <div className="space-y-6" data-testid="employees-content">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher un employé..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="search-employees"
            />
          </div>
          {(isCEO || isManager) && (
            <Button onClick={() => openModal()} data-testid="add-employee-btn">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un employé
            </Button>
          )}
        </div>

        {/* Employees Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Liste des Employés ({filteredEmployees.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Poste</TableHead>
                    <TableHead>Type de Contrat</TableHead>
                    <TableHead>Salaire</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Aucun employé trouvé
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map((employee) => (
                      <TableRow key={employee.id} className="table-row-hover">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <span className="text-primary font-medium">
                                {employee.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium">{employee.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{employee.position}</TableCell>
                        <TableCell>
                          <Badge variant={getContractBadgeVariant(employee.contract_type)}>
                            {employee.contract_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-primary">
                          {formatCurrency(employee.salary)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => openModal(employee)}
                              data-testid={`edit-employee-${employee.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {isCEO && (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDelete(employee)}
                                data-testid={`delete-employee-${employee.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
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
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingEmployee ? 'Modifier l\'employé' : 'Ajouter un employé'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom complet</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                data-testid="employee-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Poste</Label>
              <Select 
                value={formData.position} 
                onValueChange={(value) => setFormData({ ...formData, position: value })}
              >
                <SelectTrigger data-testid="employee-position">
                  <SelectValue placeholder="Sélectionner un poste" />
                </SelectTrigger>
                <SelectContent>
                  {positions.map(pos => (
                    <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contract_type">Type de Contrat</Label>
              <Select 
                value={formData.contract_type} 
                onValueChange={(value) => setFormData({ ...formData, contract_type: value })}
              >
                <SelectTrigger data-testid="employee-contract">
                  <SelectValue placeholder="Sélectionner un type" />
                </SelectTrigger>
                <SelectContent>
                  {contractTypes.map(ct => (
                    <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="salary">Salaire mensuel (FCFA)</Label>
              <Input
                id="salary"
                type="number"
                min="0"
                step="1000"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                required
                data-testid="employee-salary"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={saving} data-testid="save-employee">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  editingEmployee ? 'Modifier' : 'Ajouter'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default EmployeesPage;
