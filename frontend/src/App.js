import React, { createContext, useContext, useState, useEffect } from 'react';
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { CurrencyProvider } from "@/contexts/CurrencyContext";

// Pages
import AccessGatePage from "@/pages/AccessGatePage";
import AccessActionPage from "@/pages/AccessActionPage";
import AdminApprovePage from "@/pages/AdminApprovePage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import DashboardPage from "@/pages/DashboardPage";
import POSPage from "@/pages/POSPage";
import ProductsPage from "@/pages/ProductsPage";
import StockPage from "@/pages/StockPage";
import EmployeesPage from "@/pages/EmployeesPage";
import RHIAPage from "@/pages/RHIAPage";
import MarketingIAPage from "@/pages/MarketingIAPage";
import FinancesPage from "@/pages/FinancesPage";
import HelpCenterPage from "@/pages/HelpCenterPage";
import SettingsPage from "@/pages/SettingsPage";
import ShopsPage from "@/pages/ShopsPage";
import AccessControlPage from "@/pages/AccessControlPage";

// Super Admin email - creator of the startup (TOTAL CONTROL)
const SUPER_ADMIN_EMAIL = "bangalykaba635@gmail.com";

// Auth Context
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

// Theme Context
const ThemeContext = createContext(null);

export const useTheme = () => useContext(ThemeContext);

// Access Context
const AccessContext = createContext(null);

export const useAccess = () => useContext(AccessContext);

// Theme Provider
const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved || 'light';
  });

  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Access Provider
const AccessProvider = ({ children }) => {
  const [hasAccess, setHasAccess] = useState(false);
  const [accessEmail, setAccessEmail] = useState(null);
  const [accessType, setAccessType] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const grantAccess = (email, type = 'permanent') => {
    setHasAccess(true);
    setAccessEmail(email);
    setAccessType(type);
    setIsAdmin(email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
    localStorage.setItem('access_email', email);
  };

  const revokeAccess = () => {
    setHasAccess(false);
    setAccessEmail(null);
    setAccessType(null);
    setIsAdmin(false);
    localStorage.removeItem('access_email');
  };

  return (
    <AccessContext.Provider value={{ 
      hasAccess, accessEmail, accessType, isAdmin,
      grantAccess, revokeAccess, ADMIN_EMAIL
    }}>
      {children}
    </AccessContext.Provider>
  );
};

// Auth Provider
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(false);

  const login = (userData, accessToken) => {
    setUser(userData);
    setToken(accessToken);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', accessToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  const isAuthenticated = !!token && !!user;
  const isCEO = user?.role === 'ceo';
  const isManager = user?.role === 'manager' || isCEO;
  const isCashier = user?.role === 'cashier' || isManager;
  const isStockManager = user?.role === 'stock_manager' || isManager;

  return (
    <AuthContext.Provider value={{ 
      user, token, login, logout, loading, setLoading,
      isAuthenticated, isCEO, isManager, isCashier, isStockManager 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Protected Route
const ProtectedRoute = ({ children, requireCEO = false }) => {
  const { isAuthenticated, isCEO } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (requireCEO && !isCEO) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

// Main App Content (after access granted)
const AppContent = () => {
  const { isAdmin } = useAccess();

  return (
    <AuthProvider>
      <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute><DashboardPage /></ProtectedRoute>
          } />
          <Route path="/pos" element={
            <ProtectedRoute><POSPage /></ProtectedRoute>
          } />
          <Route path="/products" element={
            <ProtectedRoute><ProductsPage /></ProtectedRoute>
          } />
          <Route path="/stock" element={
            <ProtectedRoute><StockPage /></ProtectedRoute>
          } />
          <Route path="/employees" element={
            <ProtectedRoute><EmployeesPage /></ProtectedRoute>
          } />
          <Route path="/shops" element={
            <ProtectedRoute requireCEO><ShopsPage /></ProtectedRoute>
          } />
          <Route path="/rh-ia" element={
            <ProtectedRoute requireCEO><RHIAPage /></ProtectedRoute>
          } />
          <Route path="/marketing-ia" element={
            <ProtectedRoute><MarketingIAPage /></ProtectedRoute>
          } />
          <Route path="/finances" element={
            <ProtectedRoute requireCEO><FinancesPage /></ProtectedRoute>
          } />
          <Route path="/help" element={
            <ProtectedRoute><HelpCenterPage /></ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute><SettingsPage /></ProtectedRoute>
          } />
          
          {/* Access Control - Admin Only */}
          {isAdmin && (
            <Route path="/access-control" element={
              <ProtectedRoute requireCEO><AccessControlPage /></ProtectedRoute>
            } />
          )}
          
          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        <Toaster position="top-right" richColors />
    </AuthProvider>
  );
};

// Access Gate Wrapper
const AccessGate = () => {
  const { hasAccess, grantAccess, ADMIN_EMAIL } = useAccess();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if admin email is stored
    const storedEmail = localStorage.getItem('access_email');
    if (storedEmail) {
      // If it's admin, grant access immediately
      if (storedEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        grantAccess(storedEmail, 'permanent');
        setChecking(false);
        return;
      }
      
      // Otherwise check with backend
      const checkAccess = async () => {
        try {
          const response = await fetch(
            `${process.env.REACT_APP_BACKEND_URL}/api/access/check/${encodeURIComponent(storedEmail)}`
          );
          const data = await response.json();
          
          if (data.authorized) {
            grantAccess(storedEmail, data.access_type);
          }
        } catch (error) {
          console.error('Error checking access:', error);
        }
        setChecking(false);
      };
      
      checkAccess();
    } else {
      setChecking(false);
    }
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasAccess) {
    return <AccessGatePage onAccessGranted={grantAccess} />;
  }

  return <AppContent />;
};

function App() {
  return (
    <ThemeProvider>
      <CurrencyProvider>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Auth Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              
              {/* Protected Routes */}
              <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/pos" element={<ProtectedRoute><POSPage /></ProtectedRoute>} />
              <Route path="/products" element={<ProtectedRoute><ProductsPage /></ProtectedRoute>} />
              <Route path="/stock" element={<ProtectedRoute><StockPage /></ProtectedRoute>} />
              <Route path="/employees" element={<ProtectedRoute><EmployeesPage /></ProtectedRoute>} />
              <Route path="/shops" element={<ProtectedRoute requireCEO><ShopsPage /></ProtectedRoute>} />
              <Route path="/rh-ia" element={<ProtectedRoute requireCEO><RHIAPage /></ProtectedRoute>} />
              <Route path="/marketing-ia" element={<ProtectedRoute><MarketingIAPage /></ProtectedRoute>} />
              <Route path="/finances" element={<ProtectedRoute requireCEO><FinancesPage /></ProtectedRoute>} />
              <Route path="/help" element={<ProtectedRoute><HelpCenterPage /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              
              {/* Default redirect */}
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
            <Toaster position="top-right" richColors />
          </AuthProvider>
        </BrowserRouter>
      </CurrencyProvider>
    </ThemeProvider>
  );
}

export default App;
