
import React, { useState, useCallback } from 'react';
import { View, User } from './types';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
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

const AppContent: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>({ type: 'DASHBOARD' });
  const [isSidebarOpen, setSidebarOpen] = useState(false);

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
  
  const handleLogout = () => {
      setUser(null);
  };

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const renderView = () => {
    switch (view.type) {
      case 'DASHBOARD':
        return <Dashboard navigateTo={navigateTo} />;
      case 'ASSET_LIST':
        return <AssetList navigateTo={navigateTo} />;
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
          return <InventoryAudit location={view.location} mode={view.mode} navigateTo={navigateTo} />;
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