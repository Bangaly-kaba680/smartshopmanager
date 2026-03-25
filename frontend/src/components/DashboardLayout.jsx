import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useTheme } from '@/App';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  LayoutDashboard, Store, Users, Package, Boxes, ShoppingCart, 
  DollarSign, Brain, Megaphone, HelpCircle, Settings,
  LogOut, Sun, Moon, Menu, X, ChevronLeft, Shield, ShieldCheck, Building2, Command, AlertTriangle,
  UserCog, CreditCard, RotateCcw, TrendingUp, BarChart3, ClipboardCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  // === SUPER ADMIN — Strategic Platform Management Only ===
  { path: '/dashboard', icon: LayoutDashboard, label: 'Vue Plateforme', roles: ['super_admin'], section: 'admin' },
  { path: '/admin/users', icon: UserCog, label: 'Gestion Utilisateurs', roles: ['super_admin'], section: 'admin' },
  { path: '/admin/shops', icon: Store, label: 'Gestion Boutiques', roles: ['super_admin'], section: 'admin' },
  { path: '/admin/subscriptions', icon: CreditCard, label: 'Abonnements', roles: ['super_admin'], section: 'admin' },
  { path: '/ceo-control', icon: Command, label: 'CEO Control', roles: ['super_admin'], section: 'admin' },
  { path: '/irp', icon: AlertTriangle, label: 'IRP Incidents', roles: ['super_admin'], section: 'admin' },
  { path: '/security', icon: ShieldCheck, label: 'Securite', roles: ['super_admin'], section: 'admin' },
  { path: '/brand-assets', icon: Building2, label: 'BINTRONIX Assets', roles: ['super_admin'], section: 'admin' },

  // === OWNER / CEO — Strategic view of their business ===
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['owner', 'ceo'], section: 'owner' },
  { path: '/shops', icon: Store, label: 'Ma Boutique', roles: ['owner', 'ceo'], section: 'owner' },
  { path: '/products', icon: Package, label: 'Produits', roles: ['owner', 'ceo'], section: 'owner' },
  { path: '/stock', icon: Boxes, label: 'Stock', roles: ['owner', 'ceo'], section: 'owner' },
  { path: '/employees', icon: Users, label: 'Employes', roles: ['owner', 'ceo'], section: 'owner' },
  { path: '/pos', icon: ShoppingCart, label: 'Ventes', roles: ['owner', 'ceo'], section: 'owner' },
  { path: '/returns', icon: RotateCcw, label: 'Retours', roles: ['owner', 'ceo'], section: 'owner' },
  { path: '/finances', icon: DollarSign, label: 'Finances', roles: ['owner', 'ceo'], section: 'owner' },
  { path: '/stock-approvals', icon: ClipboardCheck, label: 'Approbations Stock', roles: ['owner', 'ceo'], section: 'owner' },

  // === MANAGER — Supervision, approvals, no sales ===
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['manager'], section: 'manager' },
  { path: '/products', icon: Package, label: 'Produits', roles: ['manager'], section: 'manager' },
  { path: '/stock', icon: Boxes, label: 'Stock', roles: ['manager'], section: 'manager' },
  { path: '/stock-approvals', icon: ClipboardCheck, label: 'Approbations', roles: ['manager'], section: 'manager' },
  { path: '/employees', icon: Users, label: 'Employes', roles: ['manager'], section: 'manager' },
  { path: '/returns', icon: RotateCcw, label: 'Retours', roles: ['manager'], section: 'manager' },

  // === SELLER — Sales only ===
  { path: '/dashboard', icon: LayoutDashboard, label: 'Mon Espace', roles: ['seller'], section: 'seller' },
  { path: '/pos', icon: ShoppingCart, label: 'Ventes (POS)', roles: ['seller'], section: 'seller' },
  { path: '/products', icon: Package, label: 'Produits', roles: ['seller'], section: 'seller' },
  { path: '/returns', icon: RotateCcw, label: 'Retours', roles: ['seller'], section: 'seller' },
  { path: '/my-performance', icon: TrendingUp, label: 'Mes Performances', roles: ['seller'], section: 'seller' },

  // === CASHIER — Cash register only ===
  { path: '/dashboard', icon: LayoutDashboard, label: 'Ma Caisse', roles: ['cashier'], section: 'cashier' },
  { path: '/pos', icon: ShoppingCart, label: 'Caisse (POS)', roles: ['cashier'], section: 'cashier' },
  { path: '/my-performance', icon: TrendingUp, label: 'Mes Performances', roles: ['cashier'], section: 'cashier' },

  // === STOCK MANAGER — Stock management with approval requests ===
  { path: '/dashboard', icon: LayoutDashboard, label: 'Mon Stock', roles: ['stock_manager'], section: 'stock_mgr' },
  { path: '/stock', icon: Boxes, label: 'Stock', roles: ['stock_manager'], section: 'stock_mgr' },
  { path: '/products', icon: Package, label: 'Produits', roles: ['stock_manager'], section: 'stock_mgr' },

  // === ALL ROLES — Common ===
  { path: '/help', icon: HelpCircle, label: "Centre d'aide", roles: ['super_admin', 'owner', 'ceo', 'manager', 'seller', 'cashier', 'stock_manager'], section: 'common' },
  { path: '/settings', icon: Settings, label: 'Parametres', roles: ['super_admin', 'owner', 'ceo', 'manager', 'seller', 'cashier', 'stock_manager'], section: 'common' },
];

