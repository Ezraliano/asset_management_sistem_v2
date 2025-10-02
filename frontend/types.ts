

export enum AssetStatus {
  InUse = 'In Use',
  InRepair = 'In Repair',
  Disposed = 'Disposed',
  Lost = 'Lost',
}

export interface Asset {
  id: string;
  name: string;
  category: string;
  location: string;
  value: number;
  purchaseDate: string;
  usefulLife: number; // in months
  status: AssetStatus;
  qrCodeUrl: string;
}

export interface AssetMovement {
  id: string;
  assetId: string;
  location: string;
  movedAt: string;
  movedBy: string;
}

export enum MaintenanceStatus {
  Scheduled = 'Scheduled',
  InProgress = 'In Progress',
  Completed = 'Completed',
  Cancelled = 'Cancelled',
}

export interface Maintenance {
  id: string;
  assetId: string;
  date: string;
  description: string;
  status: MaintenanceStatus;
}

export interface DamageReport {
  id: string;
  assetId: string;
  description: string;
  date: string;
  status: 'Reported' | 'Repaired' | 'Irreparable';
}

export interface LossReport {
  id: string;
  assetId: string;
  description: string;
  date: string;
  status: 'Reported' | 'Found' | 'Written Off';
}

export interface User {
  id: string;
  name: string;
  role: 'Admin' | 'Staff' | 'Audit';
  password?: string;
}

export type View =
  | { type: 'DASHBOARD' }
  | { type: 'ASSET_LIST' }
  | { type: 'ASSET_DETAIL'; assetId: string }
  | { type: 'QR_SCANNER' }
  | { type: 'REPORTS' }
  | { type: 'USERS' }
  | { type: 'BULK_TRANSACTION' }
  | { type: 'INVENTORY_AUDIT_SETUP' }
  | { type: 'INVENTORY_AUDIT_SESSION'; location: string; mode: 'camera' | 'manual' };