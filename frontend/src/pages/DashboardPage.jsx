import React from 'react';
import { useAuth } from '@/App';
import SuperAdminDashboard from '@/pages/SuperAdminDashboard';
import OwnerDashboard from '@/pages/OwnerDashboard';
import SellerDashboard from '@/pages/SellerDashboard';

const DashboardPage = () => {
  const { user } = useAuth();
  const role = user?.role || 'seller';

  if (role === 'super_admin') {
    return <SuperAdminDashboard />;
  }

  if (role === 'seller' || role === 'cashier') {
    return <SellerDashboard />;
  }

  // owner, ceo, manager all get operational dashboard
  return <OwnerDashboard />;
};

export default DashboardPage;
