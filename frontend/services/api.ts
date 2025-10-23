// api.ts - PERBAIKAN RESPONSE HANDLING
import { Asset, AssetMovement, Maintenance, User, DamageReport, LossReport, DashboardStats, AssetLoan, AssetLoanStatus, Unit, AssetSale, IncidentReport, AssetRequest } from '../types';

const API_BASE_URL = 'http://localhost:8000/api';

// Enhanced API request function dengan response handling yang lebih baik
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('auth_token');
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
      let errorDetail = `API error: ${response.status}`;
      try {
        const errorData = await response.json();
        errorDetail = errorData.message || errorData.error || errorDetail;
      } catch {
        errorDetail = response.statusText || errorDetail;
      }
      
      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        window.location.href = '/';
      }
      throw new Error(errorDetail);
    }

    const data = await response.json();
    console.log(`API Response ${endpoint}:`, data); // Debug log
    return data;
  } catch (error: any) {
    console.error('API Request failed:', error);
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error: Please check your internet connection');
    }
    
    throw error;
  }
};

// ✅ PERBAIKAN: Generic response handler
const handleApiResponse = <T>(response: any): T => {
  console.log('Raw API response:', response); // Debug log
  
  if (typeof response !== 'object' || response === null) {
    throw new Error('Invalid API response format');
  }

  // Jika response memiliki structure {success, data, message}
  if ('success' in response) {
    if (response.success) {
      return response.data !== undefined ? response.data : response;
    } else {
      throw new Error(response.message || 'API request failed');
    }
  }
  
  // Jika response langsung data (tanpa wrapper)
  return response;
};

// Auth API
export const loginUser = async (username: string, password: string): Promise<User | null> => {
  try {
    const data = await apiRequest('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (data.success && data.token) {
      localStorage.setItem('auth_token', data.token);
      return data.user;
    }
    return null;
  } catch (error) {
    console.error('Login error:', error);
    return null;
  }
};

export const logoutUser = async (): Promise<void> => {
  try {
    await apiRequest('/logout', { method: 'POST' });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    localStorage.removeItem('auth_token');
  }
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const data = await apiRequest('/user');
    if (data && data.success && data.user) {
      return data.user as User;
    }
    return null;
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
};

// Dashboard API
export const getDashboardStats = async (
  unitId?: string | number,
  startDate?: string,
  endDate?: string
): Promise<DashboardStats> => {
  const queryParams = new URLSearchParams();
  if (unitId && unitId !== 'all') {
    queryParams.append('unit_id', unitId.toString());
  }
  if (startDate) {
    queryParams.append('start_date', startDate);
  }
  if (endDate) {
    queryParams.append('end_date', endDate);
  }

  const queryString = queryParams.toString();
  const endpoint = queryString ? `/dashboard/stats?${queryString}` : '/dashboard/stats';

  const data = await apiRequest(endpoint);
  return handleApiResponse<DashboardStats>(data);
};

// Assets API - ✅ PERBAIKAN UTAMA: Fix response handling
export const getAssets = async (filters: { category?: string; location?: string; status?: string } = {}): Promise<Asset[]> => {
  const queryParams = new URLSearchParams();
  if (filters.category) queryParams.append('category', filters.category);
  if (filters.location) queryParams.append('location', filters.location);
  if (filters.status) queryParams.append('status', filters.status);

  const queryString = queryParams.toString();
  const endpoint = queryString ? `/assets?${queryString}` : '/assets';
  
  try {
    const response = await apiRequest(endpoint);
    const handledResponse = handleApiResponse<any>(response);

    // Check for Laravel pagination structure
    if (handledResponse && typeof handledResponse === 'object' && Array.isArray(handledResponse.data)) {
      return handledResponse.data;
    }

    // Fallback for direct array response
    if (Array.isArray(handledResponse)) {
      return handledResponse;
    }
    
    console.warn('Assets response is not in a recognized format:', handledResponse);
    return [];
  } catch (error: any) {
    console.error('Error in getAssets:', error);
    return [];
  }
};

// ==================== DEPRECIATION API ====================

// Get depresiasi data untuk asset
export const getAssetDepreciation = async (assetId: string): Promise<any> => {
  try {
    const data = await apiRequest(`/assets/${assetId}/depreciation`);
    return handleApiResponse(data);
  } catch (error: any) {
    console.error('Get asset depreciation error:', error);
    
    if (error.message.includes('404') || error.message.includes('not found')) {
      return null;
    }
    throw error;
  }
};

// Get depresiasi preview
export const getAssetDepreciationPreview = async (assetId: string): Promise<any> => {
  try {
    const data = await apiRequest(`/assets/${assetId}/depreciation-preview`);
    return handleApiResponse(data);
  } catch (error: any) {
    console.error('Get asset depreciation preview error:', error);
    
    if (error.message.includes('404') || error.message.includes('not found')) {
      return null;
    }
    throw error;
  }
};

// Get depresiasi status
export const getAssetDepreciationStatus = async (assetId: string): Promise<any> => {
  try {
    const data = await apiRequest(`/assets/${assetId}/depreciation-status`);
    return {
      success: data.success,
      data: handleApiResponse(data)
    };
  } catch (error: any) {
    console.error('Get asset depreciation status error:', error);
    
    return {
      success: false,
      message: error.message || 'Failed to get depreciation status',
      data: null,
      error: error.message
    };
  }
};

