// types.ts - TAMBAHKAN INTERFACE UNTUK CHART DATA
export enum AssetStatus {
  AVAILABLE = 'Available',
  TERPINJAM = 'Terpinjam',
  TERJUAL = 'Terjual',
  LOST = 'Lost',
  DALAM_PERBAIKAN = 'Dalam Perbaikan',
  RUSAK = 'Rusak',
  DALAM_PEMELIHARAAN = 'Dalam Pemeliharaan'
}

export enum MaintenanceStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface Unit {
  id: number;
  code: string;
  name: string;
  description?: string;
  address?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  users_count?: number;
  assets_count?: number;
}

export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  role: 'Super Admin' | 'Admin Holding' | 'Admin Unit' | 'User';
  unit_id?: number | null;
  unit?: Unit;
}

export interface Asset {
  id: number;
  asset_tag: string;
  name: string;
  category: string;
  value: number;
  purchase_date: string;
  useful_life: number;
  status: AssetStatus;
  unit_id?: number | null;
  unit?: Unit;
  created_at?: string;
  updated_at?: string;
}

export interface Maintenance {
  id: number;
  asset_id: number;
  type: 'Perbaikan' | 'Pemeliharaan';
  date: string;
  unit_id?: number | null;
  party_type: 'Internal' | 'External';
  instansi: string;
  phone_number: string;
  photo_proof?: string | null;
  description?: string | null;
  status: MaintenanceStatus;
  validation_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  validated_by?: number | null;
  validation_date?: string | null;
  validation_notes?: string | null;
  completed_by?: number | null;
  completion_date?: string | null;
  asset?: Asset;
  unit?: Unit;
  validator?: User;
  completedBy?: User;
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
  status: 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED' | 'CLOSED';
  evidence_photo_path?: string;
  reviewed_by?: number;
  review_date?: string;
  resolution_notes?: string;
  responsible_party?: string;
  created_at: string;
  updated_at: string;
  asset?: Asset;
  reporter?: User;
  reviewer?: User;
}

export type DamageReport = IncidentReport;
export type LossReport = IncidentReport;

export enum AssetLoanStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  RETURNED = 'RETURNED',
  PENDING_RETURN = 'PENDING_RETURN',
  LOST = 'LOST' 
}

export interface AssetLoan {
  id: number;
  asset_id: number;
  borrower_id: number;
  request_date: string;
  loan_date: string | null;
  expected_return_date: string;
  actual_return_date: string | null;
  purpose: string;
  status: AssetLoanStatus;
  approved_by: number | null;
  approval_date: string | null;
  loan_proof_photo_path: string | null;
  return_proof_photo_path: string | null;
  return_condition: 'good' | 'damaged' | 'lost' | null;
  return_notes: string | null;
  rejection_reason: string | null;
  // Return approval fields
  return_verified_by: number | null;
  return_verification_date: string | null;
  return_rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  asset: Asset;
  borrower: User;
  approver: User | null;
  return_verifier?: User | null;
}

export interface AssetSale {
  id: number;
  asset_id: number;
  sold_by_id: number;
  sale_price: number;
  sale_date: string;
  buyer_name: string;
  buyer_contact?: string;
  sale_proof_path?: string;
  reason: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  asset: Asset;
  sold_by: User;
  profit_loss?: number;
  is_profit?: boolean;
}

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
  approved_loans: number;
  scheduled_maintenances: number;
  active_incidents: number;
  assets_by_category: ChartData[];
  assets_by_location: ChartData[];
}

export type View =
  | { type: 'DASHBOARD' }
  | { type: 'ASSET_LIST' }
  | { type: 'ASSET_LENDING' }
  | { type: 'ASSET_LOAN_MANAGEMENT' }
  | { type: 'ASSET_DETAIL', assetId: string }
  | { type: 'ASSET_SALES' }
  | { type: 'ASSET_SALE_DETAIL', saleId: string }
  | { type: 'QR_SCANNER' }
  | { type: 'USERS' }
  | { type: 'BULK_TRANSACTION' }
  | { type: 'REPORTS' }
  | { type: 'INVENTORY_AUDIT_SETUP' }
  | { type: 'INVENTORY_AUDIT_SESSION', location: string, mode: 'camera' | 'manual' };