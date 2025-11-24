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
  role: 'super-admin' | 'admin' | 'unit' | 'user' | 'auditor';
  unit_id?: number | null;
  unit?: Unit;
}
export interface AuthResponse {
  success: boolean;
  user: User;
  token: string;
  token_timeout?: number;
  sso_session_id?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SSOLoginResponse {
  success: boolean;
  user?: User;
  token?: string;
  sso_session_id?: string;
  message?: string;
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
  from_unit_id: number;
  to_unit_id: number;
  requested_by_id: number;
  validated_by_id?: number | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  notes?: string | null;
  rejection_reason?: string | null;
  requested_at: string;
  validated_at?: string | null;
  asset?: Asset;
  fromUnit?: Unit;
  toUnit?: Unit;
  requestedBy?: User;
  validatedBy?: User;
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
  start_time: string | null;
  end_time: string | null;
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

export enum AssetRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export enum AssetRequestLoanStatus {
  NOT_STARTED = 'NOT_STARTED',
  ACTIVE = 'ACTIVE',
  PENDING_RETURN = 'PENDING_RETURN',
  RETURNED = 'RETURNED',
  OVERDUE = 'OVERDUE'
}

export interface AssetRequest {
  id: number;
  requester_unit_id: number;
  requester_id: number;
  asset_name: string;
  asset_id: number | null;
  request_date: string;
  needed_date: string;
  expected_return_date: string;
  start_time: string | null;
  end_time: string | null;
  purpose: string;
  reason: string;
  status: AssetRequestStatus;
  reviewed_by: number | null;
  review_date: string | null;
  rejection_reason: string | null;
  approval_notes: string | null;
  loan_photo_path: string | null;
  // Loan tracking fields
  loan_status: AssetRequestLoanStatus | null;
  actual_loan_date: string | null;
  actual_return_date: string | null;
  return_notes: string | null;
  return_proof_photo_path: string | null;
  return_confirmed_by: number | null;
  return_confirmation_date: string | null;
  return_rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  requester_unit: Unit;
  requester: User;
  reviewer: User | null;
  return_confirmer?: User | null;
  asset?: Asset | null;
}

export enum InventoryAuditStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export interface InventoryAudit {
  id: number;
  unit_id: number;
  auditor_id: number;
  audit_code: string;
  scan_mode: 'camera' | 'manual';
  status: InventoryAuditStatus;
  started_at: string | null;
  completed_at: string | null;
  expected_asset_ids: number[];
  found_asset_ids: number[];
  misplaced_assets: MisplacedAsset[];
  notes: string | null;
  created_at: string;
  updated_at: string;
  unit?: Unit;
  auditor?: User;
  expected_assets?: Asset[];
  found_assets?: Asset[];
  missing_assets?: Asset[];
  found_count?: number;
  missing_count?: number;
  misplaced_count?: number;
  completion_percentage?: number;
}

export interface MisplacedAsset {
  id: number;
  name: string;
  asset_code: string;
  current_unit_id: number;
  current_unit_name: string;
  scanned_at: string;
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
  assets_sold: number;
  assets_lost: number;
  assets_by_category: ChartData[];
  assets_by_location: ChartData[];
}

export type AppMode = 'asset' | 'guarantee';

// Legacy - Kept for backward compatibility
export interface AssetGuarantee {
  id: number;
  asset_id: number;
  guarantor_name: string;
  guarantee_date: string;
  expiration_date: string;
  coverage_type: string;
  description?: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CLAIMED' | 'CANCELLED';
  created_at: string;
  updated_at: string;
  asset?: Asset;
}

// New Guarantee Interface - Jaminan Asset
export type GuaranteeType = 'BPKB' | 'SHM' | 'SHGB';

export type GuaranteeStatus = 'available' | 'dipinjam' | 'lunas';

export interface Guarantee {
  id: number;
  spk_number: string;
  cif_number: string;
  spk_name: string;
  credit_period: string;
  guarantee_name: string;
  guarantee_type: GuaranteeType;
  guarantee_number: string;
  file_location: string;
  input_date: string;
  status: GuaranteeStatus;
  created_at: string;
  updated_at: string;
}

export interface GuaranteeFormData {
  spk_number: string;
  cif_number: string;
  spk_name: string;
  credit_period: string;
  guarantee_name: string;
  guarantee_type: GuaranteeType;
  guarantee_number: string;
  file_location: string;
  input_date: string;
}

export interface GuaranteeLoan {
  id: number;
  guarantee_id: number;
  spk_number: string;
  cif_number: string;
  guarantee_type: GuaranteeType;
  file_location: string;
  borrower_name: string;
  borrower_contact: string;
  reason: string;
  loan_date: string;
  expected_return_date: string | null;
  actual_return_date: string | null;
  status: 'active' | 'returned';
  created_at: string;
  updated_at: string;
}

export interface GuaranteeSettlement {
  id: number;
  guarantee_id: number;
  loan_id?: number;
  spk_number?: string;
  cif_number?: string;
  guarantee_name?: string;
  guarantee_type?: GuaranteeType;
  borrower_name?: string;
  borrower_contact?: string;
  loan_date?: string;
  expected_return_date?: string | null;
  settlement_date: string;
  settlement_notes?: string | null;
  bukti_pelunasan?: string | null;
  settlement_status: 'pending' | 'approved' | 'rejected';
  settled_by?: string | null;
  settlement_remarks?: string | null;
  created_at: string;
  updated_at: string;
}

export interface GuaranteeStats {
  total: number;
  by_type: {
    BPKB: number;
    SHM: number;
    SHGB: number;
  };
  total_spk: number;
  latest_input: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
  };
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
  | { type: 'INVENTORY_AUDIT_SESSION', unitId: number, unitName: string, auditId: number, mode: 'camera' | 'manual' }
  | { type: 'GUARANTEE_DASHBOARD' }
  | { type: 'GUARANTEE_LIST' };