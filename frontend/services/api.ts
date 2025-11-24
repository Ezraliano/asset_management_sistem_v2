// api.ts - PERBAIKAN RESPONSE HANDLING
import {SSOLoginResponse, Asset, AssetMovement, Maintenance, User, DamageReport, LossReport, DashboardStats, AssetLoan, AssetLoanStatus, Unit, AssetSale, IncidentReport, AssetRequest, InventoryAudit, Guarantee, GuaranteeFormData, GuaranteeStats, PaginatedResponse } from '../types';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

// Token timeout checker interval
let tokenTimeoutInterval: NodeJS.Timeout | null = null;

// Custom events for session management
export const SESSION_EVENTS = {
  EXPIRING_WARNING: 'sessionExpiringWarning',
  EXPIRED: 'sessionExpired',
  EXTEND: 'sessionExtended',
};

// ✅ PERBAIKAN: Enhanced token checker
export const startTokenTimeoutChecker = (): void => {
  // Clear any existing interval
  if (tokenTimeoutInterval) {
    clearInterval(tokenTimeoutInterval);
  }

  // Check token every 30 seconds
  tokenTimeoutInterval = setInterval(async () => {
    const expirationTime = localStorage.getItem('token_expiration');
    const token = localStorage.getItem('auth_token');
    const ssoSessionId = localStorage.getItem('sso_session_id');

    if (!expirationTime || !token) {
      handleTokenExpiration();
      return;
    }

    const expirationMs = parseInt(expirationTime, 10);
    const currentTime = Date.now();
    const timeRemaining = expirationMs - currentTime;

    // CRITICAL: Token expired atau akan expired dalam 10 detik
    if (timeRemaining <= 10 * 1000) {
      console.warn('Token has expired or will expire very soon');
      
      // Untuk SSO user, bisa tambahkan validasi SSO session di sini
      if (ssoSessionId) {
        // Optional: Validasi SSO session dengan backend
        const ssoValid = await validateSSOSession();
        if (!ssoValid) {
          console.warn('SSO session invalid, logging out');
          handleTokenExpiration();
          return;
        }
      }
      
      // Verify token dengan backend
      await verifyTokenValidity();
    }
    // WARNING: Token akan expired dalam 5 menit
    else if (timeRemaining <= 5 * 60 * 1000) {
      console.warn('Token will expire soon in', Math.floor(timeRemaining / 1000), 'seconds');
      
      // Emit custom event untuk UI components
      window.dispatchEvent(new CustomEvent(SESSION_EVENTS.EXPIRING_WARNING, {
        detail: { timeRemaining }
      }));
    }
  }, 30000); // Check every 30 seconds
};

// Function to stop the timeout checker
export const stopTokenTimeoutChecker = (): void => {
  if (tokenTimeoutInterval) {
    clearInterval(tokenTimeoutInterval);
    tokenTimeoutInterval = null;
  }
};

// Function to verify token validity with backend
export const verifyTokenValidity = async (): Promise<boolean> => {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) return false;

    const response = await fetch(`${API_BASE_URL}/verify-token`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn('Token verification failed with status:', response.status);
      if (response.status === 401) {
        handleTokenExpiration();
      }
      return false;
    }

    const data = await response.json();
    console.log('Token is still valid');
    return data.valid === true || data.success === true;
  } catch (error) {
    console.error('Token verification error:', error);
    // On network error, assume token might still be valid
    return true;
  }
};

// Function to handle token expiration
export const handleTokenExpiration = (): void => {
  stopTokenTimeoutChecker();
  
  const ssoSessionId = localStorage.getItem('sso_session_id');
  
  // Clear semua storage items
  localStorage.removeItem('auth_token');
  localStorage.removeItem('token_expiration');
  localStorage.removeItem('sso_session_id');
  localStorage.removeItem('user');

  // Emit session expired event
  window.dispatchEvent(new CustomEvent(SESSION_EVENTS.EXPIRED));

  // Redirect ke login page
  setTimeout(() => {
    window.location.href = '/';
  }, 5000);
};

