import { Asset, AssetMovement, Maintenance, User, DamageReport, LossReport, DashboardStats } from '../types';

const API_BASE_URL = 'http://localhost:8000/api';

// Enhanced API request function dengan error handling yang lebih baik
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
      // Coba parse error response untuk detail
      let errorDetail = `API error: ${response.status}`;
      try {
        const errorData = await response.json();
        errorDetail = errorData.message || errorData.error || errorDetail;
      } catch {
        // Jika response bukan JSON, gunakan status text
        errorDetail = response.statusText || errorDetail;
      }
      
      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        window.location.href = '/';
      }
      throw new Error(errorDetail);
    }

    return response.json();
  } catch (error: any) {
    console.error('API Request failed:', error);
    
    // Handle network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error: Please check your internet connection');
    }
    
    throw error;
  }
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
    return data.success ? data.user : null;
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
};

// Dashboard API
export const getDashboardStats = async (): Promise<DashboardStats> => {
  const data = await apiRequest('/dashboard/stats');
  return data.data;
};

// Assets API
export const getAssets = async (filters: { category?: string; location?: string; status?: string } = {}): Promise<Asset[]> => {
  const queryParams = new URLSearchParams();
  if (filters.category) queryParams.append('category', filters.category);
  if (filters.location) queryParams.append('location', filters.location);
  if (filters.status) queryParams.append('status', filters.status);

  const queryString = queryParams.toString();
  const endpoint = queryString ? `/assets?${queryString}` : '/assets';
  
  const data = await apiRequest(endpoint);
  return data.data;
};

// ==================== DEPRECIATION API ====================

// Get depresiasi data untuk asset
export const getAssetDepreciation = async (assetId: string): Promise<any> => {
  try {
    const data = await apiRequest(`/assets/${assetId}/depreciation`);
    return data.data;
  } catch (error: any) {
    console.error('Get asset depreciation error:', error);
    
    // Return null jika error 404
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
    return data.data;
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
      data: data.data
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
      data: data.data,
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
      data: data.data,
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
      data: data.data,
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
      data: data.data,
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
      data: data.data,
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
      data: data.data
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
      data: data.data
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
      data: data.data
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

export const getAssetById = async (id: string): Promise<Asset | undefined> => {
  try {
    const data = await apiRequest(`/assets/${id}`);
    return data.data;
  } catch (error) {
    console.error('Get asset by ID error:', error);
    return undefined;
  }
};

export const addAsset = async (assetData: Omit<Asset, 'id'>): Promise<Asset> => {
  const data = await apiRequest('/assets', {
    method: 'POST',
    body: JSON.stringify(assetData),
  });
  return data.data;
};

export const updateAsset = async (id: string, assetData: Partial<Asset>): Promise<Asset> => {
  const data = await apiRequest(`/assets/${id}`, {
    method: 'PUT',
    body: JSON.stringify(assetData),
  });
  return data.data;
};

export const deleteAsset = async (id: string): Promise<boolean> => {
  try {
    await apiRequest(`/assets/${id}`, { method: 'DELETE' });
    return true;
  } catch (error) {
    console.error('Delete asset error:', error);
    return false;
  }
};

// Asset Movements API
export const getAssetHistory = async (assetId: string): Promise<AssetMovement[]> => {
  const data = await apiRequest(`/assets/${assetId}/movements`);
  return data.data;
};

export const getAllMovements = async (): Promise<AssetMovement[]> => {
  const data = await apiRequest('/asset-movements');
  return data.data;
};

export const addAssetMovement = async (movementData: { assetId: string; location: string; movedBy: string }): Promise<AssetMovement> => {
  const data = await apiRequest('/asset-movements', {
    method: 'POST',
    body: JSON.stringify(movementData),
  });
  return data.data;
};

// Maintenance API
export const getMaintenanceHistory = async (assetId: string): Promise<Maintenance[]> => {
  const data = await apiRequest(`/assets/${assetId}/maintenances`);
  return data.data;
};

export const getAllMaintenance = async (): Promise<Maintenance[]> => {
  const data = await apiRequest('/maintenances');
  return data.data;
};

export const addMaintenance = async (maintData: Omit<Maintenance, 'id'>): Promise<Maintenance> => {
  const data = await apiRequest('/maintenances', {
    method: 'POST',
    body: JSON.stringify(maintData),
  });
  return data.data;
};

// Incident Reports API
export const getDamageReports = async (assetId: string): Promise<DamageReport[]> => {
  const data = await apiRequest(`/assets/${assetId}/incident-reports`);
  return data.data.filter((report: any) => report.type === 'Damage');
};

export const getAllDamageReports = async (): Promise<DamageReport[]> => {
  const data = await apiRequest('/incident-reports');
  return data.data.filter((report: any) => report.type === 'Damage');
};

export const addDamageReport = async (reportData: Omit<DamageReport, 'id'>): Promise<DamageReport> => {
  const data = await apiRequest('/incident-reports', {
    method: 'POST',
    body: JSON.stringify({ ...reportData, type: 'Damage' }),
  });
  return data.data;
};

export const getLossReports = async (assetId: string): Promise<LossReport[]> => {
  const data = await apiRequest(`/assets/${assetId}/incident-reports`);
  return data.data.filter((report: any) => report.type === 'Loss');
};

export const getAllLossReports = async (): Promise<LossReport[]> => {
  const data = await apiRequest('/incident-reports');
  return data.data.filter((report: any) => report.type === 'Loss');
};

export const addLossReport = async (reportData: Omit<LossReport, 'id'>): Promise<LossReport> => {
  const data = await apiRequest('/incident-reports', {
    method: 'POST',
    body: JSON.stringify({ ...reportData, type: 'Loss' }),
  });
  return data.data;
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
  return new Date(dateString).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
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