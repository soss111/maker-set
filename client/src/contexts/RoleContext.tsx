import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useAuth } from './AuthContext';

export type UserRole = 'admin' | 'production' | 'customer' | 'provider' | 'public';

interface RoleContextType {
  currentRole: UserRole;
  changeRole: (role: UserRole) => void;
  isAdmin: boolean;
  isProduction: boolean;
  isCustomer: boolean;
  isProvider: boolean;
  isPublic: boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [currentRole, setCurrentRole] = useState<UserRole>('public');

  // Sync role with authentication state
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setCurrentRole('public');
    } else {
      // Set role based on user's actual role from database
      setCurrentRole(user.role || 'customer');
    }
  }, [isAuthenticated, user]);

  const changeRole = (role: UserRole) => {
    setCurrentRole(role);
  };

  const isAdmin = currentRole === 'admin';
  const isProduction = currentRole === 'production';
  const isCustomer = currentRole === 'customer';
  const isProvider = currentRole === 'provider';
  const isPublic = currentRole === 'public';

  return (
    <RoleContext.Provider value={{ 
      currentRole, 
      changeRole, 
      isAdmin, 
      isProduction, 
      isCustomer, 
      isProvider, 
      isPublic 
    }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};
