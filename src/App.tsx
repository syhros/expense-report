import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import GeneralLedger from './pages/GeneralLedger';
import Suppliers from './pages/Suppliers';
import ASINs from './pages/ASINs';
import Budget from './pages/Budget';
import Inventory from './pages/Inventory';
import Shipping from './pages/Shipping';
import Reports from './pages/Reports';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-900 text-gray-100">
          <ProtectedRoute>
            <Routes>
              <Route path="/" element={<MainLayout><Dashboard /></MainLayout>} />
              <Route path="/transactions" element={<MainLayout><Transactions /></MainLayout>} />
              <Route path="/general-ledger" element={<MainLayout><GeneralLedger /></MainLayout>} />
              <Route path="/suppliers" element={<MainLayout><Suppliers /></MainLayout>} />
              <Route path="/asins" element={<MainLayout><ASINs /></MainLayout>} />
              <Route path="/budget" element={<MainLayout><Budget /></MainLayout>} />
              <Route path="/inventory" element={<MainLayout><Inventory /></MainLayout>} />
              <Route path="/shipping" element={<MainLayout maxWidthClass="w-[90vw]"><Shipping /></MainLayout>} />
              <Route path="/reports" element={<MainLayout><Reports /></MainLayout>} />
            </Routes>
          </ProtectedRoute>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;