// Generate single depreciation
export const generateAssetDepreciation = async (assetId: string): Promise<any> => {
  try {
    const data = await apiRequest(`/assets/${assetId}/generate-depreciation`, {
      method: 'POST',
    });
    
    return {
      success: data.success,
      message: data.message,
      data: handleApiResponse(data),
      debug_info: data.debug_info
    };
  } catch (error: any) {
    console.error('Generate asset depreciation error:', error);
    
    let errorMessage = error.message || 'Failed to generate depreciation';
    
    if (error.message.includes('500')) {
      if (error.message.includes('unique') || error.message.includes('duplicate')) {
        errorMessage = 'Depreciation record already exists for this period';
      } else if (error.message.includes('useful life') || error.message.includes('maximum')) {
        errorMessage = 'Maximum depreciation period reached';
      }
    }
    
    return {
      success: false,
      message: errorMessage,
      data: null,
      error: errorMessage
    };
  }
};

// Generate multiple depreciations
export const generateMultipleDepreciations = async (assetId: string, count: number): Promise<any> => {
  try {
    const data = await apiRequest(`/assets/${assetId}/generate-multiple-depreciation`, {
      method: 'POST',
      body: JSON.stringify({ count }),
    });
    
    return {
      success: data.success,
      message: data.message,
      data: handleApiResponse(data),
      processed_count: data.processed_count,
      remaining_depreciable_amount: data.remaining_depreciable_amount,
      is_fully_depreciated: data.is_fully_depreciated
    };
  } catch (error: any) {
    console.error('Generate multiple depreciations error:', error);
    
    return {
      success: false,
      message: error.message || 'Failed to generate multiple depreciations',
      data: null,
      error: error.message,
      processed_count: 0
    };
  }
};

// Generate depresiasi sampai nilai 0
export const generateDepreciationUntilZero = async (assetId: string): Promise<any> => {
  try {
    const data = await apiRequest(`/assets/${assetId}/generate-until-zero`, {
      method: 'POST',
    });
    
    return {
      success: data.success,
      message: data.message,
      data: handleApiResponse(data),
      processed_count: data.processed_count,
      reached_zero: data.reached_zero,
      is_fully_depreciated: data.is_fully_depreciated,
      total_depreciated_amount: data.total_depreciated_amount
    };
  } catch (error: any) {
    console.error('Generate depreciation until zero error:', error);
    
    return {
      success: false,
      message: error.message || 'Failed to generate depreciation until zero',
      data: null,
      error: error.message,
      processed_count: 0,
      reached_zero: false
    };
  }
};

// Generate depresiasi sampai nilai tertentu
export const generateDepreciationUntilValue = async (assetId: string, targetValue: number): Promise<any> => {
  try {
    const data = await apiRequest(`/assets/${assetId}/generate-until-value`, {
      method: 'POST',
      body: JSON.stringify({ target_value: targetValue }),
    });
    
    return {
      success: data.success,
      message: data.message,
      data: handleApiResponse(data),
      processed_count: data.processed_count,
      target_achieved: data.target_achieved,
      remaining_depreciable_amount: data.remaining_depreciable_amount
    };
  } catch (error: any) {
    console.error('Generate depreciation until value error:', error);
    
    return {
      success: false,
      message: error.message || 'Failed to generate depreciation until value',
      data: null,
      error: error.message,
      processed_count: 0,
      target_achieved: false
    };
  }
};

// Generate semua depresiasi untuk semua asset
export const generateAllDepreciation = async (): Promise<any> => {
  try {
    const data = await apiRequest('/depreciation/generate-all', {
      method: 'POST',
    });
    
    return {
      success: data.success,
      message: data.message,
      data: handleApiResponse(data),
      processed_count: data.data?.processed_count || 0
    };
  } catch (error: any) {
    console.error('Generate all depreciation error:', error);
    
    return {
      success: false,
      message: error.message || 'Failed to generate depreciation for all assets',
      data: null,
      error: error.message,
      processed_count: 0
    };
  }
};

// Reset depresiasi untuk asset
export const resetAssetDepreciation = async (assetId: string): Promise<any> => {
  try {
    const data = await apiRequest(`/assets/${assetId}/reset-depreciation`, {
      method: 'POST',
    });
    
    return {
      success: data.success,
      message: data.message,
      data: handleApiResponse(data)
    };
  } catch (error: any) {
    console.error('Reset asset depreciation error:', error);
    
    return {
      success: false,
      message: error.message || 'Failed to reset depreciation',
      data: null,
      error: error.message
    };
  }
};

// Get depresiasi schedule (jadwal masa depan)
export const getDepreciationSchedule = async (assetId: string): Promise<any> => {
  try {
    const data = await apiRequest(`/assets/${assetId}/depreciation-schedule`);
    return {
      success: data.success,
      data: handleApiResponse(data)
    };
  } catch (error: any) {
    console.error('Get depreciation schedule error:', error);
    
    return {
      success: false,
      message: error.message || 'Failed to get depreciation schedule',
      data: null,
      error: error.message
    };
  }
};