// Function to extend session (refresh token expiration time)
export const extendSession = async (): Promise<boolean> => {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) return false;

    // Call verify-token endpoint to refresh session
    const response = await fetch(`${API_BASE_URL}/verify-token`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return false;
    }

    // Reset token expiration time to 1 hour from now
    const tokenTimeout = 60 * 60; // 60 minutes
    const expirationTime = Date.now() + (tokenTimeout * 1000);
    localStorage.setItem('token_expiration', expirationTime.toString());

    console.log('Session extended for 1 hour');

    // Emit session extended event
    window.dispatchEvent(new CustomEvent(SESSION_EVENTS.EXTEND));

    // Restart the timeout checker
    startTokenTimeoutChecker();

    return true;
  } catch (error) {
    console.error('Failed to extend session:', error);
    return false;
  }
};

// Function to get remaining token time in seconds
export const getTokenRemainingTime = (): number => {
  const expirationTime = localStorage.getItem('token_expiration');
  if (!expirationTime) return 0;

  const expirationMs = parseInt(expirationTime, 10);
  const currentTime = Date.now();
  const timeRemaining = expirationMs - currentTime;

  return Math.max(0, Math.floor(timeRemaining / 1000));
};

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

      // Set token timeout (1 hour = 3600 seconds)
      const tokenTimeout = data.token_timeout || 3600;
      const expirationTime = Date.now() + (tokenTimeout * 1000);
      localStorage.setItem('token_expiration', expirationTime.toString());

      // Start timeout checker
      startTokenTimeoutChecker();

      return data.user;
    }
    return null;
  } catch (error) {
    console.error('Login error:', error);
    return null;
  }
};

// export const logoutUser = async (): Promise<void> => {
//   try {
//     stopTokenTimeoutChecker();
//     await apiRequest('/logout', { method: 'POST' });
//   } catch (error) {
//     console.error('Logout error:', error);
//   } finally {
//     localStorage.removeItem('auth_token');
//     localStorage.removeItem('token_expiration');
//   }
// };
export const logoutUser = async (): Promise<void> => {
  try {
    stopTokenTimeoutChecker();
    await apiRequest('/logout', { method: 'POST' });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('token_expiration');
  }
};
// ==================== SSO AUTH API ====================

/**
 * Login via SSO backend (menggantikan login lokal)
 */
export const loginViaSSO = async (credentials: { email: string; password: string }): Promise<SSOLoginResponse> => {
  try {
    const data = await apiRequest('/auth/sso/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (data.success && data.token) {
      // Save token dan user data
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Set token timeout
      const tokenTimeout = data.token_timeout || 3600;
      const expirationTime = Date.now() + (tokenTimeout * 1000);
      localStorage.setItem('token_expiration', expirationTime.toString());

      // Save SSO session ID jika ada
      if (data.sso_session_id) {
        localStorage.setItem('sso_session_id', data.sso_session_id);
      }

      // Start timeout checker
      startTokenTimeoutChecker();

      return {
        success: true,
        user: data.user,
        token: data.token,
        sso_session_id: data.sso_session_id
      };
    }

    return {
      success: false,
      message: data.message || 'Login failed'
    };
  } catch (error: any) {
    console.error('SSO login error:', error);
    return {
      success: false,
      message: error.message || 'Login failed'
    };
  }
};

