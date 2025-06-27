import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Suppliers from './pages/Suppliers';
import ASINs from './pages/ASINs';
import Budget from './pages/Budget';
import Inventory from './pages/Inventory';
import SellerCentral from './pages/SellerCentral';
import Reports from './pages/Reports';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-900 text-gray-100">
          <ProtectedRoute>
            <MainLayout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/suppliers" element={<Suppliers />} />
                <Route path="/asins" element={<ASINs />} />
                <Route path="/budget" element={<Budget />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/seller" element={<SellerCentral />} />
                <Route path="/reports" element={<Reports />} />
              </Routes>
            </MainLayout>
          </ProtectedRoute>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;