// Get total depresiasi yang sudah dilakukan
export const getTotalDepreciatedAmount = async (assetId: string): Promise<any> => {
  try {
    const data = await apiRequest(`/assets/${assetId}/total-depreciated`);
    return {
      success: data.success,
      data: handleApiResponse(data)
    };
  } catch (error: any) {
    console.error('Get total depreciated amount error:', error);
    
    return {
      success: false,
      message: error.message || 'Failed to get total depreciated amount',
      data: null,
      error: error.message
    };
  }
};

// ==================== ASSET MANAGEMENT API ====================

export const getAssetById = async (id: string): Promise<Asset | null> => {
  try {
    const data = await apiRequest(`/assets/${id}`);
    const asset = handleApiResponse<Asset>(data);

    if (!asset || typeof asset !== 'object') {
      console.warn('Invalid asset data:', asset);
      return null;
    }

    return asset;
  } catch (error: any) {
    console.error('Get asset by ID error:', error);

    if (error.message.includes('404') || error.message.includes('not found')) {
      return null;
    }

    return null;
  }
};

// ✅ NEW FUNCTION: Get asset by asset_tag (untuk QR Scanner)
export const getAssetByTag = async (assetTag: string): Promise<Asset | null> => {
  try {
    const data = await apiRequest(`/assets/tag/${assetTag}`);
    const asset = handleApiResponse<Asset>(data);

    if (!asset || typeof asset !== 'object') {
      console.warn('Invalid asset data:', asset);
      return null;
    }

    return asset;
  } catch (error: any) {
    console.error('Get asset by tag error:', error);

    if (error.message.includes('404') || error.message.includes('not found')) {
      return null;
    }

    return null;
  }
};

export const addAsset = async (assetData: Omit<Asset, 'id' | 'asset_tag'>): Promise<Asset> => {
  const data = await apiRequest('/assets', {
    method: 'POST',
    body: JSON.stringify(assetData),
  });
  return handleApiResponse<Asset>(data);
};

export const updateAsset = async (id: string, assetData: Partial<Asset>): Promise<Asset> => {
  const data = await apiRequest(`/assets/${id}`, {
    method: 'PUT',
    body: JSON.stringify(assetData),
  });
  return handleApiResponse<Asset>(data);
};

export const deleteAsset = async (id: string): Promise<boolean> => {
  try {
    const data = await apiRequest(`/assets/${id}`, { method: 'DELETE' });
    return data.success || true;
  } catch (error) {
    console.error('Delete asset error:', error);
    return false;
  }
};

// Asset Movements API
export const getAssetHistory = async (assetId: string): Promise<AssetMovement[]> => {
  try {
    const data = await apiRequest(`/assets/${assetId}/movements`);
    const history = handleApiResponse<AssetMovement[]>(data);
    return Array.isArray(history) ? history : [];
  } catch (error) {
    console.error('Get asset history error:', error);
    return [];
  }
};

// Get available assets for borrowing (User role)
export const getAvailableAssets = async (search?: string): Promise<Asset[]> => {
  const queryParams = new URLSearchParams();
  if (search) queryParams.append('search', search);

  const queryString = queryParams.toString();
  const endpoint = queryString ? `/user-assets?${queryString}` : '/user-assets';

  try {
    const response = await apiRequest(endpoint);
    const handledResponse = handleApiResponse<any>(response);

    // Check for Laravel pagination structure
    if (handledResponse && typeof handledResponse === 'object' && Array.isArray(handledResponse.data)) {
      return handledResponse.data;
    }

    // Fallback for direct array response
    if (Array.isArray(handledResponse)) {
      return handledResponse;
    }

    console.warn('Available assets response is not in a recognized format:', handledResponse);
    return [];
  } catch (error: any) {
    console.error('Error in getAvailableAssets:', error);
    return [];
  }
};

export const getAllMovements = async (): Promise<AssetMovement[]> => {
  const data = await apiRequest('/asset-movements');
  return handleApiResponse<AssetMovement[]>(data);
};

export const addAssetMovement = async (movementData: { assetId: string; location: string; movedBy: string }): Promise<AssetMovement> => {
  const data = await apiRequest('/asset-movements', {
    method: 'POST',
    body: JSON.stringify(movementData),
  });
  return handleApiResponse<AssetMovement>(data);
};

// Maintenance API
export const getMaintenanceHistory = async (assetId: string): Promise<Maintenance[]> => {
  try {
    const data = await apiRequest(`/assets/${assetId}/maintenances`);
    const maintenance = handleApiResponse<Maintenance[]>(data);
    return Array.isArray(maintenance) ? maintenance : [];
  } catch (error) {
    console.error('Get maintenance history error:', error);
    return [];
  }
};

export const getAllMaintenance = async (): Promise<Maintenance[]> => {
  const data = await apiRequest('/maintenances');
  return handleApiResponse<Maintenance[]>(data);
};

export const addMaintenance = async (maintData: Omit<Maintenance, 'id'>): Promise<Maintenance> => {
  const data = await apiRequest('/maintenances', {
    method: 'POST',
    body: JSON.stringify(maintData),
  });
  return handleApiResponse<Maintenance>(data);
};

