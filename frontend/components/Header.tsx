
import React from 'react';
import { View, User } from '../types';
import { DashboardIcon, AssetIcon, SwitchHorizontalIcon, AuditIcon, BulkIcon, QRIcon, ReportIcon, UserIcon, MenuIcon, XIcon, LogoutIcon, SellIcon } from './icons';
import { useTranslation } from '../hooks/useTranslation';
import Restricted from './Restricted';

interface HeaderProps {
    user: User;
    onLogout: () => void;
    isSidebarOpen: boolean;
    setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
    navigateTo: (view: View) => void;
    currentView: View;
}

const NavItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
    <li
        onClick={onClick}
        className={`flex items-center p-3 my-1 rounded-lg cursor-pointer transition-colors ${
            isActive ? 'bg-primary text-white shadow-md' : 'text-gray-200 hover:bg-blue-500 hover:text-white'
        }`}
    >
        {icon}
        <span className="ml-4 text-lg font-medium">{label}</span>
    </li>
);

const Header: React.FC<HeaderProps> = ({ user, onLogout, isSidebarOpen, setSidebarOpen, navigateTo, currentView }) => {
    const { t } = useTranslation();
    const getIsActive = (viewType: View['type']) => currentView.type === viewType;

    return (
        <>
            {/* Overlay for mobile: shown when sidebar is open, and hidden on large screens */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                    aria-hidden="true"
                ></div>
            )}
            
            <div
                className={`fixed top-0 left-0 h-full bg-gray-800 text-white w-64 transform ${
                    isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                } transition-transform duration-300 ease-in-out z-30 flex flex-col lg:translate-x-0`}
            >
                <div className="flex items-center justify-between p-5 border-b border-gray-700">
                    <h1 className="text-2xl font-bold">{t('sidebar.title')}</h1>
                    <button onClick={() => setSidebarOpen(false)} className="lg:hidden" aria-label="Close menu">
                        <XIcon />
                    </button>
                </div>
                <nav className="flex-grow p-4 overflow-y-auto">
                    <ul>
                        <NavItem icon={<DashboardIcon />} label={t('sidebar.dashboard')} isActive={getIsActive('DASHBOARD')} onClick={() => navigateTo({ type: 'DASHBOARD' })} />
                        

                        <Restricted user={user} allowedRoles={['admin', 'unit']}>
                            <NavItem icon={<AssetIcon />} label={t('sidebar.assets')} isActive={getIsActive('ASSET_LIST') || getIsActive('ASSET_DETAIL')} onClick={() => navigateTo({ type: 'ASSET_LIST' })} />
                        </Restricted>

                        <Restricted user={user} allowedRoles={['user', 'super-admin', 'admin', 'unit']}>
                            <NavItem icon={<SwitchHorizontalIcon />} label={t('Peminjaman Asset')} isActive={currentView.type === 'ASSET_LENDING'} onClick={() => navigateTo({ type: 'ASSET_LENDING' })} />
                        </Restricted>

                        <Restricted user={user} allowedRoles={['super-admin', 'admin', 'unit']}>
                            <NavItem icon={<SellIcon />} label="Penjualan Aset" isActive={getIsActive('ASSET_SALES') || getIsActive('ASSET_SALE_DETAIL')} onClick={() => navigateTo({ type: 'ASSET_SALES' })} />
                        </Restricted>

                        <Restricted user={user} allowedRoles={['admin', 'auditor']}>
                            <NavItem icon={<AuditIcon />} label={t('sidebar.inventory_audit')} isActive={getIsActive('INVENTORY_AUDIT_SETUP') || getIsActive('INVENTORY_AUDIT_SESSION')} onClick={() => navigateTo({ type: 'INVENTORY_AUDIT_SETUP' })} />
                        </Restricted>

                        <Restricted user={user} allowedRoles={['admin', 'unit']}>
                            <NavItem icon={<BulkIcon />} label={t('sidebar.bulk_transaction')} isActive={getIsActive('BULK_TRANSACTION')} onClick={() => navigateTo({ type: 'BULK_TRANSACTION' })} />
                        </Restricted>

                        <Restricted user={user} allowedRoles={['admin', 'unit']}>
                            <NavItem icon={<QRIcon />} label={t('sidebar.scan_qr')} isActive={getIsActive('QR_SCANNER')} onClick={() => navigateTo({ type: 'QR_SCANNER' })} />
                        </Restricted>

                        <Restricted user={user} allowedRoles={['admin', 'auditor']}>
                            <NavItem icon={<ReportIcon />} label={t('sidebar.reports')} isActive={getIsActive('REPORTS')} onClick={() => navigateTo({ type: 'REPORTS' })} />
                        </Restricted>

                        <Restricted user={user} allowedRoles={['admin']}>
                            <NavItem icon={<UserIcon />} label={t('sidebar.users')} isActive={getIsActive('USERS')} onClick={() => navigateTo({ type: 'USERS' })} />
                        </Restricted>
                    </ul>
                </nav>
                <div className="p-4 border-t border-gray-700">
                    <div className="text-sm text-gray-400 mb-2">
                        {t('sidebar.logged_in_as')}: <span className="font-bold text-white">{user.name}</span> ({user.role})
                    </div>
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center justify-center p-3 rounded-lg text-gray-200 bg-red-800 hover:bg-red-700 transition-colors"
                    >
                        <LogoutIcon />
                        <span className="ml-3 font-medium">{t('sidebar.logout')}</span>
                    </button>
                </div>
            </div>
            
            <button
                onClick={() => setSidebarOpen(true)}
                className={`fixed top-4 left-4 z-40 p-2 bg-primary text-white rounded-full shadow-lg lg:hidden transition-opacity ${isSidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                aria-label="Open menu"
            >
                <MenuIcon />
            </button>
        </>
    );
};

export default Header;