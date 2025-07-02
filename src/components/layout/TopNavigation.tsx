import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  Clock, 
  Truck, 
  Tag, 
  DollarSign, 
  Archive, 
  ShoppingCart, 
  BarChart3,
  TrendingUp,
  LogOut,
  BookOpen
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const navItems = [
  { label: 'Dashboard', icon: Home, path: '/' },
  { label: 'Purchase Order Log', icon: Clock, path: '/transactions' },
  { label: 'General Ledger', icon: BookOpen, path: '/general-ledger' },
  { label: 'Suppliers', icon: Truck, path: '/suppliers' },
  { label: 'ASINs', icon: Tag, path: '/asins' },
  { label: 'Budget', icon: DollarSign, path: '/budget' },
  { label: 'Inventory', icon: Archive, path: '/inventory' },
  { label: 'Seller Central', icon: ShoppingCart, path: '/seller' },
  { label: 'Reports', icon: BarChart3, path: '/reports' }
];

const TopNavigation: React.FC = () => {
  const { signOut, user } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="fixed top-5 left-1/2 transform -translate-x-1/2 z-50">
      <nav className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl px-6 py-3 shadow-2xl">
        <div className="flex items-center space-x-8">
          {/* Logo */}
          <div className="flex items-center space-x-2 pr-6 border-r border-white/20">
            <TrendingUp className="h-6 w-6 text-blue-400" />
            <h1 className="text-lg font-bold text-white">FBA Tracker</h1>
          </div>
          
          {/* Navigation Items */}
          <div className="flex items-center space-x-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-102 ${
                    isActive
                      ? 'bg-blue-600/80 backdrop-blur-sm text-white shadow-lg'
                      : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden lg:inline">{item.label}</span>
              </NavLink>
            ))}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4 pl-6 border-l border-white/20">
            <div className="text-sm text-gray-300">
              {user?.email}
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-300 hover:scale-102"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden lg:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default TopNavigation;