// Incident Reports API
export const getDamageReports = async (assetId: string): Promise<DamageReport[]> => {
  try {
    const data = await apiRequest(`/assets/${assetId}/incident-reports`);
    const reports = handleApiResponse<any[]>(data);
    
    if (!Array.isArray(reports)) return [];
    
    return reports.filter((report: any) => report.type === 'Damage');
  } catch (error) {
    console.error('Get damage reports error:', error);
    return [];
  }
};

export const getAllDamageReports = async (): Promise<DamageReport[]> => {
  const data = await apiRequest('/incident-reports');
  const reports = handleApiResponse<any[]>(data);
  
  if (!Array.isArray(reports)) return [];
  
  return reports.filter((report: any) => report.type === 'Damage');
};

export const addDamageReport = async (reportData: Omit<DamageReport, 'id'>): Promise<DamageReport> => {
  const data = await apiRequest('/incident-reports', {
    method: 'POST',
    body: JSON.stringify({ ...reportData, type: 'Damage' }),
  });
  return handleApiResponse<DamageReport>(data);
};

export const getLossReports = async (assetId: string): Promise<LossReport[]> => {
  try {
    const data = await apiRequest(`/assets/${assetId}/incident-reports`);
    const reports = handleApiResponse<any[]>(data);
    
    if (!Array.isArray(reports)) return [];
    
    return reports.filter((report: any) => report.type === 'Loss');
  } catch (error) {
    console.error('Get loss reports error:', error);
    return [];
  }
};

export const getAllLossReports = async (): Promise<LossReport[]> => {
  const data = await apiRequest('/incident-reports');
  const reports = handleApiResponse<any[]>(data);
  
  if (!Array.isArray(reports)) return [];
  
  return reports.filter((report: any) => report.type === 'Loss');
};

export const addLossReport = async (reportData: Omit<LossReport, 'id'>): Promise<LossReport> => {
  const data = await apiRequest('/incident-reports', {
    method: 'POST',
    body: JSON.stringify({ ...reportData, type: 'Loss' }),
  });
  return handleApiResponse<LossReport>(data);
};



// ==================== ASSET LOAN API ====================

export const getAssetLoans = async (status?: AssetLoanStatus): Promise<AssetLoan[]> => {
  const endpoint = status ? `/asset-loans?status=${status}` : '/asset-loans';

  try {
    const response = await apiRequest(endpoint);
    const handledResponse = handleApiResponse<any>(response);

    // Check for Laravel pagination structure
    if (handledResponse && typeof handledResponse === 'object' && Array.isArray(handledResponse.data)) {
      return handledResponse.data;
    }

    // Fallback for direct array response
    if (Array.isArray(handledResponse)) {
      return handledResponse;
    }

    console.warn('Asset loans response is not in a recognized format:', handledResponse);
    return [];
  } catch (error: any) {
    console.error('Error in getAssetLoans:', error);
    return [];
  }
};

export const requestAssetLoan = async (loanData: { 
  asset_id: number; 
  expected_return_date: string; 
  purpose: string 
}): Promise<AssetLoan> => {
  const data = await apiRequest('/asset-loans', {
    method: 'POST',
    body: JSON.stringify(loanData),
  });
  return handleApiResponse<AssetLoan>(data);
};

export const approveAssetLoan = async (loanId: number, formData: FormData): Promise<AssetLoan> => {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(`${API_BASE_URL}/asset-loans/${loanId}/approve`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to approve loan');
  }

  const data = await response.json();
  return data.data;
};

export const rejectAssetLoan = async (loanId: number, data: { 
  approval_date: string;
  rejection_reason: string 
}): Promise<AssetLoan> => {
  const responseData = await apiRequest(`/asset-loans/${loanId}/reject`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return handleApiResponse<AssetLoan>(responseData.data);
};

export const returnAssetLoan = async (loanId: number, formData: FormData): Promise<AssetLoan> => {
  const token = localStorage.getItem('auth_token');

  const response = await fetch(`${API_BASE_URL}/asset-loans/${loanId}/return`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      // Don't set Content-Type, let browser set it with boundary for multipart/form-data
    },
    body: formData,
  });

  if (!response.ok) {
    let errorDetail = `API error: ${response.status}`;
    try {
      const errorData = await response.json();
      errorDetail = errorData.message || errorData.error || errorDetail;
    } catch {
      errorDetail = response.statusText || errorDetail;
    }
    throw new Error(errorDetail);
  }

  const data = await response.json();
  return handleApiResponse<AssetLoan>(data);
};


// ==================== UNIT API ====================

export const getUnits = async (): Promise<Unit[]> => {
  try {
    const data = await apiRequest('/units');
    return handleApiResponse<Unit[]>(data);
  } catch (error) {
    console.error('Get units error:', error);
    return [];
  }
};

export const getUnitById = async (unitId: number): Promise<Unit | null> => {
  try {
    const data = await apiRequest(`/units/${unitId}`);
    return handleApiResponse<Unit>(data);
  } catch (error) {
    console.error('Get unit by ID error:', error);
    return null;
  }
};

export const getUnitAssets = async (unitId: number): Promise<Asset[]> => {
  try {
    const data = await apiRequest(`/units/${unitId}/assets`);
    return handleApiResponse<Asset[]>(data);
  } catch (error) {
    console.error('Get unit assets error:', error);
    return [];
  }
};