export const validateSSOSession = async (): Promise<boolean> => {
  try {
    const token = localStorage.getItem('auth_token');
    const ssoSessionId = localStorage.getItem('sso_session_id');
    
    if (!token || !ssoSessionId) return false;

    const response = await fetch(`${API_BASE_URL}/auth/sso/validate-session`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sso_session_id: ssoSessionId }),
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.valid === true;
  } catch (error) {
    console.error('SSO session validation error:', error);
    return false;
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
export const getAssets = async (filters: { category?: string; unit_id?: string; status?: string } = {}): Promise<Asset[]> => {
  const queryParams = new URLSearchParams();
  if (filters.category) queryParams.append('category', filters.category);
  if (filters.unit_id) queryParams.append('unit_id', filters.unit_id);
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

// ==================== ASSET MOVEMENT API (WITH VALIDATION) ====================

export const getAllMovements = async (): Promise<AssetMovement[]> => {
  try {
    const data = await apiRequest('/asset-movements');
    const movements = handleApiResponse<AssetMovement[]>(data);
    return Array.isArray(movements) ? movements : [];
  } catch (error) {
    console.error('Get all movements error:', error);
    return [];
  }
};

export const requestAssetTransfer = async (transferData: {
  asset_id: number;
  to_unit_id: number;
  notes?: string;
}): Promise<any> => {
  const data = await apiRequest('/asset-movements/request-transfer', {
    method: 'POST',
    body: JSON.stringify(transferData),
  });
  return handleApiResponse<any>(data);
};

export const getPendingMovements = async (): Promise<AssetMovement[]> => {
  try {
    const data = await apiRequest('/asset-movements-pending');
    const movements = handleApiResponse<AssetMovement[]>(data);
    return Array.isArray(movements) ? movements : [];
  } catch (error) {
    console.error('Get pending movements error:', error);
    return [];
  }
};

export const approveAssetTransfer = async (movementId: number): Promise<any> => {
  const data = await apiRequest(`/asset-movements/${movementId}/approve`, {
    method: 'POST',
  });
  return handleApiResponse<any>(data);
};

export const rejectAssetTransfer = async (movementId: number, rejectionData: {
  rejection_reason: string;
}): Promise<any> => {
  const data = await apiRequest(`/asset-movements/${movementId}/reject`, {
    method: 'POST',
    body: JSON.stringify(rejectionData),
  });
  return handleApiResponse<any>(data);
};

export const cancelAssetMovement = async (movementId: number): Promise<boolean> => {
  try {
    const data = await apiRequest(`/asset-movements/${movementId}`, {
      method: 'DELETE',
    });
    return data.success || true;
  } catch (error) {
    console.error('Cancel asset movement error:', error);
    return false;
  }
};

export const getAssetMovementById = async (movementId: number): Promise<any | null> => {
  try {
    const data = await apiRequest(`/asset-movements/${movementId}`);
    return handleApiResponse<any>(data);
  } catch (error) {
    console.error('Get asset movement by ID error:', error);
    return null;
  }
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
  try {
    const data = await apiRequest('/users');
    return handleApiResponse<User[]>(data);
  } catch (error) {
    console.error('Get users error:', error);
    return [];
  }
};

export const getUserById = async (id: number): Promise<User | null> => {
  try {
    const data = await apiRequest(`/users/${id}`);
    return handleApiResponse<User>(data);
  } catch (error) {
    console.error('Get user by id error:', error);
    return null;
  }
};

export const createUser = async (userData: {
  name: string;
  username: string;
  email: string;
  password: string;
  role: 'unit' | 'user' | 'auditor';
  unit_id?: number | null;
}): Promise<User | null> => {
  try {
    const data = await apiRequest('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    return handleApiResponse<User>(data);
  } catch (error: any) {
    console.error('Create user error:', error);
    throw new Error(error.message || 'Failed to create user');
  }
};

export const updateUser = async (id: number, userData: {
  name?: string;
  username?: string;
  email?: string;
  password?: string;
  role?: 'unit' | 'user' | 'auditor';
  unit_id?: number | null;
}): Promise<User | null> => {
  try {
    const data = await apiRequest(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
    return handleApiResponse<User>(data);
  } catch (error: any) {
    console.error('Update user error:', error);
    throw new Error(error.message || 'Failed to update user');
  }
};

export const deleteUser = async (id: number): Promise<boolean> => {
  try {
    const data = await apiRequest(`/users/${id}`, {
      method: 'DELETE',
    });
    return data.success === true;
  } catch (error: any) {
    console.error('Delete user error:', error);
    throw new Error(error.message || 'Failed to delete user');
  }
};

export const getAvailableUnits = async (): Promise<Unit[]> => {
  try {
    const data = await apiRequest('/available-units');
    return handleApiResponse<Unit[]>(data);
  } catch (error) {
    console.error('Get available units error:', error);
    return [];
  }
};

// Bulk Assets
export const addBulkAssets = async (assetsData: Omit<Asset, 'id' | 'asset_tag'>[]): Promise<Asset[]> => {
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

export const getAuditReport = async (filters?: ReportFilters): Promise<any> => {
  const queryParams = new URLSearchParams();
  if (filters?.unit_id && filters.unit_id !== 'all') queryParams.append('unit_id', filters.unit_id.toString());
  if (filters?.status) queryParams.append('status', filters.status);
  if (filters?.start_date) queryParams.append('start_date', filters.start_date);
  if (filters?.end_date) queryParams.append('end_date', filters.end_date);

  const queryString = queryParams.toString();
  const endpoint = queryString ? `/reports/audit?${queryString}` : '/reports/audit';

  try {
    // Return the full response object
    return await apiRequest(endpoint);
  } catch (error: any) {
    console.error('Error in getAuditReport:', error);
    // Return a consistent error object
    return { success: false, message: error.message, data: [], summary: {} };
  }
};


// ==================== INVENTORY AUDIT API ====================

export const getInventoryAudits = async (params?: { status?: string; unit_id?: number }): Promise<InventoryAudit[]> => {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.unit_id) queryParams.append('unit_id', params.unit_id.toString());

  const queryString = queryParams.toString();
  const endpoint = queryString ? `/inventory-audits?${queryString}` : '/inventory-audits';

  try {
    const response = await apiRequest(endpoint);
    const handledResponse = handleApiResponse<any>(response);

    if (Array.isArray(handledResponse)) {
      return handledResponse;
    }

    console.warn('Inventory audits response is not in a recognized format:', handledResponse);
    return [];
  } catch (error: any) {
    console.error('Error in getInventoryAudits:', error);
    return [];
  }
};

export const startInventoryAudit = async (auditData: {
  unit_id: number;
  scan_mode: 'camera' | 'manual';
  notes?: string;
}): Promise<InventoryAudit> => {
  const data = await apiRequest('/inventory-audits', {
    method: 'POST',
    body: JSON.stringify(auditData),
  });
  return handleApiResponse<any>(data).audit;
};

export const getInventoryAuditById = async (id: number): Promise<InventoryAudit | null> => {
  try {
    const data = await apiRequest(`/inventory-audits/${id}`);
    return handleApiResponse<InventoryAudit>(data);
  } catch (error) {
    console.error('Get inventory audit by ID error:', error);
    return null;
  }
};

export const scanAssetInAudit = async (auditId: number, assetId: string): Promise<any> => {
  try {
    const data = await apiRequest(`/inventory-audits/${auditId}/scan`, {
      method: 'POST',
      body: JSON.stringify({ asset_id: assetId }),
    });
    return data;
  } catch (error: any) {
    console.error('Scan asset in audit error:', error);
    throw error;
  }
};

export const completeInventoryAudit = async (auditId: number, notes?: string): Promise<InventoryAudit> => {
  const data = await apiRequest(`/inventory-audits/${auditId}/complete`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  });
  return handleApiResponse<any>(data).audit;
};

export const cancelInventoryAudit = async (auditId: number): Promise<boolean> => {
  try {
    await apiRequest(`/inventory-audits/${auditId}/cancel`, {
      method: 'POST',
    });
    return true;
  } catch (error) {
    console.error('Cancel inventory audit error:', error);
    return false;
  }
};

export const deleteInventoryAudit = async (auditId: number): Promise<boolean> => {
  try {
    await apiRequest(`/inventory-audits/${auditId}`, {
      method: 'DELETE',
    });
    return true;
  } catch (error) {
    console.error('Delete inventory audit error:', error);
    throw error;
  }
};

// ==================== GUARANTEE API ====================

/**
 * Get all guarantees with optional filtering and pagination
 */
export const getGuarantees = async (params?: {
  guarantee_type?: string;
  spk_number?: string;
  cif_number?: string;
  start_date?: string;
  end_date?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}): Promise<{ guarantees: Guarantee[]; pagination: any }> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.guarantee_type) queryParams.append('guarantee_type', params.guarantee_type);
    if (params?.spk_number) queryParams.append('spk_number', params.spk_number);
    if (params?.cif_number) queryParams.append('cif_number', params.cif_number);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.sort_by) queryParams.append('sort_by', params.sort_by);
    if (params?.sort_order) queryParams.append('sort_order', params.sort_order);
    if (params?.per_page) queryParams.append('per_page', params.per_page.toString());
    if (params?.page) queryParams.append('page', params.page.toString());

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/guarantees?${queryString}` : '/guarantees';

    const response = await apiRequest(endpoint);
    const handled = handleApiResponse<any>(response);

    // Backend returns { success, data: [...], pagination: {...} }
    // Handle both array and pagination structure
    const guaranteesData = Array.isArray(handled) ? handled : (Array.isArray(handled.data) ? handled.data : []);

    return {
      guarantees: guaranteesData,
      pagination: handled.pagination || {}
    };
  } catch (error: any) {
    console.error('Error fetching guarantees:', error);
    return { guarantees: [], pagination: {} };
  }
};

/**
 * Get single guarantee by ID
 */
export const getGuaranteeById = async (id: number): Promise<Guarantee | null> => {
  try {
    const response = await apiRequest(`/guarantees/${id}`);
    return handleApiResponse<Guarantee>(response);
  } catch (error) {
    console.error('Error fetching guarantee by ID:', error);
    return null;
  }
};

/**
 * Create new guarantee
 */
export const addGuarantee = async (data: GuaranteeFormData): Promise<Guarantee | null> => {
  try {
    const response = await apiRequest('/guarantees', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const result = handleApiResponse<any>(response);
    return result.data || result;
  } catch (error: any) {
    console.error('Error adding guarantee:', error);
    throw error;
  }
};

/**
 * Update existing guarantee
 */
export const updateGuarantee = async (id: number, data: Partial<GuaranteeFormData>): Promise<Guarantee | null> => {
  try {
    const response = await apiRequest(`/guarantees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    const result = handleApiResponse<any>(response);
    return result.data || result;
  } catch (error: any) {
    console.error('Error updating guarantee:', error);
    throw error;
  }
};

