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

  const userRole = user.role.toLowerCase();

  // Super Admin (or Administrator) can see everything
  if (['super-admin', 'administrator'].includes(userRole)) {
    return <>{children}</>;
  }

  const lowercasedAllowedRoles = allowedRoles.map(role => role.toLowerCase());

  if (lowercasedAllowedRoles.includes(userRole)) {
    return <>{children}</>;
  }

  return null;
};

export default Restricted;