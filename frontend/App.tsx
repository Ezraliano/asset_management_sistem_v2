import React, { useState, useCallback, useEffect } from 'react';
import { View, User } from './types';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import AssetLending from './components/AssetLending';
import AssetLoanManagement from './components/AssetLoanManagement';
import AssetList from './components/AssetList';
import AssetDetail from './components/AssetDetail';
import QRCodeScanner from './components/QRCodeScanner';
import UserList from './components/UserList';
import ReportView from './components/ReportView';
import BulkTransaction from './components/BulkTransaction';
import InventoryAuditSetup from './components/InventoryAuditSetup';
import InventoryAudit from './components/InventoryAudit';
import Login from './components/Login';
import { LanguageProvider } from './hooks/useTranslation';
import { getCurrentUser } from './services/api';

const AppContent: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>({ type: 'DASHBOARD' });
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in on app start
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        } else {
          localStorage.removeItem('auth_token');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const navigateTo = useCallback((newView: View) => {
    setView(newView);
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, []);

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    setView({ type: 'DASHBOARD' });
  };
  
  const handleLogout = async () => {
    // Panggil API logout di sini jika diperlukan
    localStorage.removeItem('auth_token');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-light-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-medium-text">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const renderView = () => {
    switch (view.type) {
      case 'DASHBOARD':
        return <Dashboard navigateTo={navigateTo} />;
      case 'ASSET_LIST':
        return <AssetList navigateTo={navigateTo} />;
      case 'ASSET_LENDING':
        return <AssetLending />;
      case 'ASSET_LOAN_MANAGEMENT':
        return <AssetLoanManagement />;
      case 'ASSET_DETAIL':
        return <AssetDetail assetId={view.assetId} navigateTo={navigateTo} />;
      case 'QR_SCANNER':
        return <QRCodeScanner navigateTo={navigateTo} />;
      case 'USERS':
          return <UserList />;
      case 'REPORTS':
          return <ReportView />;
      case 'BULK_TRANSACTION':
          return <BulkTransaction navigateTo={navigateTo} />;
      case 'INVENTORY_AUDIT_SETUP':
          return <InventoryAuditSetup navigateTo={navigateTo} />;
      case 'INVENTORY_AUDIT_SESSION':
          return (
            <InventoryAudit
              location={view.location}
              mode={view.mode === 'camera' ? 'camera' : 'manual'}
              navigateTo={navigateTo}
            />
          );
      default:
        return <Dashboard navigateTo={navigateTo} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-dark-text">
      <Header 
        user={user}
        onLogout={handleLogout}
        isSidebarOpen={isSidebarOpen} 
        setSidebarOpen={setSidebarOpen} 
        navigateTo={navigateTo} 
        currentView={view} 
      />
      <main className="flex-1 p-4 md:p-8 overflow-y-auto transition-all duration-300 lg:ml-64">
        {renderView()}
      </main>
    </div>
  );
};

const App: React.FC = () => (
  <LanguageProvider>
    <AppContent />
  </LanguageProvider>
);

export default App;