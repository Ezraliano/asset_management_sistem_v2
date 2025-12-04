import React, { useState, useCallback, useEffect } from 'react';
import { View, User, AppMode } from './types';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import AssetLending from './components/AssetLending';
import AssetLoanManagement from './components/AssetLoanManagement';
import AssetList from './components/AssetList';
import AssetDetail from './components/AssetDetail';
import AssetSalesList from './components/AssetSalesList';
import AssetSaleDetail from './components/AssetSaleDetail';
import QRCodeScanner from './components/QRCodeScanner';
import ErrorBoundary from './components/ErrorBoundary';
import UserList from './components/UserList';
import ReportView from './components/ReportView';
import BulkTransaction from './components/BulkTransaction';
import InventoryAuditSetup from './components/InventoryAuditSetup';
import InventoryAudit from './components/InventoryAudit';
import Login from './components/Login';
import SessionExpiryModal from './components/SessionExpiryModal';
import AutoLogoutWarning from './components/AutoLogoutWarning';
import GuaranteeList from './components/GuaranteeList';
import GuaranteeDashboard from './components/GuaranteeDashboard';
import { LanguageProvider } from './hooks/useTranslation';
import { getCurrentUser, startTokenTimeoutChecker, stopTokenTimeoutChecker, extendSession, SESSION_EVENTS } from './services/api';

const AppContent: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [appMode, setAppMode] = useState<AppMode>('asset');
  const [view, setView] = useState<View>({ type: 'DASHBOARD' });
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSessionExpiryModal, setShowSessionExpiryModal] = useState(false);
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState<number>(0);
  const [showAutoLogoutWarning, setShowAutoLogoutWarning] = useState(false);

  // Check if user is already logged in on app start
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token');
      const tokenExpiration = localStorage.getItem('token_expiration');

      if (token && tokenExpiration) {
        // Check if token has already expired before making API call
        const expirationMs = parseInt(tokenExpiration, 10);
        const currentTime = Date.now();
        const timeRemaining = expirationMs - currentTime;

        // If token has already expired, clear it immediately
        if (timeRemaining <= 0) {
          console.warn('Token already expired on app start');
          localStorage.removeItem('auth_token');
          localStorage.removeItem('token_expiration');
          setLoading(false);
          return;
        }

        // Token is still valid, verify with backend
        const currentUser = await getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          // Start token timeout checker if token exists
          startTokenTimeoutChecker();
        } else {
          // Backend rejected the token (invalid/expired on server)
          localStorage.removeItem('auth_token');
          localStorage.removeItem('token_expiration');
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
    // Redirect admin-kredit directly to guarantee dashboard
    if (loggedInUser.role === 'admin-kredit') {
      setAppMode('guarantee');
      setView({ type: 'GUARANTEE_DASHBOARD' });
    } else {
      setView({ type: 'DASHBOARD' });
    }
  };
  
  const handleLogout = async () => {
    // Stop token timeout checker
    stopTokenTimeoutChecker();
    // Clear stored data
    localStorage.removeItem('auth_token');
    localStorage.removeItem('token_expiration');
    localStorage.removeItem('sso_session_id');
    setShowSessionExpiryModal(false);
    setShowAutoLogoutWarning(false);
    setUser(null);
  };

  const handleExtendSession = async () => {
    const success = await extendSession();
    if (success) {
      setShowSessionExpiryModal(false);
      setShowAutoLogoutWarning(false);
      // Reset and restart the checker
      startTokenTimeoutChecker();
    }
  };

  // Listen for session expiring warning event
  useEffect(() => {
    const handleSessionExpiringWarning = (event: Event) => {
      const customEvent = event as CustomEvent;
      const timeRemaining = customEvent.detail?.timeRemaining || 0;
      setSessionTimeRemaining(timeRemaining);
      setShowSessionExpiryModal(true);
    };

    window.addEventListener(SESSION_EVENTS.EXPIRING_WARNING, handleSessionExpiringWarning);

    return () => {
      window.removeEventListener(SESSION_EVENTS.EXPIRING_WARNING, handleSessionExpiringWarning);
    };
  }, [setSessionTimeRemaining, setShowSessionExpiryModal]);

  // Listen for session expired event
  useEffect(() => {
    const handleSessionExpired = () => {
      setShowSessionExpiryModal(false);
      setShowAutoLogoutWarning(true);
      // Auto-logout after 5 seconds (AutoLogoutWarning countdown)
      const logoutTimer = setTimeout(() => {
        handleLogout();
      }, 5000);

      return () => clearTimeout(logoutTimer);
    };

    window.addEventListener(SESSION_EVENTS.EXPIRED, handleSessionExpired);

    return () => {
      window.removeEventListener(SESSION_EVENTS.EXPIRED, handleSessionExpired);
    };
  }, [handleLogout]);

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
      case 'ASSET_SALES':
        return <AssetSalesList user={user} navigateTo={navigateTo} />;
      case 'ASSET_SALE_DETAIL':
        return <AssetSaleDetail saleId={view.saleId} user={user} navigateTo={navigateTo} />;
      case 'QR_SCANNER':
        return (
          <ErrorBoundary>
            <QRCodeScanner navigateTo={navigateTo} />
          </ErrorBoundary>
        );
      case 'USERS':
          return <UserList />;
      case 'REPORTS':
          return <ReportView user={user} />;
      case 'BULK_TRANSACTION':
          return <BulkTransaction navigateTo={navigateTo} />;
      case 'INVENTORY_AUDIT_SETUP':
          return <InventoryAuditSetup navigateTo={navigateTo} />;
      case 'INVENTORY_AUDIT_SESSION':
          return (
            <InventoryAudit
              unitId={view.unitId}
              unitName={view.unitName}
              auditId={view.auditId}
              mode={view.mode}
              navigateTo={navigateTo}
            />
          );
      case 'GUARANTEE_DASHBOARD':
          return <GuaranteeDashboard navigateTo={navigateTo} user={user} />;
      case 'GUARANTEE_LIST':
          return <GuaranteeList navigateTo={navigateTo} user={user} />;
      default:
        return <Dashboard navigateTo={navigateTo} />;
    }
  };

  const handleSwitchMode = (newMode: AppMode) => {
    setAppMode(newMode);
    if (newMode === 'guarantee') {
      setView({ type: 'GUARANTEE_DASHBOARD' });
    } else {
      setView({ type: 'DASHBOARD' });
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-dark-text">
      <SessionExpiryModal
        isOpen={showSessionExpiryModal}
        timeRemaining={sessionTimeRemaining}
        onExtendSession={handleExtendSession}
        onLogout={handleLogout}
      />
      <AutoLogoutWarning isVisible={showAutoLogoutWarning} />
      <Header
        user={user}
        onLogout={handleLogout}
        isSidebarOpen={isSidebarOpen}
        setSidebarOpen={setSidebarOpen}
        navigateTo={navigateTo}
        currentView={view}
        appMode={appMode}
        onSwitchMode={handleSwitchMode}
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