export const getUnitUsers = async (unitId: number): Promise<User[]> => {
  try {
    const data = await apiRequest(`/units/${unitId}/users`);
    return handleApiResponse<User[]>(data);
  } catch (error) {
    console.error('Get unit users error:', error);
    return [];
  }
};

// Users API
export const getUsers = async (): Promise<User[]> => {
  return [];
};

// Bulk Assets
export const addBulkAssets = async (assetsData: Omit<Asset, 'id'>[]): Promise<Asset[]> => {
  const promises = assetsData.map(asset => addAsset(asset));
  return Promise.all(promises);
};

// Utility function untuk check auth
export const checkAuthStatus = (): boolean => {
  const token = localStorage.getItem('auth_token');
  return !!token;
};

// Export types untuk depreciation responses
export interface DepreciationResponse {
  success: boolean;
  message: string;
  data: any;
  error?: string;
}

export interface GenerateDepreciationResponse extends DepreciationResponse {
  processed_count?: number;
  debug_info?: any;
}

export interface MultipleDepreciationResponse extends DepreciationResponse {
  processed_count: number;
  remaining_depreciable_amount?: number;
  is_fully_depreciated?: boolean;
}

export interface UntilZeroResponse extends MultipleDepreciationResponse {
  reached_zero: boolean;
  total_depreciated_amount?: number;
}

export interface UntilValueResponse extends MultipleDepreciationResponse {
  target_achieved: boolean;
}

// Helper function untuk format currency
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Helper function untuk format date
export const formatDate = (dateString: string): string => {
  try {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return 'Invalid Date';
  }
};

// Helper function untuk check jika asset bisa didepresiasi
export const canAssetDepreciate = (depreciationData: any): boolean => {
  if (!depreciationData) return false;
  
  return depreciationData.is_depreciable && 
         depreciationData.remaining_months > 0 && 
         depreciationData.current_value > 0;
};

// Helper function untuk get depresiasi progress
export const getDepreciationProgress = (depreciationData: any): number => {
  if (!depreciationData) return 0;

  return depreciationData.completion_percentage || 0;
};


// ==================== ASSET SALES API ====================

export const getAssetSales = async (params?: { unit_id?: number; search?: string; start_date?: string; end_date?: string }): Promise<AssetSale[]> => {
  const queryParams = new URLSearchParams();
  if (params?.unit_id) queryParams.append('unit_id', params.unit_id.toString());
  if (params?.search) queryParams.append('search', params.search);
  if (params?.start_date) queryParams.append('start_date', params.start_date);
  if (params?.end_date) queryParams.append('end_date', params.end_date);

  const queryString = queryParams.toString();
  const endpoint = queryString ? `/asset-sales?${queryString}` : '/asset-sales';

  try {
    const response = await apiRequest(endpoint);
    const handledResponse = handleApiResponse<any>(response);

    // Check for Laravel pagination structure
    if (handledResponse && typeof handledResponse === 'object' && Array.isArray(handledResponse.data)) {
      return handledResponse.data;
    }

    // Fallback for direct array response
    if (Array.isArray(handledResponse)) {
      return handledResponse;
    }

    console.warn('Asset sales response is not in a recognized format:', handledResponse);
    return [];
  } catch (error: any) {
    console.error('Error in getAssetSales:', error);
    return [];
  }
};

export const getAssetSaleById = async (id: number): Promise<AssetSale | null> => {
  try {
    const data = await apiRequest(`/asset-sales/${id}`);
    return handleApiResponse<AssetSale>(data);
  } catch (error) {
    console.error('Get asset sale by ID error:', error);
    return null;
  }
};

export const createAssetSale = async (formData: FormData): Promise<AssetSale> => {
  const token = localStorage.getItem('auth_token');

  const response = await fetch(`${API_BASE_URL}/asset-sales`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      // Don't set Content-Type for FormData, let browser set it
    },
    body: formData,
  });

  if (!response.ok) {
    let errorDetail = `API error: ${response.status}`;
    try {
      const errorData = await response.json();
      errorDetail = errorData.message || errorData.error || errorDetail;
    } catch {
      errorDetail = response.statusText || errorDetail;
    }
    throw new Error(errorDetail);
  }

  const data = await response.json();
  return handleApiResponse<AssetSale>(data);
};

