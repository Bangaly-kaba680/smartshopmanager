import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useTheme } from '@/App';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  LayoutDashboard, Store, Users, Package, Boxes, ShoppingCart, 
  DollarSign, Brain, Megaphone, HelpCircle, Settings,
  LogOut, Sun, Moon, Menu, X, ChevronLeft, Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['ceo', 'manager', 'cashier', 'stock_manager'] },
  { path: '/access-control', icon: Shield, label: 'Contrôle Accès', roles: ['ceo'], adminOnly: true },
  { path: '/shops', icon: Store, label: 'Boutiques', roles: ['ceo'] },
  { path: '/employees', icon: Users, label: 'Employés', roles: ['ceo', 'manager'] },
  { path: '/products', icon: Package, label: 'Produits', roles: ['ceo', 'manager', 'cashier', 'stock_manager'] },
  { path: '/stock', icon: Boxes, label: 'Stock', roles: ['ceo', 'manager', 'stock_manager'] },
  { path: '/pos', icon: ShoppingCart, label: 'Ventes (POS)', roles: ['ceo', 'manager', 'cashier'] },
  { path: '/finances', icon: DollarSign, label: 'Finances', roles: ['ceo'] },
  { path: '/rh-ia', icon: Brain, label: 'RH IA', roles: ['ceo'] },
  { path: '/marketing-ia', icon: Megaphone, label: 'Marketing IA', roles: ['ceo', 'manager'] },
  { path: '/help', icon: HelpCircle, label: "Centre d'aide", roles: ['ceo', 'manager', 'cashier', 'stock_manager'] },
  { path: '/settings', icon: Settings, label: 'Paramètres', roles: ['ceo', 'manager', 'cashier', 'stock_manager'] },
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
          {sidebarOpen && (
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">SM</span>
              </div>
              <span className="font-bold text-foreground" style={{ fontFamily: 'Manrope, sans-serif' }}>
                StartupManager
              </span>
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
            {filteredMenuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  data-testid={`nav-${item.path.replace('/', '')}`}
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
              );
            })}
          </nav>
        </ScrollArea>

        {/* User & Logout */}
        <div className="p-4 border-t border-border">
          {sidebarOpen && (
            <div className="mb-3 px-3">
              <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
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

        {/* Footer Signature - Bangaly Kaba */}
        <footer className="h-14 bg-gradient-to-r from-card via-card to-card border-t border-border flex items-center justify-center px-4 relative overflow-hidden">
          {/* Decorative gradient line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-orange-500"></div>
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-orange-500 flex items-center justify-center shadow-lg">
              <span className="text-xs font-bold text-white">BK</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Développé par</span>
              <span className="text-sm font-bold bg-gradient-to-r from-indigo-500 to-orange-500 bg-clip-text text-transparent">
                Bangaly Kaba
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default DashboardLayout;
