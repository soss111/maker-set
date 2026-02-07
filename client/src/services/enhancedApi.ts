/**
 * Enhanced API Service with Smart Error Handling
 * Provides consistent API calls with automatic retry and error handling
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import ErrorHandler from '../utils/errorHandler';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: any;
  };
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

class EnhancedApiService {
  private api: AxiosInstance;
  private errorHandler: typeof ErrorHandler;
  private retryConfig: RetryConfig;

  constructor() {
    this.errorHandler = ErrorHandler;
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2
    };

    this.api = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for authentication
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error) => {
        const handledError = this.errorHandler.handleApiError(error, 'API_REQUEST');
        return Promise.reject(handledError);
      }
    );
  }

  /**
   * Make API request with automatic retry on failure
   */
  async request<T = any>(
    config: AxiosRequestConfig,
    context: string = 'API_REQUEST'
  ): Promise<ApiResponse<T>> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const response = await this.api.request<T>(config);
        
        return {
          success: true,
          data: response.data
        };
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on certain error types
        if (this.shouldNotRetry(error, attempt)) {
          break;
        }
        
        // Calculate delay for next attempt
        if (attempt < this.retryConfig.maxRetries) {
          const delay = Math.min(
            this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt),
            this.retryConfig.maxDelay
          );
          
          console.warn(`⚠️ API request failed (attempt ${attempt + 1}), retrying in ${delay}ms:`, error.message);
          await this.delay(delay);
        }
      }
    }

    // All retries failed
    return {
      success: false,
      error: lastError
    };
  }

  /**
   * GET request
   */
  async get<T = any>(url: string, config?: AxiosRequestConfig, context?: string): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'GET', url }, context || `GET ${url}`);
  }

  /**
   * POST request
   */
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig, context?: string): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'POST', url, data }, context || `POST ${url}`);
  }

  /**
   * PUT request
   */
  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig, context?: string): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'PUT', url, data }, context || `PUT ${url}`);
  }

  /**
   * DELETE request
   */
  async delete<T = any>(url: string, config?: AxiosRequestConfig, context?: string): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'DELETE', url }, context || `DELETE ${url}`);
  }

  /**
   * Upload file with progress tracking
   */
  async uploadFile<T = any>(
    url: string, 
    file: File, 
    onProgress?: (progress: number) => void,
    context?: string
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    };

    return this.post<T>(url, formData, config, context || `UPLOAD ${file.name}`);
  }

  /**
   * Download file
   */
  async downloadFile(url: string, filename?: string, context?: string): Promise<boolean> {
    try {
      const response = await this.api.get(url, {
        responseType: 'blob',
        ...(context && { context })
      });

      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      return true;
    } catch (error) {
      console.error('Download failed:', error);
      return false;
    }
  }

  /**
   * Check if error should not be retried
   */
  private shouldNotRetry(error: any, attempt: number): boolean {
    // Don't retry on client errors (4xx) except 429 (rate limit)
    if (error.status >= 400 && error.status < 500 && error.status !== 429) {
      return true;
    }

    // Don't retry on authentication errors
    if (error.code === 'UNAUTHORIZED' || error.code === 'FORBIDDEN') {
      return true;
    }

    // Don't retry on validation errors
    if (error.code === 'VALIDATION_ERROR' || error.code === 'BAD_REQUEST') {
      return true;
    }

    return false;
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    return this.errorHandler.getErrorStats();
  }

  /**
   * Clear error statistics
   */
  clearErrorStats() {
    this.errorHandler.clearErrorStats();
  }
}

export default new EnhancedApiService();

