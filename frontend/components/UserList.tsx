import React, { useState, useEffect } from 'react';
import { getUsers, deleteUser } from '../services/api';
import { User } from '../types';
import UserManagement from './UserManagement';

const UserList: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [error, setError] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const fetchedUsers = await getUsers();
            setUsers(fetchedUsers);
        } catch (err: any) {
            setError(err.message || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const openAddModal = () => {
        setEditingUser(null);
        setIsModalOpen(true);
    };

    const openEditModal = (user: User) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
    };

    const handleSuccess = async () => {
        await fetchUsers();
        setSuccessMessage(editingUser ? 'User berhasil diperbarui' : 'User berhasil ditambahkan');
        setTimeout(() => setSuccessMessage(''), 3000);
    };

    const handleDelete = async (user: User) => {
        if (!window.confirm(`Apakah Anda yakin ingin menghapus user "${user.name}"?`)) {
            return;
        }

        try {
            await deleteUser(user.id);
            setSuccessMessage(`User "${user.name}" berhasil dihapus`);
            await fetchUsers();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: any) {
            setError(err.message || 'Gagal menghapus user');
            setTimeout(() => setError(''), 5000);
        }
    };

    const roleColorMap: Record<string, string> = {
        'Super Admin': 'bg-purple-100 text-purple-800',
        'Admin Holding': 'bg-blue-100 text-blue-800',
        'Admin Unit': 'bg-green-100 text-green-800',
        'User': 'bg-gray-100 text-gray-800',
        'Auditor': 'bg-yellow-100 text-yellow-800',
    };

    const canEditOrDelete = (user: User) => {
        return user.role !== 'Super Admin' && user.role !== 'Admin Holding' && user.role !== 'Auditor';
    };

    // Filter users based on search and role filter
    const filteredUsers = users.filter(user => {
        const matchesSearch =
            user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesRole = roleFilter === 'all' || user.role === roleFilter;

        return matchesSearch && matchesRole;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <h1 className="text-2xl md:text-4xl font-bold text-dark-text">Manajemen Pengguna</h1>
                <button
                    onClick={openAddModal}
                    className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg font-semibold transition-colors shadow-md"
                >
                    + Tambah User
                </button>
            </div>

            {/* Success Message */}
            {successMessage && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
                    {successMessage}
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* Search and Filter */}
            <div className="bg-white rounded-xl shadow-md p-4 space-y-4 md:space-y-0 md:flex md:items-center md:gap-4">
                <div className="flex-1">
                    <input
                        type="text"
                        placeholder="Cari nama, username, atau email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                </div>
                <div className="md:w-48">
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                        <option value="all">Semua Role</option>
                        <option value="Super Admin">Super Admin</option>
                        <option value="Admin Holding">Admin Holding</option>
                        <option value="Admin Unit">Admin Unit</option>
                        <option value="User">User</option>
                        <option value="Auditor">Auditor</option>
                    </select>
                </div>
            </div>

            {/* User List */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                {loading ? (
                    <p className="p-4 text-center">Memuat data...</p>
                ) : filteredUsers.length === 0 ? (
                    <p className="p-4 text-center text-gray-500">Tidak ada user yang ditemukan</p>
                ) : (
                    <>
                        {/* Desktop View - Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredUsers.map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{user.username}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{user.email}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${roleColorMap[user.role]}`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                {user.unit ? user.unit.name : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                                {canEditOrDelete(user) ? (
                                                    <>
                                                        <button
                                                            onClick={() => openEditModal(user)}
                                                            className="text-blue-600 hover:text-blue-900 transition-colors"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(user)}
                                                            className="text-red-600 hover:text-red-900 transition-colors"
                                                        >
                                                            Hapus
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile View - Cards */}
                        <div className="md:hidden divide-y divide-gray-200">
                            {filteredUsers.map((user) => (
                                <div key={user.id} className="p-4 hover:bg-gray-50">
                                    <div className="space-y-3">
                                        <div>
                                            <span className="text-xs font-medium text-gray-500 uppercase">Nama</span>
                                            <p className="text-sm font-medium text-gray-900 mt-1">{user.name}</p>
                                        </div>
                                        <div>
                                            <span className="text-xs font-medium text-gray-500 uppercase">Username</span>
                                            <p className="text-sm text-gray-700 mt-1">{user.username}</p>
                                        </div>
                                        <div>
                                            <span className="text-xs font-medium text-gray-500 uppercase">Email</span>
                                            <p className="text-sm text-gray-700 mt-1">{user.email}</p>
                                        </div>
                                        <div>
                                            <span className="text-xs font-medium text-gray-500 uppercase">Role</span>
                                            <div className="mt-1">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${roleColorMap[user.role]}`}>
                                                    {user.role}
                                                </span>
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-xs font-medium text-gray-500 uppercase">Unit</span>
                                            <p className="text-sm text-gray-700 mt-1">{user.unit ? user.unit.name : '-'}</p>
                                        </div>
                                        {canEditOrDelete(user) && (
                                            <div className="pt-2 flex gap-2">
                                                <button
                                                    onClick={() => openEditModal(user)}
                                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user)}
                                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                                                >
                                                    Hapus
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* User Management Modal */}
            <UserManagement
                isOpen={isModalOpen}
                onClose={closeModal}
                onSuccess={handleSuccess}
                editUser={editingUser}
            />
        </div>
    );
};

export default UserList;