export const updateAssetSale = async (id: number, formData: FormData): Promise<AssetSale> => {
  const token = localStorage.getItem('auth_token');

  const response = await fetch(`${API_BASE_URL}/asset-sales/${id}`, {
    method: 'POST', // Using POST with _method=PUT for FormData
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    let errorDetail = `API error: ${response.status}`;
    try {
      const errorData = await response.json();
      errorDetail = errorData.message || errorData.error || errorDetail;
    } catch {
      errorDetail = response.statusText || errorDetail;
    }
    throw new Error(errorDetail);
  }

  const data = await response.json();
  return handleApiResponse<AssetSale>(data);
};

export const cancelAssetSale = async (id: number): Promise<boolean> => {
  try {
    const data = await apiRequest(`/asset-sales/${id}`, { method: 'DELETE' });
    return data.success || true;
  } catch (error) {
    console.error('Cancel asset sale error:', error);
    throw error;
  }
};

export const getAssetSalesStatistics = async (): Promise<any> => {
  try {
    const data = await apiRequest('/asset-sales/statistics');
    return handleApiResponse<any>(data);
  } catch (error) {
    console.error('Get asset sales statistics error:', error);
    return null;
  }
};

export const getAvailableAssetsForSale = async (search?: string): Promise<Asset[]> => {
  const queryParams = new URLSearchParams();
  if (search) queryParams.append('search', search);

  const queryString = queryParams.toString();
  const endpoint = queryString ? `/asset-sales/available-assets?${queryString}` : '/asset-sales/available-assets';

  try {
    const response = await apiRequest(endpoint);
    const handledResponse = handleApiResponse<any>(response);

    if (Array.isArray(handledResponse)) {
      return handledResponse;
    }

    console.warn('Available assets for sale response is not in a recognized format:', handledResponse);
    return [];
  } catch (error: any) {
    console.error('Error in getAvailableAssetsForSale:', error);
    return [];
  }
};

export const getAssetSaleProof = (saleId: number): string => {
  const token = localStorage.getItem('auth_token');
  return `${API_BASE_URL}/asset-sales/${saleId}/proof?token=${token}`;
};


// ==================== ASSET LOAN RETURN APPROVAL API ====================

export const getPendingReturns = async (params?: { per_page?: number; sort_by?: string; sort_order?: string }): Promise<any> => {
  const queryParams = new URLSearchParams();
  if (params?.per_page) queryParams.append('per_page', params.per_page.toString());
  if (params?.sort_by) queryParams.append('sort_by', params.sort_by);
  if (params?.sort_order) queryParams.append('sort_order', params.sort_order);

  const queryString = queryParams.toString();
  const endpoint = queryString ? `/asset-loans-pending-returns?${queryString}` : '/asset-loans-pending-returns';

  try {
    const response = await apiRequest(endpoint);
    return handleApiResponse<any>(response);
  } catch (error: any) {
    console.error('Error in getPendingReturns:', error);
    throw error;
  }
};

export const approveAssetReturn = async (loanId: number, approvalData: {
  verification_date: string;
  condition: 'good' | 'damaged' | 'lost';
  assessment_notes?: string;
}): Promise<AssetLoan> => {
  const data = await apiRequest(`/asset-loans/${loanId}/approve-return`, {
    method: 'POST',
    body: JSON.stringify(approvalData),
  });
  return handleApiResponse<AssetLoan>(data);
};

export const rejectAssetReturn = async (loanId: number, data: {
  verification_date: string;
  rejection_reason: string;
}): Promise<AssetLoan> => {
  const responseData = await apiRequest(`/asset-loans/${loanId}/reject-return`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return handleApiResponse<AssetLoan>(responseData);
};

export const getReturnProofPhoto = (loanId: number): string => {
  const token = localStorage.getItem('auth_token');
  return `${API_BASE_URL}/asset-loans/${loanId}/return-proof?token=${token}`;
};

export const getAssetLoanHistory = async (assetId: string): Promise<AssetLoan[]> => {
  try {
    const data = await apiRequest(`/assets/${assetId}/loan-history`);
    const loanHistory = handleApiResponse<AssetLoan[]>(data);
    return Array.isArray(loanHistory) ? loanHistory : [];
  } catch (error) {
    console.error('Get asset loan history error:', error);
    return [];
  }
};


// ==================== INCIDENT REPORTS API (ENHANCED) ====================

export const getIncidentReports = async (params?: {
  status?: string;
  type?: string;
  search?: string;
  start_date?: string;
  end_date?: string;
  per_page?: number;
}): Promise<any> => {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.type) queryParams.append('type', params.type);
  if (params?.search) queryParams.append('search', params.search);
  if (params?.start_date) queryParams.append('start_date', params.start_date);
  if (params?.end_date) queryParams.append('end_date', params.end_date);
  if (params?.per_page) queryParams.append('per_page', params.per_page.toString());

  const queryString = queryParams.toString();
  const endpoint = queryString ? `/incident-reports?${queryString}` : '/incident-reports';

  try {
    const response = await apiRequest(endpoint);
    return handleApiResponse<any>(response);
  } catch (error: any) {
    console.error('Error in getIncidentReports:', error);
    return { data: [], total: 0 };
  }
};

export const getIncidentReportById = async (id: number): Promise<IncidentReport | null> => {
  try {
    const data = await apiRequest(`/incident-reports/${id}`);
    return handleApiResponse<IncidentReport>(data);
  } catch (error) {
    console.error('Get incident report by ID error:', error);
    return null;
  }
};

export const createIncidentReport = async (formData: FormData): Promise<IncidentReport> => {
  const token = localStorage.getItem('auth_token');

  const response = await fetch(`${API_BASE_URL}/incident-reports`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      // Don't set Content-Type for FormData, let browser set it
    },
    body: formData,
  });

  if (!response.ok) {
    let errorDetail = `API error: ${response.status}`;
    try {
      const errorData = await response.json();
      errorDetail = errorData.message || errorData.error || errorDetail;
    } catch {
      errorDetail = response.statusText || errorDetail;
    }
    throw new Error(errorDetail);
  }

  const data = await response.json();
  return handleApiResponse<IncidentReport>(data);
};

