import { Asset, AssetMovement, Maintenance, User, DamageReport, LossReport, DashboardStats } from '../types';

const API_BASE_URL = 'http://localhost:8000/api'; // Sesuaikan dengan URL Laravel Anda

// Helper function untuk API calls
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

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  
  if (!response.ok) {
    if (response.status === 401) {
      // Token expired, redirect to login
      localStorage.removeItem('auth_token');
      window.location.href = '/';
    }
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
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

export const getAssetById = async (id: string): Promise<Asset | undefined> => {
  try {
    const data = await apiRequest(`/assets/${id}`);
    return data.data;
  } catch (error) {
    console.error('Get asset error:', error);
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

export const addAssetMovement = async (data: { assetId: string; location: string; movedBy: string }): Promise<Asset> => {
  const response = await apiRequest('/asset-movements', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.data;
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
  // Note: Anda perlu membuat endpoint untuk users di Laravel jika belum ada
  // Untuk sementara, return empty array
  return [];
};

// Bulk Assets - Anda perlu membuat endpoint khusus di Laravel untuk ini
export const addBulkAssets = async (assetsData: Omit<Asset, 'id'>[]): Promise<Asset[]> => {
  // Implementasi bulk insert - buat endpoint khusus di Laravel
  const promises = assetsData.map(asset => addAsset(asset));
  return Promise.all(promises);
};