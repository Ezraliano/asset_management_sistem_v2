import React from 'react';

const iconProps = {
    className: "h-6 w-6",
    strokeWidth: 2,
    fill: "none",
    stroke: "currentColor"
};

export const DashboardIcon: React.FC = () => (
    <svg {...iconProps} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M4 4h16v4H4zM4 18h16v2H4z" /></svg>
);

export const AssetIcon: React.FC = () => (
    <svg {...iconProps} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
);

export const AuditIcon: React.FC = () => (
    <svg {...iconProps} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
);


export const BulkIcon: React.FC = () => (
    <svg {...iconProps} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
);

export const QRIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className || "h-6 w-6"} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V4h2v2H5zM3 10a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zm2 2v-2h2v2H5zM10 4a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1V4zm2 2V4h2v2h-2zM10 9a1 1 0 00-1 1v6a1 1 0 001 1h6a1 1 0 001-1v-6a1 1 0 00-1-1h-6zm1 1h4v4h-4v-4z" clipRule="evenodd" /></svg>
);

export const ReportIcon: React.FC = () => (
    <svg {...iconProps} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V7a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
);

export const UserIcon: React.FC = () => (
    <svg {...iconProps} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm6-11a4.5 4.5 0 00-4.5-4.5m4.5 4.5a4.5 4.5 0 01-4.5 4.5M15 21a4.5 4.5 0 004.5-4.5" /></svg>
);

export const MenuIcon: React.FC = () => (
    <svg {...iconProps} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" /></svg>
);

export const XIcon: React.FC = () => (
    <svg {...iconProps} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
);

export const LogoutIcon: React.FC = () => (
    <svg {...iconProps} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
);


export const EditIcon: React.FC = () => <svg {...iconProps} className="h-5 w-5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>;
export const DeleteIcon: React.FC = () => <svg {...iconProps} className="h-5 w-5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
export const PlusIcon: React.FC = () => <svg {...iconProps} className="h-5 w-5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>;
export const ViewIcon: React.FC = () => <svg {...iconProps} className="h-5 w-5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>;
export const BackIcon: React.FC = () => <svg {...iconProps} className="h-5 w-5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>;
export const MoveIcon: React.FC = () => <svg {...iconProps} className="h-5 w-5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125V14.25m-17.25 4.5v-9m17.25 9v-9m-17.25-9l17.25-9M3.375 5.25h17.25" /></svg>;
export const CameraIcon: React.FC = () => <svg {...iconProps} className="h-5 w-5" stroke="currentColor" fill="currentColor" viewBox="0 0 24 24"><path d="M4 4h3l2-2h6l2 2h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" /></svg>;


const smallIconProps = { ...iconProps, className: "h-5 w-5 inline-block" };

export const HistoryIcon: React.FC = () => <svg {...smallIconProps} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
export const MaintenanceIcon: React.FC = () => <svg {...smallIconProps} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
export const DamageIcon: React.FC = () => <svg {...smallIconProps} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
export const DownloadIcon: React.FC = () => <svg {...iconProps} className="h-5 w-5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;
export const DepreciationIcon: React.FC = () => <svg {...smallIconProps} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>;
export const BorrowIcon: React.FC = () => <svg {...smallIconProps} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>;

export const ChevronLeftIcon: React.FC = () => <svg {...iconProps} className="h-5 w-5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>;
export const ChevronRightIcon: React.FC = () => <svg {...iconProps} className="h-5 w-5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>;

// Tambahkan di file icons.tsx
export const FilterIcon: React.FC = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
);

export const SwitchHorizontalIcon: React.FC = () => (
    <svg {...iconProps} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h18m-4.5-1.5L21 12m0 0L16.5 7.5M21 12H3" /></svg>
);