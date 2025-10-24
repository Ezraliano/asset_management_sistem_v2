
import React, { useState, useEffect } from 'react';
import { getUsers } from '../services/api';
import { User } from '../types';
import { useTranslation } from '../hooks/useTranslation';

const UserList: React.FC = () => {
    const { t } = useTranslation();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            const fetchedUsers = await getUsers();
            setUsers(fetchedUsers);
            setLoading(false);
        };
        fetchUsers();
    }, []);

    const roleColorMap = {
        'Admin': 'bg-red-100 text-red-800',
        'Staff': 'bg-green-100 text-green-800',
        'Audit': 'bg-yellow-100 text-yellow-800',
    };

    return (
        <div className="space-y-6">
            <h1 className="text-4xl font-bold text-dark-text">{t('user_list.title')}</h1>
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                {loading ? (
                    <p className="p-4 text-center">{t('user_list.loading')}</p>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('user_list.table.name')}</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('user_list.table.username')}</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('user_list.table.role')}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{user.username}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${roleColorMap[user.role]}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default UserList;