const DashboardLayout = ({ children, title }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const userRole = user?.role || 'cashier';
  const filteredMenuItems = menuItems.filter(item => item.roles.includes(userRole));

  // Section labels for sidebar groups
  const sectionLabels = {
    admin: 'Administration',
    owner: 'Gestion Boutique',
    manager: 'Supervision',
    seller: 'Mon Travail',
    cashier: 'Ma Caisse',
    stock_mgr: 'Gestion Stock',
    common: 'General',
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-card border-r border-border transition-all duration-300",
          sidebarOpen ? "w-64" : "w-20",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          {sidebarOpen ? (
            <Link to="/dashboard" className="flex items-center gap-2">
              <img src="/assets/bintronix-logo.png" alt="BINTRONIX" className="w-10 h-10 rounded-lg object-cover" />
              <span className="font-bold text-foreground" style={{ fontFamily: 'Manrope, sans-serif' }}>
                StartupManager
              </span>
            </Link>
          ) : (
            <Link to="/dashboard" className="mx-auto">
              <img src="/assets/bintronix-logo.png" alt="BINTRONIX" className="w-10 h-10 rounded-lg object-cover" />
            </Link>
          )}
          <Button 
            variant="ghost" 
            size="icon"
            className="hidden lg:flex"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            data-testid="toggle-sidebar"
          >
            <ChevronLeft className={cn("h-4 w-4 transition-transform", !sidebarOpen && "rotate-180")} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="space-y-1 px-3">
            {(() => {
              let lastSection = null;
              return filteredMenuItems.map((item, idx) => {
                const isActive = location.pathname === item.path;
                const showSection = item.section !== lastSection && sidebarOpen;
                lastSection = item.section;
                return (
                  <React.Fragment key={`${item.path}-${item.section}-${idx}`}>
                    {showSection && idx > 0 && <div className="border-t border-border my-2" />}
                    {showSection && (
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold px-3 pt-2 pb-1">
                        {sectionLabels[item.section] || ''}
                      </p>
                    )}
                    <Link
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      data-testid={`nav-${item.path.replace(/\//g, '-').replace(/^-/, '')}`}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
                    </Link>
                  </React.Fragment>
                );
              });
            })()}
          </nav>
        </ScrollArea>

        {/* User & Logout */}
        <div className="p-4 border-t border-border">
          {sidebarOpen && (
            <div className="mb-3 px-3">
              <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide",
                  userRole === 'super_admin' ? 'bg-red-500/20 text-red-400' :
                  userRole === 'ceo' ? 'bg-amber-500/20 text-amber-400' :
                  userRole === 'owner' ? 'bg-emerald-500/20 text-emerald-400' :
                  userRole === 'manager' ? 'bg-purple-500/20 text-purple-400' :
                  userRole === 'stock_manager' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-blue-500/20 text-blue-400'
                )}>
                  {userRole === 'super_admin' ? 'Fondateur' : 
                   userRole === 'ceo' ? 'CEO' :
                   userRole === 'owner' ? 'Proprietaire' : 
                   userRole === 'manager' ? 'Manager' :
                   userRole === 'seller' ? 'Vendeur' :
                   userRole === 'cashier' ? 'Caissier' :
                   userRole === 'stock_manager' ? 'Gest. Stock' : userRole}
                </span>
              </div>
            </div>
          )}
          <Button 
            variant="ghost" 
            className={cn("w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10", !sidebarOpen && "justify-center")}
            onClick={handleLogout}
            data-testid="logout-btn"
          >
            <LogOut className="h-4 w-4" />
            {sidebarOpen && <span className="ml-2">Déconnexion</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(true)}
              data-testid="mobile-menu-btn"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {title}
            </h1>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleTheme}
            data-testid="theme-toggle-header"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-8">
          {children}
        </main>

        {/* Footer Signature - BINTRONIX */}
        <footer className="h-14 bg-gradient-to-r from-slate-900 via-emerald-900/20 to-slate-900 border-t border-emerald-500/20 flex items-center justify-center px-4 relative overflow-hidden">
          {/* Decorative gradient line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500 via-emerald-500 to-yellow-500"></div>
          
          <div className="flex items-center gap-3">
            <img src="/assets/bintronix-logo.png" alt="BINTRONIX" className="w-9 h-9 rounded-lg object-cover shadow-lg" />
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Powered by</span>
              <span className="text-sm font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                BINTRONIX
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default DashboardLayout;