export const updateIncidentStatus = async (id: number, statusData: {
  status: 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED' | 'CLOSED';
  resolution_notes?: string;
  responsible_party?: string;
}): Promise<IncidentReport> => {
  const data = await apiRequest(`/incident-reports/${id}/update-status`, {
    method: 'POST',
    body: JSON.stringify(statusData),
  });
  return handleApiResponse<IncidentReport>(data);
};

export const deleteIncidentReport = async (id: number): Promise<boolean> => {
  try {
    const data = await apiRequest(`/incident-reports/${id}`, { method: 'DELETE' });
    return data.success || true;
  } catch (error) {
    console.error('Delete incident report error:', error);
    throw error;
  }
};

export const getIncidentPhoto = (incidentId: number): string => {
  const token = localStorage.getItem('auth_token');
  return `${API_BASE_URL}/incident-reports/${incidentId}/photo?token=${token}`;
};

export const getAssetIncidentReports = async (assetId: number): Promise<IncidentReport[]> => {
  try {
    const data = await apiRequest(`/assets/${assetId}/incident-reports`);
    const reports = handleApiResponse<IncidentReport[]>(data);
    return Array.isArray(reports) ? reports : [];
  } catch (error) {
    console.error('Get asset incident reports error:', error);
    return [];
  }
};

export const getIncidentStatistics = async (): Promise<any> => {
  try {
    const data = await apiRequest('/incident-reports-statistics');
    return handleApiResponse<any>(data);
  } catch (error) {
    console.error('Get incident statistics error:', error);
    return null;
  }
};


// ==================== ASSET REQUESTS API ====================

export const getAssetRequests = async (params?: { status?: string }): Promise<any[]> => {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);

  const queryString = queryParams.toString();
  const endpoint = queryString ? `/asset-requests?${queryString}` : '/asset-requests';

  try {
    const response = await apiRequest(endpoint);
    const handledResponse = handleApiResponse<any>(response);

    if (Array.isArray(handledResponse)) {
      return handledResponse;
    }

    console.warn('Asset requests response is not in a recognized format:', handledResponse);
    return [];
  } catch (error: any) {
    console.error('Error in getAssetRequests:', error);
    return [];
  }
};

export const getAssetRequestById = async (id: number): Promise<any | null> => {
  try {
    const data = await apiRequest(`/asset-requests/${id}`);
    return handleApiResponse<any>(data);
  } catch (error) {
    console.error('Get asset request by ID error:', error);
    return null;
  }
};

export const createAssetRequest = async (requestData: {
  asset_id: number;
  needed_date: string;
  expected_return_date: string;
  start_time: string;
  end_time: string;
  purpose: string;
  reason: string;
}): Promise<any> => {
  const data = await apiRequest('/asset-requests', {
    method: 'POST',
    body: JSON.stringify(requestData),
  });
  return handleApiResponse<any>(data);
};

export const approveAssetRequest = async (id: number, approvalData: {
  approval_notes?: string
}): Promise<any> => {
  const data = await apiRequest(`/asset-requests/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify(approvalData),
  });
  return handleApiResponse<any>(data);
};

export const rejectAssetRequest = async (id: number, rejectionData: {
  rejection_reason: string
}): Promise<any> => {
  const data = await apiRequest(`/asset-requests/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify(rejectionData),
  });
  return handleApiResponse<any>(data);
};


// ==================== REPORTS API ====================

export interface ReportFilters {
  unit_id?: string | number;
  category?: string;
  status?: string;
  type?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
  month?: string;
  year?: string;
}

export interface ReportResponse<T = any> {
  success: boolean;
  message: string;
  data: T[];
  summary?: any;
}

export const getFullAssetReport = async (filters?: ReportFilters): Promise<any> => {
  const queryParams = new URLSearchParams();
  if (filters?.unit_id && filters.unit_id !== 'all') queryParams.append('unit_id', filters.unit_id.toString());
  if (filters?.category) queryParams.append('category', filters.category);
  if (filters?.status) queryParams.append('status', filters.status);
  if (filters?.search) queryParams.append('search', filters.search);
  if (filters?.month) queryParams.append('month', filters.month);
  if (filters?.year) queryParams.append('year', filters.year);

  const queryString = queryParams.toString();
  const endpoint = queryString ? `/reports/full-asset?${queryString}` : '/reports/full-asset';

  try {
    // Return the full response object
    return await apiRequest(endpoint);
  } catch (error: any) {
    console.error('Error in getFullAssetReport:', error);
    // Return a consistent error object
    return { success: false, message: error.message, data: [], summary: {} };
  }
};

export const getMaintenanceReport = async (filters?: ReportFilters): Promise<any> => {
  const queryParams = new URLSearchParams();
  if (filters?.unit_id && filters.unit_id !== 'all') queryParams.append('unit_id', filters.unit_id.toString());
  if (filters?.status) queryParams.append('status', filters.status);
  if (filters?.start_date) queryParams.append('start_date', filters.start_date);
  if (filters?.end_date) queryParams.append('end_date', filters.end_date);

  const queryString = queryParams.toString();
  const endpoint = queryString ? `/reports/maintenance?${queryString}` : '/reports/maintenance';

  try {
    // Return the full response object
    return await apiRequest(endpoint);
  } catch (error: any) {
    console.error('Error in getMaintenanceReport:', error);
    // Return a consistent error object
    return { success: false, message: error.message, data: [], summary: {} };
  }
};

