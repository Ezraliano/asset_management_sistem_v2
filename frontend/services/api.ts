import { Asset, AssetStatus, AssetMovement, Maintenance, MaintenanceStatus, User, DamageReport, LossReport } from '../types';

// Seed data for assets to make the app interactive from the start
const initialAssets: Asset[] = [];


let assets: Asset[] = [...initialAssets];
// Use a counter for new IDs to prevent duplicates after deletion
let nextAssetIdCounter = assets.length + 1;

let movements: AssetMovement[] = [];

let maintenance: Maintenance[] = [];

let damageReports: DamageReport[] = [];

let lossReports: LossReport[] = [];

let users: User[] = [
    { id: 'USR-001', name: 'admin', role: 'Admin', password: '123' },
    { id: 'USR-002', name: 'staff', role: 'Staff', password: '123' },
    { id: 'USR-003', name: 'audit', role: 'Audit', password: '123' },
];

const simulateDelay = <T,>(data: T): Promise<T> => new Promise(res => setTimeout(() => res(data), 500));

export const loginUser = async (username: string, password_input: string): Promise<User | null> => {
    const user = users.find(u => u.name.toLowerCase() === username.toLowerCase());
    if (user && user.password === password_input) {
        // In a real app, you would not send the password back
        const { password, ...userWithoutPassword } = user;
        return simulateDelay(userWithoutPassword);
    }
    return simulateDelay(null);
};


export const getAssets = async (filters: { category?: string, location?: string, status?: string } = {}): Promise<Asset[]> => {
  let filteredAssets = assets;
  if (filters.category) {
    filteredAssets = filteredAssets.filter(a => a.category === filters.category);
  }
  if (filters.location) {
    filteredAssets = filteredAssets.filter(a => a.location === filters.location);
  }
  if (filters.status) {
    filteredAssets = filteredAssets.filter(a => a.status === filters.status);
  }
  return simulateDelay(filteredAssets);
};

export const getAssetById = async (id: string): Promise<Asset | undefined> => {
  return simulateDelay(assets.find(a => a.id === id));
};

export const addAsset = async (assetData: Omit<Asset, 'id' | 'qrCodeUrl'>): Promise<Asset> => {
  const newId = `ASSET-${String(nextAssetIdCounter++).padStart(3, '0')}`;
  const newAsset: Asset = {
    ...assetData,
    id: newId,
    qrCodeUrl: newId,
  };
  assets.push(newAsset);
  return simulateDelay(newAsset);
};

export const addBulkAssets = async (assetsData: Omit<Asset, 'id' | 'qrCodeUrl'>[]): Promise<Asset[]> => {
    const newAssets: Asset[] = [];
    assetsData.forEach(assetData => {
        const newId = `ASSET-${String(nextAssetIdCounter++).padStart(3, '0')}`;
        const newAsset: Asset = {
            ...assetData,
            id: newId,
            qrCodeUrl: newId,
        };
        assets.push(newAsset);
        newAssets.push(newAsset);
    });
    return simulateDelay(newAssets);
};

export const updateAsset = async (id: string, assetData: Partial<Asset>): Promise<Asset | undefined> => {
  const index = assets.findIndex(a => a.id === id);
  if (index !== -1) {
    assets[index] = { ...assets[index], ...assetData };
    return simulateDelay(assets[index]);
  }
  return simulateDelay(undefined);
};

export const deleteAsset = async (id: string): Promise<boolean> => {
  const index = assets.findIndex(a => a.id === id);
  if (index !== -1) {
    assets.splice(index, 1);
    return simulateDelay(true);
  }
  return simulateDelay(false);
};

export const getAssetHistory = async (assetId: string): Promise<AssetMovement[]> => {
  return simulateDelay(movements.filter(m => m.assetId === assetId).sort((a, b) => new Date(b.movedAt).getTime() - new Date(a.movedAt).getTime()));
};

export const getAllMovements = async (): Promise<AssetMovement[]> => {
  return simulateDelay(movements.sort((a, b) => new Date(b.movedAt).getTime() - new Date(a.movedAt).getTime()));
};


export const addAssetMovement = async (data: { assetId: string; location: string; movedBy: string }): Promise<Asset> => {
    const { assetId, location, movedBy } = data;
    
    const assetIndex = assets.findIndex(a => a.id === assetId);
    if (assetIndex === -1) {
        throw new Error("Asset not found");
    }

    assets[assetIndex].location = location;

    const newMovement: AssetMovement = {
        id: `MOV-${String(movements.length + 1).padStart(3, '0')}`,
        assetId: assetId,
        location: location,
        movedAt: new Date().toISOString(),
        movedBy: movedBy,
    };
    movements.push(newMovement);

    return simulateDelay(assets[assetIndex]);
};

export const getMaintenanceHistory = async (assetId: string): Promise<Maintenance[]> => {
  return simulateDelay(maintenance.filter(m => m.assetId === assetId));
};

export const getAllMaintenance = async (): Promise<Maintenance[]> => {
    return simulateDelay(maintenance);
};


export const addMaintenance = async (maintData: Omit<Maintenance, 'id'>): Promise<Maintenance> => {
    const newMaint = { ...maintData, id: `MNT-${String(maintenance.length + 1).padStart(3, '0')}` };
    maintenance.push(newMaint);
    return simulateDelay(newMaint);
};

export const getDamageReports = async (assetId: string): Promise<DamageReport[]> => {
    return simulateDelay(damageReports.filter(d => d.assetId === assetId));
};

export const getAllDamageReports = async (): Promise<DamageReport[]> => {
    return simulateDelay(damageReports);
};

export const addDamageReport = async (reportData: Omit<DamageReport, 'id' | 'status'>): Promise<DamageReport> => {
    const newReport: DamageReport = {
        ...reportData,
        id: `DMG-${String(damageReports.length + 1).padStart(3, '0')}`,
        status: 'Reported',
    };
    damageReports.push(newReport);
    return simulateDelay(newReport);
};

export const getLossReports = async (assetId: string): Promise<LossReport[]> => {
    return simulateDelay(lossReports.filter(l => l.assetId === assetId));
};

export const getAllLossReports = async (): Promise<LossReport[]> => {
    return simulateDelay(lossReports);
};

export const addLossReport = async (reportData: Omit<LossReport, 'id' | 'status'>): Promise<LossReport> => {
    const newReport: LossReport = {
        ...reportData,
        id: `LSS-${String(lossReports.length + 1).padStart(3, '0')}`,
        status: 'Reported',
    };
    lossReports.push(newReport);
    return simulateDelay(newReport);
};


export const getUsers = async (): Promise<User[]> => {
    // In a real app, you would not send the password back
    const usersWithoutPasswords = users.map(u => {
        const { password, ...user } = u;
        return user;
    });
    return simulateDelay(usersWithoutPasswords);
};

export const getDashboardStats = async () => {
    const totalAssets = assets.length;
    const totalAssetValue = assets.reduce((sum, asset) => sum + asset.value, 0);
    const inRepair = assets.filter(a => a.status === AssetStatus.InRepair).length;
    const disposed = assets.filter(a => a.status === AssetStatus.Disposed).length;
    
    const byCategory = assets.reduce((acc, asset) => {
        acc[asset.category] = (acc[asset.category] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const byLocation = assets.reduce((acc, asset) => {
        acc[asset.location] = (acc[asset.location] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return simulateDelay({
        totalAssets,
        totalAssetValue,
        inRepair,
        disposed,
        byCategory: Object.entries(byCategory).map(([name, value]) => ({ name, value })),
        byLocation: Object.entries(byLocation).map(([name, value]) => ({ name, value }))
    });
};