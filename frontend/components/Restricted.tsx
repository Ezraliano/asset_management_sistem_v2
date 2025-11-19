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

  if (lowercasedAllowedRoles.includes(userRole)) {
    return <>{children}</>;
  }

  return null;
};

export default Restricted;