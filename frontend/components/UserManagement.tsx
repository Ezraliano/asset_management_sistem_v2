import React, { useState, useEffect } from 'react';
import { createUser, updateUser, getAvailableUnits } from '../services/api';
import { User, Unit } from '../types';

interface UserManagementProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editUser?: User | null;
}

interface UserFormData {
  name: string;
  username: string;
  email: string;
  password: string;
  role: 'unit' | 'user' | 'auditor';
  unit_id: number | '';
}

const UserManagement: React.FC<UserManagementProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editUser = null,
}) => {
  const [units, setUnits] = useState<Unit[]>([]);
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    username: '',
    email: '',
    password: '',
    role: 'user',
    unit_id: '',
  });

  const isEditMode = !!editUser;

  useEffect(() => {
    if (isOpen) {
      fetchUnits();
      if (editUser) {
        // Populate form for editing
        setFormData({
          name: editUser.name,
          username: editUser.username,
          email: editUser.email,
          password: '',
          role: editUser.role as 'unit' | 'user' | 'auditor',
          unit_id: editUser.unit_id || '',
        });
      } else {
        // Reset form for adding new user
        resetForm();
      }
    }
  }, [isOpen, editUser]);

  const fetchUnits = async () => {
    try {
      const fetchedUnits = await getAvailableUnits();
      setUnits(fetchedUnits);
    } catch (err: any) {
      setError(err.message || 'Failed to load units');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      username: '',
      email: '',
      password: '',
      role: 'user',
      unit_id: '',
    });
    setError('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'unit_id' ? (value === '' ? '' : Number(value)) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name || !formData.username || !formData.email || !formData.role) {
      setError('Nama, username, email, dan role wajib diisi');
      return;
    }

    // Unit is required for unit and user, but not for auditor
    if (formData.role !== 'auditor' && formData.unit_id === '') {
      setError('Unit wajib diisi untuk unit dan user');
      return;
    }

    if (!isEditMode && !formData.password) {
      setError('Password wajib diisi untuk user baru');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditMode && editUser) {
        // Update user
        const updateData: any = {
          name: formData.name,
          username: formData.username,
          email: formData.email,
          role: getRoleForApi(formData.role),
          unit_id: formData.role === 'auditor' ? null : (formData.unit_id as number),
        };

        // Only include password if it's not empty
        if (formData.password) {
          updateData.password = formData.password;
        }

        await updateUser(editUser.id, updateData);
      } else {
        // Create user
        await createUser({
          name: formData.name,
          username: formData.username,
          email: formData.email,
          password: formData.password,
          role: getRoleForApi(formData.role),
          unit_id: formData.role === 'auditor' ? null : (formData.unit_id as number),
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const getRoleForApi = (role: string): 'unit' | 'user' | 'auditor' => {
    const roleMap: Record<string, 'unit' | 'user' | 'auditor'> = {
      'unit': 'unit',
      'user': 'user',
      'auditor': 'auditor',
    };
    return roleMap[role] || 'user';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {isEditMode ? 'Edit User' : 'Tambah User Baru'}
          </h2>

          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Lengkap <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Masukkan nama lengkap"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Masukkan username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Masukkan email"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password {isEditMode ? '(kosongkan jika tidak ingin mengubah)' : <span className="text-red-500">*</span>}
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder={isEditMode ? "Biarkan kosong jika tidak ingin mengubah" : "Masukkan password"}
                required={!isEditMode}
              />
              {!isEditMode && (
                <p className="mt-1 text-xs text-gray-500">Minimal 3 karakter</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              >
                <option value="user">User</option>
                <option value="unit">Admin Unit</option>
                <option value="auditor">Auditor</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {formData.role === 'user'
                  ? 'User: Dapat meminjam aset dari unit mereka'
                  : formData.role === 'unit'
                  ? 'Admin Unit: Dapat mengelola aset dan menyetujui peminjaman di unit mereka'
                  : 'Auditor: Dapat melakukan audit inventaris dan melihat laporan audit'}
              </p>
            </div>

            {formData.role !== 'auditor' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit <span className="text-red-500">*</span>
                </label>
                <select
                  name="unit_id"
                  value={formData.unit_id}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                >
                  <option value="">Pilih Unit</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
                disabled={isSubmitting}
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Menyimpan...' : isEditMode ? 'Perbarui' : 'Tambah'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