/**
 * Delete guarantee
 */
export const deleteGuarantee = async (id: number): Promise<boolean> => {
  try {
    await apiRequest(`/guarantees/${id}`, {
      method: 'DELETE',
    });
    return true;
  } catch (error) {
    console.error('Error deleting guarantee:', error);
    throw error;
  }
};

/**
 * Get guarantees by type (BPKB, SHM, SHGB)
 */
export const getGuaranteesByType = async (type: 'BPKB' | 'SHM' | 'SHGB'): Promise<Guarantee[]> => {
  try {
    const response = await apiRequest(`/guarantees/by-type/${type}`);
    const result = handleApiResponse<any>(response);
    return result.data || [];
  } catch (error) {
    console.error('Error fetching guarantees by type:', error);
    return [];
  }
};

/**
 * Get guarantees by SPK number
 */
export const getGuaranteesBySpk = async (spkNumber: string): Promise<Guarantee[]> => {
  try {
    const response = await apiRequest(`/guarantees/by-spk/${spkNumber}`);
    const result = handleApiResponse<any>(response);
    return result.data || [];
  } catch (error) {
    console.error('Error fetching guarantees by SPK:', error);
    return [];
  }
};

/**
 * Get guarantee statistics
 */
export const getGuaranteeStats = async (): Promise<GuaranteeStats | null> => {
  try {
    const response = await apiRequest('/guarantees/stats');
    const result = handleApiResponse<any>(response);
    return result.data || null;
  } catch (error) {
    console.error('Error fetching guarantee stats:', error);
    return null;
  }
};

