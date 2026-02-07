import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Set as SetType, setsApi, cartReservationApi } from '../services/api';
import { useAuth } from './AuthContext';

export interface CartItem {
  set_id: number;
  set_name: string;
  set_description: string;
  category: string;
  difficulty_level: string;
  recommended_age_min: number;
  recommended_age_max: number;
  estimated_duration_minutes: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  image_url?: string;
  // Provider-specific fields
  provider_set_id?: number;
  provider_id?: number;
  provider_company?: string;
  provider_name?: string;
  provider_code?: string;
  display_price?: number;
  price?: number;
  available_quantity?: number;
}

export interface StockValidationResult {
  set_id: number;
  valid: boolean;
  error?: string;
  parts_configured?: boolean;
  insufficient_parts?: Array<{
    part_id: number;
    part_number: string;
    part_name: string;
    required: number;
    available: number;
    shortfall: number;
  }>;
}

export interface StockValidationResponse {
  valid: boolean;
  results: StockValidationResult[];
  summary: {
    total_items: number;
    valid_items: number;
    invalid_items: number;
  };
}

interface CartContextType {
  items: CartItem[];
  discount: number;
  discountCode: string | null;
  addToCart: (set: SetType, quantity?: number) => void;
  removeFromCart: (setId: number) => void;
  updateQuantity: (setId: number, quantity: number) => void;
  clearCart: () => void;
  clearExpiredCart: () => boolean;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  applyDiscount: (code: string, amount: number) => void;
  removeDiscount: () => void;
  isInCart: (setId: number) => boolean;
  getCartItem: (setId: number) => CartItem | undefined;
  getShippingInfo: () => { cost: number; providerCount: number; description: string };
  getCurrentProvider: () => { provider_id: number | null; provider_name: string | null } | null;
  validateStock: () => Promise<StockValidationResponse>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [discount, setDiscount] = useState<number>(0);
  const [discountCode, setDiscountCode] = useState<string | null>(null);
  const [shippingCost, setShippingCost] = useState<number>(15);
  
