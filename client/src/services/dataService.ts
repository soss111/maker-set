/**
 * Shared Data Management Service
 * 
 * Centralized data fetching, caching, and state management
 * with optimistic updates and error recovery
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface DataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface DataOptions {
  cacheKey?: string;
  cacheTime?: number; // in milliseconds
  refetchOnMount?: boolean;
  refetchOnWindowFocus?: boolean;
  retryCount?: number;
  retryDelay?: number;
}

class DataService {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private subscribers = new Map<string, Set<() => void>>();

  /**
   * Get cached data if still valid
   */
  getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - (cached as any).timestamp > (cached as any).ttl) {
      this.cache.delete(key);
      return null;
    }

    return (cached as any).data;
  }

  /**
   * Set cached data
   */
  setCachedData<T>(key: string, data: T, ttl: number = 300000): void { // 5 minutes default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Subscribe to cache updates
   */
  subscribe(key: string, callback: () => void): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key)!.add(callback);

    return () => {
      const subs = this.subscribers.get(key);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscribers.delete(key);
        }
      }
    };
  }

  /**
   * Notify subscribers of cache updates
   */
  notify(key: string): void {
    const subs = this.subscribers.get(key);
    if (subs) {
      subs.forEach(callback => callback());
    }
  }

  /**
   * Clear cache
   */
  clearCache(pattern?: string): void {
    if (pattern) {
      const keys = Array.from(this.cache.keys()).filter(key => key.includes(pattern));
      keys.forEach(key => this.cache.delete(key));
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Global data service instance
const dataService = new DataService();

/**
 * Hook for data fetching with caching and error handling
 */
export function useData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: DataOptions = {}
): DataState<T> & { refetch: () => Promise<void>; mutate: (data: T) => void } {
  const {
    cacheTime = 300000, // 5 minutes
    refetchOnMount = true,
    retryCount = 3,
    retryDelay = 1000
  } = options;

  const [state, setState] = useState<DataState<T>>({
    data: null,
    loading: false,
    error: null,
    lastUpdated: null
  });

  const retryCountRef = useRef(0);
  const isMountedRef = useRef(true);

  const fetchData = useCallback(async (useCache = true) => {
    // Check cache first
    if (useCache) {
      const cached = dataService.getCachedData<T>(key);
      if (cached) {
        setState(prev => ({
          ...prev,
          data: cached,
          loading: false,
          error: null,
          lastUpdated: new Date()
        }));
        return;
      }
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await fetcher();
      
      if (!isMountedRef.current) return;

      // Cache the data
      dataService.setCachedData(key, data, cacheTime);
      
      setState({
        data,
        loading: false,
        error: null,
        lastUpdated: new Date()
      });

      retryCountRef.current = 0;
    } catch (error: any) {
      if (!isMountedRef.current) return;

      const errorMessage = error?.message || 'Failed to fetch data';
      
      if (retryCountRef.current < retryCount) {
        retryCountRef.current++;
        setTimeout(() => {
          if (isMountedRef.current) {
            fetchData(false);
          }
        }, retryDelay * retryCountRef.current);
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage
        }));
        retryCountRef.current = 0;
      }
    }
  }, [key, fetcher, cacheTime, retryCount, retryDelay]);

  const refetch = useCallback(() => fetchData(false), [fetchData]);

  const mutate = useCallback((data: T) => {
    setState(prev => ({
      ...prev,
      data,
      lastUpdated: new Date()
    }));
    dataService.setCachedData(key, data, cacheTime);
    dataService.notify(key);
  }, [key, cacheTime]);

  // Subscribe to cache updates
  useEffect(() => {
    const unsubscribe = dataService.subscribe(key, () => {
      const cached = dataService.getCachedData<T>(key);
      if (cached) {
        setState(prev => ({
          ...prev,
          data: cached,
          lastUpdated: new Date()
        }));
      }
    });

    return unsubscribe;
  }, [key]);

  // Initial fetch
  useEffect(() => {
    if (refetchOnMount) {
      fetchData();
    }
  }, [fetchData, refetchOnMount]);

  // Refetch on window focus
  useEffect(() => {
    if (!options.refetchOnWindowFocus) return;

    const handleFocus = () => {
      const cached = dataService.getCachedData<T>(key);
      if (cached) {
        const age = Date.now() - ((cached as any).timestamp + (cached as any).ttl);
        if (age > 0) { // Cache expired
          fetchData(false);
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [key, fetchData, options.refetchOnWindowFocus]);

  // Cleanup
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    ...state,
    refetch,
    mutate
  };
}

/**
 * Hook for paginated data
 */
export function usePaginatedData<T>(
  key: string,
  fetcher: (page: number, limit: number) => Promise<{ data: T[]; pagination: PaginationState }>,
  initialPage = 1,
  initialLimit = 20,
  options: DataOptions = {}
) {
  const [pagination, setPagination] = useState<PaginationState>({
    page: initialPage,
    limit: initialLimit,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });

  const dataState = useData(
    `${key}_page_${pagination.page}_limit_${pagination.limit}`,
    () => fetcher(pagination.page, pagination.limit),
    options
  );

  const goToPage = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }));
  }, []);

  const changeLimit = useCallback((limit: number) => {
    setPagination(prev => ({ ...prev, limit, page: 1 }));
  }, []);

  const nextPage = useCallback(() => {
    if (pagination.hasNext) {
      goToPage(pagination.page + 1);
    }
  }, [pagination.hasNext, pagination.page, goToPage]);

  const prevPage = useCallback(() => {
    if (pagination.hasPrev) {
      goToPage(pagination.page - 1);
    }
  }, [pagination.hasPrev, pagination.page, goToPage]);

  // Update pagination when data changes
  useEffect(() => {
    if (dataState.data && (dataState.data as any).pagination) {
      setPagination(prev => ({
        ...prev,
        ...(dataState.data as any).pagination
      }));
    }
  }, [dataState.data]);

  return {
    ...dataState,
    pagination,
    goToPage,
    changeLimit,
    nextPage,
    prevPage
  };
}