// ==================== GUARANTEE LOAN API ====================

/**
 * Create new guarantee loan
 */
export const createGuaranteeLoan = async (loanData: {
  guarantee_id: number;
  spk_number: string;
  cif_number: string;
  guarantee_type: string;
  file_location: string;
  borrower_name: string;
  borrower_contact: string;
  reason: string;
  loan_date: string;
  expected_return_date?: string;
}): Promise<any> => {
  try {
    const response = await apiRequest('/guarantee-loans', {
      method: 'POST',
      body: JSON.stringify(loanData),
    });
    return handleApiResponse<any>(response);
  } catch (error: any) {
    console.error('Error creating guarantee loan:', error);
    throw error;
  }
};

/**
 * Get all guarantee loans with optional filtering
 */
export const getGuaranteeLoans = async (params?: {
  status?: string;
  guarantee_id?: number;
  spk_number?: string;
  start_date?: string;
  end_date?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  per_page?: number;
  for_report?: string;
}): Promise<{ loans: any[]; pagination: any }> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.guarantee_id) queryParams.append('guarantee_id', params.guarantee_id.toString());
    if (params?.spk_number) queryParams.append('spk_number', params.spk_number);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.sort_by) queryParams.append('sort_by', params.sort_by);
    if (params?.sort_order) queryParams.append('sort_order', params.sort_order);
    if (params?.per_page) queryParams.append('per_page', params.per_page.toString());
    if (params?.for_report) queryParams.append('for_report', params.for_report);

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/guarantee-loans?${queryString}` : '/guarantee-loans';

    const response = await apiRequest(endpoint);
    const handled = handleApiResponse<any>(response);

    const loansData = Array.isArray(handled) ? handled : (Array.isArray(handled.data) ? handled.data : []);

    return {
      loans: loansData,
      pagination: handled.pagination || {}
    };
  } catch (error: any) {
    console.error('Error fetching guarantee loans:', error);
    return { loans: [], pagination: {} };
  }
};

/**
 * Get guarantee loan by ID
 */
export const getGuaranteeLoanById = async (id: number): Promise<any | null> => {
  try {
    const response = await apiRequest(`/guarantee-loans/${id}`);
    return handleApiResponse<any>(response);
  } catch (error) {
    console.error('Error fetching guarantee loan by ID:', error);
    return null;
  }
};

/**
 * Update guarantee loan
 */
export const updateGuaranteeLoan = async (id: number, loanData: any): Promise<any | null> => {
  try {
    const response = await apiRequest(`/guarantee-loans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(loanData),
    });
    return handleApiResponse<any>(response);
  } catch (error: any) {
    console.error('Error updating guarantee loan:', error);
    throw error;
  }
};

