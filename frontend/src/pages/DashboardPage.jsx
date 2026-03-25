import React from 'react';
import { useAuth } from '@/App';
import SuperAdminDashboard from '@/pages/SuperAdminDashboard';
import OwnerDashboard from '@/pages/OwnerDashboard';
import ManagerDashboard from '@/pages/ManagerDashboard';
import SellerDashboard from '@/pages/SellerDashboard';
import CashierDashboard from '@/pages/CashierDashboard';
import StockManagerDashboard from '@/pages/StockManagerDashboard';

const DashboardPage = () => {
  const { user } = useAuth();
  const role = user?.role || 'seller';

  if (role === 'super_admin') return <SuperAdminDashboard />;
  if (role === 'manager') return <ManagerDashboard />;
  if (role === 'stock_manager') return <StockManagerDashboard />;
  if (role === 'cashier') return <CashierDashboard />;
  if (role === 'seller') return <SellerDashboard />;

  // owner, ceo
  return <OwnerDashboard />;
};

export default DashboardPage;
