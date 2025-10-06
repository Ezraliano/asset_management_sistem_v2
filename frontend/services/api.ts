import { Asset, AssetMovement, Maintenance, User, DamageReport, LossReport, DashboardStats } from '../types';

const API_BASE_URL = 'http://localhost:8000/api';

// ✅ PERBAIKAN: Enhanced API request function dengan error handling yang lebih baik
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
      // ✅ PERBAIKAN: Coba parse error response untuk detail
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

// Auth API - TETAP SAMA struktur return type
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

// Dashboard API - TETAP SAMA
export const getDashboardStats = async (): Promise<DashboardStats> => {
  const data = await apiRequest('/dashboard/stats');
  return data.data;
};

// Assets API - TETAP SAMA
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

// ✅ PERBAIKAN: Tambah error handling khusus untuk depreciation
export const getAssetDepreciation = async (assetId: string): Promise<any> => {
  try {
    const data = await apiRequest(`/assets/${assetId}/depreciation`);
    return data.data;
  } catch (error: any) {
    console.error('Get asset depreciation error:', error);
    
    // Return null atau empty object jika error
    if (error.message.includes('404') || error.message.includes('not found')) {
      return null;
    }
    throw error; // Re-throw error lainnya
  }
};

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

// ✅ PERBAIKAN YANG PENTING: Generate Asset Depreciation dengan better error handling
export const generateAssetDepreciation = async (assetId: string): Promise<any> => {
  try {
    const data = await apiRequest(`/assets/${assetId}/generate-depreciation`, {
      method: 'POST',
    });
    
    // ✅ PERBAIKAN: Return full response agar frontend bisa cek success status
    return {
      success: data.success,
      message: data.message,
      data: data.data
    };
  } catch (error: any) {
    console.error('Generate asset depreciation error:', error);
    
    // ✅ PERBAIKAN: Handle specific depreciation errors
    let errorMessage = error.message || 'Failed to generate depreciation';
    
    if (error.message.includes('500')) {
      if (error.message.includes('unique') || error.message.includes('duplicate')) {
        errorMessage = 'Depreciation record already exists for this period';
      } else if (error.message.includes('useful life') || error.message.includes('maximum')) {
        errorMessage = 'Maximum depreciation period reached';
      }
    }
    
    // Return error object yang konsisten
    return {
      success: false,
      message: errorMessage,
      data: null,
      error: errorMessage
    };
  }
};

export const generateAllDepreciation = async (): Promise<any> => {
  try {
    const data = await apiRequest('/depreciation/generate-all', {
      method: 'POST',
    });
    
    // Return full response
    return {
      success: data.success,
      message: data.message,
      data: data.data
    };
  } catch (error: any) {
    console.error('Generate all depreciation error:', error);
    
    return {
      success: false,
      message: error.message || 'Failed to generate depreciation for all assets',
      data: null,
      error: error.message
    };
  }
};

// FUNCTION YANG DITAMBAHKAN: - TETAP SAMA
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

// Asset Movements API - TETAP SAMA
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

// Maintenance API - TETAP SAMA
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

// Incident Reports API - TETAP SAMA
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

// Users API - TETAP SAMA
export const getUsers = async (): Promise<User[]> => {
  return [];
};

// Bulk Assets - TETAP SAMA
export const addBulkAssets = async (assetsData: Omit<Asset, 'id'>[]): Promise<Asset[]> => {
  const promises = assetsData.map(asset => addAsset(asset));
  return Promise.all(promises);
};

// ✅ PERBAIKAN: Tambah utility function untuk check auth (OPTIONAL)
export const checkAuthStatus = (): boolean => {
  const token = localStorage.getItem('auth_token');
  return !!token;
};