/**
 * Return guarantee loan
 */
export const returnGuaranteeLoan = async (id: number, returnData: {
  actual_return_date: string;
}): Promise<any | null> => {
  try {
    const response = await apiRequest(`/guarantee-loans/${id}/return`, {
      method: 'PUT',
      body: JSON.stringify(returnData),
    });
    return handleApiResponse<any>(response);
  } catch (error: any) {
    console.error('Error returning guarantee loan:', error);
    throw error;
  }
};

/**
 * Delete guarantee loan
 */
export const deleteGuaranteeLoan = async (id: number): Promise<boolean> => {
  try {
    await apiRequest(`/guarantee-loans/${id}`, {
      method: 'DELETE',
    });
    return true;
  } catch (error) {
    console.error('Error deleting guarantee loan:', error);
    throw error;
  }
};

/**
 * Get guarantee loans by status
 */
export const getGuaranteeLoansByStatus = async (status: 'active' | 'returned'): Promise<any[]> => {
  try {
    const response = await apiRequest(`/guarantee-loans/by-status/${status}`);
    const result = handleApiResponse<any>(response);
    return result.data || [];
  } catch (error) {
    console.error('Error fetching guarantee loans by status:', error);
    return [];
  }
};

/**
 * Get guarantee loans by guarantee ID
 */
