import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ordersApi } from '../services/api';
import { useAuth } from './AuthContext';

interface OrderNotificationContextType {
  activeOrderCount: number;
  newOrderCount: number;
  refreshOrderCount: () => void;
  markOrdersAsSeen: () => void;
}

const OrderNotificationContext = createContext<OrderNotificationContextType | undefined>(undefined);

export const useOrderNotification = () => {
  const context = useContext(OrderNotificationContext);
  if (!context) {
    throw new Error('useOrderNotification must be used within an OrderNotificationProvider');
  }
  return context;
};

interface OrderNotificationProviderProps {
  children: ReactNode;
}

export const OrderNotificationProvider: React.FC<OrderNotificationProviderProps> = ({ children }) => {
  const [activeOrderCount, setActiveOrderCount] = useState(0);
  const [newOrderCount, setNewOrderCount] = useState(0);
  const [lastSeenOrderCount, setLastSeenOrderCount] = useState(0);
  const { user, isAuthenticated } = useAuth();

  // Function to fetch unprinted orders count with retry logic
  const fetchUnprintedOrdersCount = async (retryCount = 0) => {
    try {
      const response = await ordersApi.getAll();
      const orders = response.data.orders || [];
      
      // Filter orders by current user
      let userOrders = orders;
      if (isAuthenticated && user) {
        // For customers, show only their own orders
        if (user.role === 'customer') {
          userOrders = orders.filter((order: any) => 
            order.customer_id === user.user_id || 
            order.customer_email === user.email
          );
        }
        // For admin/production, show all orders
        // For other roles, show only their own orders
        else if (user.role !== 'admin' && user.role !== 'production') {
          userOrders = orders.filter((order: any) => 
            order.customer_id === user.user_id || 
            order.customer_email === user.email
          );
        }
      } else {
        // Not authenticated, show no orders
        userOrders = [];
      }
      
      // Count active orders (not delivered or cancelled)
      const activeOrdersCount = userOrders.filter((order: any) => 
        order.status !== 'cancelled' &&
        order.status !== 'delivered'
      ).length;
      setActiveOrderCount(activeOrdersCount);
      
      // Calculate new orders (orders that appeared since last seen)
      const newOrders = activeOrdersCount - lastSeenOrderCount;
      setNewOrderCount(Math.max(0, newOrders));
    } catch (error) {
      console.error('Error fetching unprinted orders count:', error);
      
      // Retry logic for network errors
      if (retryCount < 3 && (error as any)?.code === 'ERR_NETWORK') {
        console.log(`Retrying fetchUnprintedOrdersCount (attempt ${retryCount + 1})...`);
        setTimeout(() => {
          fetchUnprintedOrdersCount(retryCount + 1);
        }, 2000 * (retryCount + 1)); // Exponential backoff: 2s, 4s, 6s
      }
    }
  };

  // Function to refresh the order count
  const refreshOrderCount = () => {
    fetchUnprintedOrdersCount();
  };

  // Function to mark orders as seen
  const markOrdersAsSeen = () => {
    setLastSeenOrderCount(activeOrderCount);
    setNewOrderCount(0);
  };

  // Initial load and periodic refresh
  useEffect(() => {
    // Add a small delay to ensure server is ready
    const initialTimeout = setTimeout(() => {
      fetchUnprintedOrdersCount();
    }, 1000);
    
    // Refresh every 30 seconds to keep count updated
    const interval = setInterval(fetchUnprintedOrdersCount, 30000);
    
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [user, isAuthenticated]);

  const value: OrderNotificationContextType = {
    activeOrderCount,
    newOrderCount,
    refreshOrderCount,
    markOrdersAsSeen,
  };

  return (
    <OrderNotificationContext.Provider value={value}>
      {children}
    </OrderNotificationContext.Provider>
  );
};