  // Fetch shipping cost from system settings
  useEffect(() => {
    const fetchShippingCost = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/settings/shipping_handling_cost`);
        if (response.ok) {
          const data = await response.json();
          const cost = parseFloat(data.setting?.setting_value || data.value || '15');
          setShippingCost(cost);
          console.log('✅ Loaded shipping cost from settings:', cost);
        }
      } catch (error) {
        console.error('Error fetching shipping cost:', error);
      }
    };
    
    fetchShippingCost();
  }, []);
  
  const [items, setItems] = useState<CartItem[]>(() => {
    // Load cart from localStorage on initialization
    try {
      const savedCart = localStorage.getItem('makerset_cart');
      const cartTimestamp = localStorage.getItem('makerset_cart_timestamp');
      
      if (savedCart && cartTimestamp) {
        const cartAge = Date.now() - parseInt(cartTimestamp);
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
        
        if (cartAge < maxAge) {
          const loadedItems: CartItem[] = JSON.parse(savedCart);
          
          // Validate that all items are from the same provider
          const regularItems = loadedItems.filter(item => item.set_id !== -1);
          if (regularItems.length > 0) {
            const firstProviderId = regularItems[0].provider_id;
            const hasMixedProviders = regularItems.some(item => item.provider_id !== firstProviderId);
            
            if (hasMixedProviders) {
              console.warn('🛒 Cart contains items from different providers, clearing cart');
              localStorage.removeItem('makerset_cart');
              localStorage.removeItem('makerset_cart_timestamp');
              return [];
            }
          }
          
          return loadedItems;
        } else {
          // Cart is too old, clear it
          localStorage.removeItem('makerset_cart');
          localStorage.removeItem('makerset_cart_timestamp');
        }
      }
      return [];
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
      return [];
    }
  });

  // Save cart to localStorage whenever items change
  useEffect(() => {
    try {
      localStorage.setItem('makerset_cart', JSON.stringify(items));
      localStorage.setItem('makerset_cart_timestamp', Date.now().toString());
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  }, [items]);

  const addToCart = async (set: SetType, quantity: number = 1) => {
    console.log('🛒 addToCart called with:', { set: set.name, quantity, isAuthenticated });
    console.log('🛒 Set parts:', set.parts);

    // Check if user is authenticated
    if (!isAuthenticated) {
      console.log('🛒 Authentication failed - user not authenticated');
      throw new Error('LOGIN_REQUIRED');
    }

    // If set has no parts (e.g. from shop listing), fetch full set with parts
    if (!set.parts || set.parts.length === 0) {
      try {
        const { data } = await setsApi.getById(set.set_id);
        if (data?.set?.parts?.length) {
          set.parts = data.set.parts.map((p: any) => ({
            ...p,
            part_name: p.part_name ?? p.name ?? p.part_number ?? '',
            is_optional: p.is_optional !== undefined ? p.is_optional : !(p.is_required === 1 || p.is_required === true),
          }));
        }
      } catch (e) {
        console.error('🛒 Failed to fetch set parts:', e);
      }
    }

    // Reserve stock on server (non-blocking for now)
    try {
      await cartReservationApi.reserve({ set_id: set.set_id, quantity });
      console.log('✅ Stock reserved for set:', set.set_id);
    } catch (error: any) {
      console.error('❌ Failed to reserve stock:', error);
      // Don't block adding to cart if reservation fails - just log it
      // The stock will be checked at checkout time
      console.warn('⚠️ Stock reservation failed, but continuing with cart addition');
    }

    // Check if parts are configured for this set
    if (!set.parts || set.parts.length === 0) {
      console.log('🛒 Parts validation failed - no parts configured');
      throw new Error('Cannot add to cart: Parts not configured for this set');
    }

    // Check if there are any required parts (support both is_optional and is_required from API)
    const hasRequiredParts = set.parts.some(
      (part: any) => part.is_optional === false || part.is_optional === 0 || part.is_required === true || part.is_required === 1
    );
    console.log('🛒 Required parts check:', { hasRequiredParts, parts: set.parts.map(p => ({ name: p.part_name, is_optional: p.is_optional })) });
    
    if (!hasRequiredParts) {
      console.log('🛒 Required parts validation failed - no required parts');
      throw new Error('Cannot add to cart: No required parts configured for this set');
    }

    console.log('🛒 All validations passed, checking provider restrictions...');

    setItems(prevItems => {
      // Check for single-provider restriction
      const regularItems = prevItems.filter(item => item.set_id !== -1); // Exclude handling fees
      
      if (regularItems.length > 0) {
        // Get the provider_id of the first item in cart
        const firstItemProviderId = regularItems[0].provider_id;
        const currentItemProviderId = set.provider_id;
        
        // Check if trying to add item from different provider
        if (firstItemProviderId !== currentItemProviderId) {
          // Use the same logic as getCurrentProvider for consistent naming
          const firstItemProviderName = regularItems[0].provider_id === null 
            ? 'MakerSet Platform'
            : (regularItems[0].provider_code || regularItems[0].provider_company || regularItems[0].provider_name || 'Unknown Provider');
          
          const currentItemProviderName = set.provider_id === null
            ? 'MakerSet Platform' 
            : (set.provider_code || set.provider_company || set.provider_name || 'Unknown Provider');
          
          console.log('🛒 Provider restriction violated:', { 
            firstItemProviderId, 
            currentItemProviderId,
            firstItemProviderName,
            currentItemProviderName
          });
          
          throw new Error(`Cannot add items from different providers to the same order. Your cart contains items from ${firstItemProviderName}. Please complete your current order or clear your cart before adding items from ${currentItemProviderName}.`);
        }
      }

      const existingItem = prevItems.find(item => item.set_id === set.set_id);
      let updatedItems: CartItem[];
      
      if (existingItem) {
        // Update quantity if item already exists
        updatedItems = prevItems.map(item =>
          item.set_id === set.set_id
            ? {
                ...item,
                quantity: item.quantity + quantity,
                total_price: (item.quantity + quantity) * item.unit_price
              }
            : item
        );
      } else {
        // Add new item to cart
        const unitPrice = Number(set.display_price || set.price || set.base_price || 0); // Use provider price first
        const newItem: CartItem = {
          set_id: set.set_id,
          set_name: set.name || 'Unnamed Set',
          set_description: set.description || '',
          category: set.category || '',
          difficulty_level: set.difficulty_level || '',
          recommended_age_min: set.recommended_age_min || 0,
          recommended_age_max: set.recommended_age_max || 0,
          estimated_duration_minutes: set.estimated_duration_minutes || 0,
          quantity,
          unit_price: unitPrice,
          total_price: quantity * unitPrice,
          image_url: set.media?.[0]?.file_url,
          // Provider-specific fields
          provider_set_id: set.provider_set_id,
          provider_id: set.provider_id,
          provider_company: set.provider_company,
          provider_name: set.provider_name,
          provider_code: set.provider_code,
          display_price: set.display_price,
          price: set.price,
          available_quantity: set.available_quantity
        };
        
        updatedItems = [...prevItems, newItem];
      }
      
      // Check if we need to add handling fee
      const finalItems = addHandlingFeeIfNeeded(updatedItems);
      console.log('🛒 Items after adding to cart:', finalItems);
      return finalItems;
    });
  };

  // Helper function to add or update handling fee
  const addHandlingFeeIfNeeded = (items: CartItem[]): CartItem[] => {
    const hasRegularItems = items.some(item => item.set_id !== -1);
    
    if (!hasRegularItems) {
      // No regular items, remove any handling fees
      return items.filter(item => item.set_id !== -1);
    }
    
    // Get shipping cost from state (loaded from system settings)
    const currentShippingCost = shippingCost;
    const shippingDescription = 'Handling, packaging, and transport costs for your order';
    
    // Create or update handling fee item
    const handlingFeeItem: CartItem = {
      set_id: -1, // Special ID for handling fee
      set_name: 'Handling, Packaging & Transport',
      set_description: shippingDescription,
      category: 'Service',
      difficulty_level: 'N/A',
      recommended_age_min: 0,
      recommended_age_max: 0,
      estimated_duration_minutes: 0,
      quantity: 1,
      unit_price: currentShippingCost,
      total_price: currentShippingCost,
      image_url: undefined,
    };
    
    // Remove any existing handling fees and add the new one
    const itemsWithoutHandlingFee = items.filter(item => item.set_id !== -1);
    return [...itemsWithoutHandlingFee, handlingFeeItem];
  };

  const removeFromCart = (setId: number) => {
    setItems(prevItems => {
      const filteredItems = prevItems.filter(item => item.set_id !== setId);
      return addHandlingFeeIfNeeded(filteredItems);
    });
  };

  const updateQuantity = (setId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(setId);
      return;
    }

    setItems(prevItems => {
      const updatedItems = prevItems.map(item =>
        item.set_id === setId
          ? {
              ...item,
              quantity,
              total_price: quantity * item.unit_price
            }
          : item
      );
      
      return addHandlingFeeIfNeeded(updatedItems);
    });
  };

  const clearCart = async () => {
    // Release reservations on server
    if (isAuthenticated) {
      try {
        await cartReservationApi.releaseAll();
        console.log('✅ Released cart reservations');
      } catch (error) {
        console.error('Error releasing reservations:', error);
      }
    }
    
    setItems([]);
    // Also clear from localStorage
    localStorage.removeItem('makerset_cart');
    localStorage.removeItem('makerset_cart_timestamp');
  };

  const clearExpiredCart = () => {
    try {
      const cartTimestamp = localStorage.getItem('makerset_cart_timestamp');
      if (cartTimestamp) {
        const cartAge = Date.now() - parseInt(cartTimestamp);
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
        
        if (cartAge >= maxAge) {
          clearCart();
          return true; // Cart was expired and cleared
        }
      }
      return false; // Cart is still valid
    } catch (error) {
      console.error('Error checking cart expiration:', error);
      return false;
    }
  };

  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return items.reduce((total, item) => total + item.total_price, 0);
  };

  const isInCart = (setId: number) => {
    return items.some(item => item.set_id === setId);
  };

  const getCartItem = (setId: number) => {
    return items.find(item => item.set_id === setId);
  };

  const validateStock = async (): Promise<StockValidationResponse> => {
    if (items.length === 0) {
      return {
        valid: true,
        results: [],
        summary: { total_items: 0, valid_items: 0, invalid_items: 0 }
      };
    }

    try {
      const itemsToValidate = items.map(item => ({
        set_id: item.set_id,
        quantity: item.quantity
      }));

      const response = await setsApi.validateStock(itemsToValidate);
      return response.data;
    } catch (error) {
      console.error('Error validating stock:', error);
      throw new Error('Failed to validate stock availability');
    }
  };

  const getShippingInfo = () => {
    const regularItems = items.filter(item => item.set_id !== -1);
    
    if (regularItems.length === 0) {
      return { cost: 0, providerCount: 0, description: 'No items in cart' };
    }
    
    // Get shipping cost from state (loaded from system settings)
    const currentShippingCost = shippingCost;
    const description = 'Single shipment from one provider';
    
    return { cost: currentShippingCost, providerCount: 1, description };
  };

  const getCurrentProvider = () => {
    const regularItems = items.filter(item => item.set_id !== -1); // Exclude handling fees
    
    if (regularItems.length === 0) {
      return null; // No items in cart
    }
    
    // Return the provider info from the first item
    const firstItem = regularItems[0];
    
    // Handle admin sets (provider_id is null)
    if (firstItem.provider_id === null) {
      return {
        provider_id: null,
        provider_name: 'MakerSet Platform'
      };
    }
    
    // Handle provider sets
    const result = {
      provider_id: firstItem.provider_id || null,
      provider_name: firstItem.provider_code || firstItem.provider_company || firstItem.provider_name || 'Unknown Provider'
    };
    
    return result;
  };

  const applyDiscount = (code: string, amount: number) => {
    setDiscount(amount);
    setDiscountCode(code);
  };

  const removeDiscount = () => {
    setDiscount(0);
    setDiscountCode(null);
  };

  const value: CartContextType = {
    items,
    discount,
    discountCode,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    clearExpiredCart,
    getTotalItems,
    getTotalPrice,
    applyDiscount,
    removeDiscount,
    isInCart,
    getCartItem,
    getShippingInfo,
    getCurrentProvider,
    validateStock
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
