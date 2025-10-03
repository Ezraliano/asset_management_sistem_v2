// types.ts - TAMBAHKAN INTERFACE UNTUK CHART DATA
export enum AssetStatus {
  IN_USE = 'In Use',
  IN_REPAIR = 'In Repair',
  DISPOSED = 'Disposed',
  LOST = 'Lost'
}

export enum MaintenanceStatus {
  SCHEDULED = 'Scheduled',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled'
}

export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  role: 'Admin' | 'Staff' | 'Audit';
}

export interface Asset {
  id: number;
  asset_tag: string;
  name: string;
  category: string;
  location: string;
  value: number;
  purchase_date: string;
  useful_life: number;
  status: AssetStatus;
  created_at?: string;
  updated_at?: string;
}

export interface Maintenance {
  id: number;
  asset_id: number;
  date: string;
  description: string;
  status: MaintenanceStatus;
  asset?: Asset;
}

export interface AssetMovement {
  id: number;
  asset_id: number;
  moved_by_id: number;
  location: string;
  moved_at: string;
  moved_by?: User;
  asset?: Asset;
}

export interface IncidentReport {
  id: number;
  asset_id: number;
  reporter_id: number;
  type: 'Damage' | 'Loss';
  description: string;
  date: string;
  status: string;
  asset?: Asset;
  reporter?: User;
}

export type DamageReport = IncidentReport;
export type LossReport = IncidentReport;

// TAMBAHKAN INTERFACE UNTUK CHART DATA
export interface ChartData {
  name: string;
  count: number;
  value?: number; // Untuk future use jika butuh value
}

export interface DashboardStats {
  total_assets: number;
  total_value: number;
  assets_in_use: number;
  assets_in_repair: number;
  scheduled_maintenances: number;
  active_incidents: number;
  assets_by_category: ChartData[];
  assets_by_location: ChartData[];
}

export type View = 
  | { type: 'DASHBOARD' }
  | { type: 'ASSET_LIST' }
  | { type: 'ASSET_DETAIL'; assetId: string }
  | { type: 'QR_SCANNER' }
  | { type: 'USERS' }
  | { type: 'REPORTS' }
  | { type: 'BULK_TRANSACTION' }
  | { type: 'INVENTORY_AUDIT_SETUP' }
  | { type: 'INVENTORY_AUDIT_SESSION'; location: string; mode: string };