/**
 * Hook for optimistic updates
 */
export function useOptimisticUpdate<T>(
  key: string,
  updateFn: (data: T) => Promise<T>,
  options: { rollbackOnError?: boolean } = {}
) {
  const { rollbackOnError = true } = options;
  const [isUpdating, setIsUpdating] = useState(false);

  const optimisticUpdate = useCallback(async (optimisticData: T, originalData: T) => {
    setIsUpdating(true);

    // Update cache immediately with optimistic data
    dataService.setCachedData(key, optimisticData);
    dataService.notify(key);

    try {
      const result = await updateFn(optimisticData);
      
      // Update cache with actual result
      dataService.setCachedData(key, result);
      dataService.notify(key);
      
      return result;
    } catch (error) {
      if (rollbackOnError) {
        // Rollback to original data
        dataService.setCachedData(key, originalData);
        dataService.notify(key);
      }
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [key, updateFn, rollbackOnError]);

  return {
    optimisticUpdate,
    isUpdating
  };
}

/**
 * Utility functions
 */
export const dataUtils = {
  /**
   * Clear all cache
   */
  clearAllCache: () => dataService.clearCache(),

  /**
   * Clear cache by pattern
   */
  clearCacheByPattern: (pattern: string) => dataService.clearCache(pattern),

  /**
   * Get cache statistics
   */
  getCacheStats: () => dataService.getCacheStats(),

  /**
   * Prefetch data
   */
  prefetch: async <T>(key: string, fetcher: () => Promise<T>, ttl?: number) => {
    try {
      const data = await fetcher();
      dataService.setCachedData(key, data, ttl);
      return data;
    } catch (error) {
      console.warn(`Failed to prefetch data for key: ${key}`, error);
      return null;
    }
  }
};
