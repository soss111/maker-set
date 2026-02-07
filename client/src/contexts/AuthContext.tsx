import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '../services/api';

interface User {
  user_id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  company_name?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  role: 'admin' | 'customer' | 'provider' | 'production';
  created_at: string;
  last_login?: string;
  provider_markup_percentage?: number;
  provider_code?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

interface RegisterData {
  email: string;
  password: string;
  username: string;
  first_name: string;
  last_name: string;
  company_name?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('authToken');
      if (storedToken) {
        try {
          setToken(storedToken);
          // Use the users API endpoint to get complete profile data
          const response = await fetch('http://localhost:5001/api/users/profile', {
            headers: {
              'Authorization': `Bearer ${storedToken}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            // Backend returns user data wrapped in a 'user' property
            setUser(data.user);
          } else {
            throw new Error('Failed to fetch profile');
          }
        } catch (error) {
          console.error('Failed to restore auth state:', error);
          localStorage.removeItem('authToken');
          setToken(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login(email, password);
      const { user: userData, token: authToken } = response.data;
      
      // Map auth response user to User interface
      const mappedUser: User = {
        user_id: userData.id,
        email: userData.email,
        username: userData.username,
        first_name: userData.first_name,
        last_name: userData.last_name,
        company_name: userData.company_name,
        role: userData.role as 'admin' | 'customer' | 'provider' | 'production',
        created_at: new Date().toISOString(), // Default value since not provided by auth
      };
      
      setUser(mappedUser);
      setToken(authToken);
      localStorage.setItem('authToken', authToken);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      const response = await authApi.register(userData);
      const { user: newUser, token: authToken } = response.data;
      
      // Map auth response user to User interface
      const mappedUser: User = {
        user_id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        company_name: newUser.company_name,
        role: newUser.role as 'admin' | 'customer' | 'provider' | 'production',
        created_at: new Date().toISOString(), // Default value since not provided by auth
      };
      
      setUser(mappedUser);
      setToken(authToken);
      localStorage.setItem('authToken', authToken);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Registration failed');
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('authToken');
  };

  const updateProfile = async (userData: Partial<User>) => {
    try {
      const response = await fetch('http://localhost:5001/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Profile update failed');
      }

      const result = await response.json();
      // Backend returns user data directly, not wrapped in a 'user' property
      setUser(result);
    } catch (error: any) {
      throw new Error(error.message || 'Profile update failed');
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      await authApi.changePassword(currentPassword, newPassword);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Password change failed');
    }
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    loading,
    isAuthenticated: !!user && !!token,
    isAdmin: user?.role === 'admin'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