export const getGuaranteeLoansForGuarantee = async (guaranteeId: number): Promise<any[]> => {
  try {
    console.log('API Call: GET /guarantee-loans/by-guarantee/' + guaranteeId);
    const response = await apiRequest(`/guarantee-loans/by-guarantee/${guaranteeId}`);
    console.log('API Response for loans:', response);

    // Handle response with {success, data} structure
    if (response && typeof response === 'object') {
      if ('success' in response && response.success) {
        // Return data array or empty array if data is empty
        return Array.isArray(response.data) ? response.data : [];
      } else if (Array.isArray(response)) {
        // If response is directly an array
        return response;
      } else if ('data' in response && Array.isArray(response.data)) {
        // If response has data property that is an array
        return response.data;
      }
    }

    console.warn('Unexpected loan response format:', response);
    return [];
  } catch (error) {
    console.error('Error fetching guarantee loans for guarantee:', error);
    return [];
  }
};

/**
 * Get guarantee loan statistics
 */
export const getGuaranteeLoanStats = async (): Promise<any | null> => {
  try {
    const response = await apiRequest('/guarantee-loans/stats');
    const result = handleApiResponse<any>(response);
    return result.data || null;
  } catch (error) {
    console.error('Error fetching guarantee loan stats:', error);
    return null;
  }
};

/**
 * Get guarantee settlements by guarantee ID
 */
export const getGuaranteeSettlementsForGuarantee = async (guaranteeId: number): Promise<any[]> => {
  try {
    console.log('API Call: GET /guarantee-settlements/by-guarantee/' + guaranteeId);
    const response = await apiRequest(`/guarantee-settlements/by-guarantee/${guaranteeId}`);
    console.log('API Response for settlements:', response);

    // Handle response with {success, data} structure
    if (response && typeof response === 'object') {
      if ('success' in response && response.success) {
        // Return data array or empty array if data is empty
        return Array.isArray(response.data) ? response.data : [];
      } else if (Array.isArray(response)) {
        // If response is directly an array
        return response;
      } else if ('data' in response && Array.isArray(response.data)) {
        // If response has data property that is an array
        return response.data;
      }
    }

    console.warn('Unexpected settlement response format:', response);
    return [];
  } catch (error) {
    console.error('Error fetching guarantee settlements for guarantee:', error);
    return [];
  }
};

/**
 * Get guarantee settlement by ID
 */
export const getGuaranteeSettlementById = async (settlementId: number): Promise<any | null> => {
  try {
    const response = await apiRequest(`/guarantee-settlements/${settlementId}`);
    const result = handleApiResponse<any>(response);
    return result.data || null;
  } catch (error) {
    console.error('Error fetching guarantee settlement:', error);
    return null;
  }
};

/**
 * Create guarantee settlement
 */
export const createGuaranteeSettlement = async (data: any): Promise<any | null> => {
  try {
    const response = await apiRequest('/guarantee-settlements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const result = handleApiResponse<any>(response);
    return result.data || null;
  } catch (error) {
    console.error('Error creating guarantee settlement:', error);
    throw error;
  }
};

/**
 * Create guarantee settlement with file upload
 */
export const createGuaranteeSettlementWithFile = async (data: FormData): Promise<any | null> => {
  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch('http://127.0.0.1:8000/api/guarantee-settlements', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: data,
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Gagal membuat settlement');
    }

    return result.data || null;
  } catch (error) {
    console.error('Error creating guarantee settlement with file:', error);
    throw error;
  }
};