export const getRepairReport = async (filters?: ReportFilters): Promise<any> => {
  const queryParams = new URLSearchParams();
  if (filters?.unit_id && filters.unit_id !== 'all') queryParams.append('unit_id', filters.unit_id.toString());
  if (filters?.status) queryParams.append('status', filters.status);
  if (filters?.start_date) queryParams.append('start_date', filters.start_date);
  if (filters?.end_date) queryParams.append('end_date', filters.end_date);

  const queryString = queryParams.toString();
  const endpoint = queryString ? `/reports/repair?${queryString}` : '/reports/repair';

  try {
    // Return the full response object
    return await apiRequest(endpoint);
  } catch (error: any) {
    console.error('Error in getRepairReport:', error);
    // Return a consistent error object
    return { success: false, message: error.message, data: [], summary: {} };
  }
};

export const getLoanReport = async (filters?: ReportFilters): Promise<any> => {
  const queryParams = new URLSearchParams();
  if (filters?.unit_id && filters.unit_id !== 'all') queryParams.append('unit_id', filters.unit_id.toString());
  if (filters?.status) queryParams.append('status', filters.status);
  if (filters?.start_date) queryParams.append('start_date', filters.start_date);
  if (filters?.end_date) queryParams.append('end_date', filters.end_date);

  const queryString = queryParams.toString();
  const endpoint = queryString ? `/reports/loan?${queryString}` : '/reports/loan';

  try {
    // Return the full response object
    return await apiRequest(endpoint);
  } catch (error: any) {
    console.error('Error in getLoanReport:', error);
    // Return a consistent error object
    return { success: false, message: error.message, data: [], summary: {} };
  }
};

export const getDamageReport = async (filters?: ReportFilters): Promise<any> => {
  const queryParams = new URLSearchParams();
  if (filters?.unit_id && filters.unit_id !== 'all') queryParams.append('unit_id', filters.unit_id.toString());
  if (filters?.status) queryParams.append('status', filters.status);
  if (filters?.start_date) queryParams.append('start_date', filters.start_date);
  if (filters?.end_date) queryParams.append('end_date', filters.end_date);

  const queryString = queryParams.toString();
  const endpoint = queryString ? `/reports/damage?${queryString}` : '/reports/damage';

  try {
    // Return the full response object
    return await apiRequest(endpoint);
  } catch (error: any) {
    console.error('Error in getDamageReport:', error);
    // Return a consistent error object
    return { success: false, message: error.message, data: [], summary: {} };
  }
};

export const getSaleReport = async (filters?: ReportFilters): Promise<any> => {
  const queryParams = new URLSearchParams();
  if (filters?.unit_id && filters.unit_id !== 'all') queryParams.append('unit_id', filters.unit_id.toString());
  if (filters?.start_date) queryParams.append('start_date', filters.start_date);
  if (filters?.end_date) queryParams.append('end_date', filters.end_date);

  const queryString = queryParams.toString();
  const endpoint = queryString ? `/reports/sale?${queryString}` : '/reports/sale';

  try {
    // Return the full response object
    return await apiRequest(endpoint);
  } catch (error: any) {
    console.error('Error in getSaleReport:', error);
    // Return a consistent error object
    return { success: false, message: error.message, data: [], summary: {} };
  }
};

export const getLossReport = async (filters?: ReportFilters): Promise<any> => {
  const queryParams = new URLSearchParams();
  if (filters?.unit_id && filters.unit_id !== 'all') queryParams.append('unit_id', filters.unit_id.toString());
  if (filters?.status) queryParams.append('status', filters.status);
  if (filters?.start_date) queryParams.append('start_date', filters.start_date);
  if (filters?.end_date) queryParams.append('end_date', filters.end_date);

  const queryString = queryParams.toString();
  const endpoint = queryString ? `/reports/loss?${queryString}` : '/reports/loss';

  try {
    // Return the full response object
    return await apiRequest(endpoint);
  } catch (error: any) {
    console.error('Error in getLossReport:', error);
    // Return a consistent error object
    return { success: false, message: error.message, data: [], summary: {} };
  }
};

// Get all reports (comprehensive report)
export const getAllReports = async (filters?: ReportFilters): Promise<any> => {
  try {
    // Fetch all reports in parallel
    const [assets, maintenance, repair, loan, damage, sale, loss] = await Promise.all([
      getFullAssetReport(filters),
      getMaintenanceReport(filters),
      getRepairReport(filters),
      getLoanReport(filters),
      getDamageReport(filters),
      getSaleReport(filters),
      getLossReport(filters),
    ]);

    return {
      success: true,
      message: 'All reports retrieved successfully',
      data: {
        assets,
        maintenance,
        repair,
        loan,
        damage,
        sale,
        loss,
      },
    };
  } catch (error: any) {
    console.error('Error in getAllReports:', error);
    return {
      success: false,
      message: error.message || 'Failed to retrieve all reports',
      data: null,
    };
  }
};