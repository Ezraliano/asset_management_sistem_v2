import React from 'react';
import { User } from '../types';

type Props = {
  user: User | null;
  allowedRoles: Array<User['role']>;
  children: React.ReactNode;
};

const Restricted: React.FC<Props> = ({ user, allowedRoles, children }) => {
  if (!user || !user.role) {
    return null;
  }

  const userRole = user.role.toLowerCase().trim();

  // Super Admin (or Administrator) can see everything
  // This is the primary check for super-admin access
  if (userRole === 'super-admin' || userRole === 'administrator') {
    return <>{children}</>;
  }

  const lowercasedAllowedRoles = allowedRoles.map(role => role.toLowerCase().trim());

  // Check for exact match or alias match (e.g., 'admin' matches 'admin-holding' and 'admin-kredit')
  let hasRole = lowercasedAllowedRoles.includes(userRole);

  if (!hasRole && lowercasedAllowedRoles.includes('admin')) {
    if (userRole === 'admin-holding' || userRole === 'admin-kredit') {
      hasRole = true;
    }
  }

  if (hasRole) {
    return <>{children}</>;
  }

  return null;
};

export default Restricted;