/**
 * Update guarantee settlement
 */
export const updateGuaranteeSettlement = async (settlementId: number, data: any): Promise<any | null> => {
  try {
    const response = await apiRequest(`/guarantee-settlements/${settlementId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    const result = handleApiResponse<any>(response);
    return result.data || null;
  } catch (error) {
    console.error('Error updating guarantee settlement:', error);
    throw error;
  }
};

/**
 * Approve guarantee settlement
 */
export const approveGuaranteeSettlement = async (settlementId: number, data: any): Promise<any | null> => {
  try {
    const response = await apiRequest(`/guarantee-settlements/${settlementId}/approve`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    const result = handleApiResponse<any>(response);
    return result.data || null;
  } catch (error) {
    console.error('Error approving guarantee settlement:', error);
    throw error;
  }
};

/**
 * Approve guarantee settlement with file upload
 */
export const approveGuaranteeSettlementWithFile = async (settlementId: number, data: FormData): Promise<any | null> => {
  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`http://127.0.0.1:8000/api/guarantee-settlements/${settlementId}/approve`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: data,
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Gagal menyetujui settlement');
    }

    return result.data || null;
  } catch (error) {
    console.error('Error approving guarantee settlement with file:', error);
    throw error;
  }
};

/**
 * Reject guarantee settlement
 */
export const rejectGuaranteeSettlement = async (settlementId: number, data: any): Promise<any | null> => {
  try {
    const response = await apiRequest(`/guarantee-settlements/${settlementId}/reject`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    const result = handleApiResponse<any>(response);
    return result.data || null;
  } catch (error) {
    console.error('Error rejecting guarantee settlement:', error);
    throw error;
  }
};

/**
 * Delete guarantee settlement
 */
export const deleteGuaranteeSettlement = async (settlementId: number): Promise<boolean> => {
  try {
    const response = await apiRequest(`/guarantee-settlements/${settlementId}`, {
      method: 'DELETE',
    });
    const result = handleApiResponse<any>(response);
    return result.success || false;
  } catch (error) {
    console.error('Error deleting guarantee settlement:', error);
    throw error;
  }
};

/**
 * Get all guarantee settlements with optional filtering
 */
export const getGuaranteeSettlements = async (params?: {
  status?: string;
  guarantee_id?: number;
  spk_number?: string;
  start_date?: string;
  end_date?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  per_page?: number;
}): Promise<{ settlements: any[]; pagination: any }> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.guarantee_id) queryParams.append('guarantee_id', params.guarantee_id.toString());
    if (params?.spk_number) queryParams.append('spk_number', params.spk_number);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.sort_by) queryParams.append('sort_by', params.sort_by);
    if (params?.sort_order) queryParams.append('sort_order', params.sort_order);
    if (params?.per_page) queryParams.append('per_page', params.per_page.toString());

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/guarantee-settlements?${queryString}` : '/guarantee-settlements';

    const response = await apiRequest(endpoint);
    const handled = handleApiResponse<any>(response);

    const settlementsData = Array.isArray(handled) ? handled : (Array.isArray(handled.data) ? handled.data : []);

    return {
      settlements: settlementsData,
      pagination: handled.pagination || {}
    };
  } catch (error: any) {
    console.error('Error fetching guarantee settlements:', error);
    return { settlements: [], pagination: {} };
  }
};

/**
 * Get guarantee settlement statistics
 */
export const getGuaranteeSettlementStats = async (): Promise<any | null> => {
  try {
    const response = await apiRequest('/guarantee-settlements/stats');
    const result = handleApiResponse<any>(response);
    return result.data || null;
  } catch (error) {
    console.error('Error fetching guarantee settlement stats:', error);
    return null;
  }
};