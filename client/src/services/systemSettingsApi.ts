/**
 * System Settings API Service
 * 
 * Handles communication with the backend system settings API
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('authToken');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

class SystemSettingsApiService {
  private baseURL = `${API_BASE_URL}/system`;

  /**
   * Get all system settings
   */
  async getSettings() {
    try {
      const response = await axios.get(`${this.baseURL}/settings`, { headers: getAuthHeaders() });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching system settings:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch system settings');
    }
  }

  /**
   * Update system settings
   */
  async updateSettings(settings: Record<string, any>) {
    try {
      const response = await axios.put(`${this.baseURL}/settings`, settings, { headers: getAuthHeaders() });
      return response.data;
    } catch (error: any) {
      console.error('Error updating system settings:', error);
      throw new Error(error.response?.data?.error || 'Failed to update system settings');
    }
  }

  /**
   * Create backup
   */
  async createBackup(backupName?: string, backupType: string = 'manual') {
    try {
      const response = await axios.post(`${this.baseURL}/backup`, { backupName, backupType }, { headers: getAuthHeaders() });
      return response.data;
    } catch (error: any) {
      console.error('Error creating backup:', error);
      throw new Error(error.response?.data?.error || 'Failed to create backup');
    }
  }

  /**
   * Restore backup
   */
  async restoreBackup(backupId: number) {
    try {
      const response = await axios.post(`${this.baseURL}/restore/${backupId}`, {}, { headers: getAuthHeaders() });
      return response.data;
    } catch (error: any) {
      console.error('Error restoring backup:', error);
      throw new Error(error.response?.data?.error || 'Failed to restore backup');
    }
  }

  /**
   * Get backup history
   */
  async getBackupHistory(limit: number = 20) {
    try {
      const response = await axios.get(`${this.baseURL}/backup-history?limit=${limit}`, { headers: getAuthHeaders() });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching backup history:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch backup history');
    }
  }

  /**
   * Clear cache
   */
  async clearCache() {
    try {
      const response = await axios.post(`${this.baseURL}/maintenance/clear-cache`, {}, { headers: getAuthHeaders() });
      return response.data;
    } catch (error: any) {
      console.error('Error clearing cache:', error);
      throw new Error(error.response?.data?.error || 'Failed to clear cache');
    }
  }

  /**
   * Optimize database
   */
  async optimizeDatabase() {
    try {
      const response = await axios.post(`${this.baseURL}/maintenance/optimize-database`, {}, { headers: getAuthHeaders() });
      return response.data;
    } catch (error: any) {
      console.error('Error optimizing database:', error);
      throw new Error(error.response?.data?.error || 'Failed to optimize database');
    }
  }

  /**
   * System health check
   */
  async systemCheck() {
    try {
      const response = await axios.post(`${this.baseURL}/maintenance/system-check`, {}, { headers: getAuthHeaders() });
      return response.data;
    } catch (error: any) {
      console.error('Error running system check:', error);
      throw new Error(error.response?.data?.error || 'Failed to run system check');
    }
  }

  /**
   * Get maintenance logs
   */
  async getMaintenanceLogs(limit: number = 20) {
    try {
      const response = await axios.get(`${this.baseURL}/maintenance-logs?limit=${limit}`, { headers: getAuthHeaders() });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching maintenance logs:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch maintenance logs');
    }
  }

  /**
   * Get system health status
   */
  async getSystemHealth() {
    try {
      const response = await axios.get(`${this.baseURL}/health`, { headers: getAuthHeaders() });
      return response.data;
    } catch (error: any) {
      console.error('Error checking system health:', error);
      throw new Error(error.response?.data?.error || 'Failed to check system health');
    }
  }
}

export const systemSettingsApi = new SystemSettingsApiService();

