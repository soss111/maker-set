import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/** Returns current API base URL (e.g. for fetch). Can be updated from System Settings. */
export function getApiBaseUrl(): string {
  return api.defaults.baseURL || API_BASE_URL;
}

/** Set API base URL at runtime (e.g. from System Settings public_url). */
export function setApiBaseUrl(url: string): void {
  const base = url.trim().replace(/\/+$/, '');
  api.defaults.baseURL = base ? `${base}${base.endsWith('/api') ? '' : '/api'}` : API_BASE_URL;
}

// Request interceptor for logging (removed hardcoded language)
api.interceptors.request.use((config) => {
  if (config.url?.includes('/ai/translate/text')) {
    console.log('🌐 AI Translation:', config.data?.targetLanguage?.toUpperCase(), '←', config.data?.text);
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// API Response interfaces
export interface PaginatedResponse<T> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface SetsResponse extends PaginatedResponse<Set> {
  sets: Set[];
}

export interface PartsResponse extends PaginatedResponse<Part> {
  parts: Part[];
}

export interface ToolsResponse extends PaginatedResponse<Tool> {
  tools: Tool[];
}

export interface OrdersResponse extends PaginatedResponse<Order> {
  orders: Order[];
}

export interface ShopSetsResponse extends PaginatedResponse<Set> {
  sets: Set[];
}

// Auth response interfaces
export interface AuthResponse {
  message: string;
  token: string;
  user: {
    id: number;
    email: string;
    username: string;
    first_name: string;
    last_name: string;
    company_name?: string;
    role: string;
  };
}

export interface ProfileResponse {
  user: {
    user_id: number;
    email: string;
    username: string;
    first_name: string;
    last_name: string;
    company_name?: string;
    role: string;
    created_at: string;
    updated_at: string;
  };
}

export interface UserStatsResponse {
  success: boolean;
  data: {
    total_users: number;
    active_users: number;
    admin_users: number;
    provider_users: number;
    customer_users: number;
    new_users_this_month: number;
    efficiency: number;
  };
}

// Customer feedback interface
export interface CustomerFeedback {
  id: number;
  rating: number;
  review: string;
  customer_name: string;
  date: string;
}

export interface Set {
  set_id: number;
  name: string;
  description?: string;
  category: string;
  difficulty_level: string;
  recommended_age_min?: number;
  recommended_age_max?: number;
  estimated_duration_minutes?: number;
  manual?: string;
  base_price?: number;
  video_url?: string;
  learning_outcomes?: string[];
  average_rating?: number;
  review_count?: number;
  latest_review_text?: string;
  latest_reviewer_name?: string;
  customer_feedback?: CustomerFeedback[];
  customer_name?: string;
  active: boolean;
  part_count?: number;
  tool_count?: number;
  media_count?: number;
  admin_visible?: boolean;
  provider_visible?: boolean;
  tested_by_makerset?: boolean;
  available_quantity?: number;
  share_count?: number;
  created_at: string;
  updated_at: string;
  parts?: Part[];
  instructions?: Instruction[];
  media?: Media[];
  translations?: {
    [languageCode: string]: {
      name: string;
      description: string;
    };
  };
  // Provider-specific properties (for shop sets)
  provider_set_id?: number;
  provider_id?: number;
  price?: number;
  display_price?: number;
  provider_available_quantity?: number;
  provider_name?: string;
  provider_username?: string;
  provider_company?: string;
  provider_code?: string;
  set_type?: 'admin' | 'provider';
}

export interface FavoriteSet {
  favorite_id: number;
  set_id: number;
  created_at: string;
  category: string;
  difficulty_level: string;
  recommended_age_min?: number;
  recommended_age_max?: number;
  estimated_duration_minutes?: number;
  active: number;
  name: string;
  description?: string;
}

export interface Part {
  part_id: number;
  part_number: string;
  part_name: string;
  description?: string;
  category: string;
  unit_of_measure: string;
  unit_cost?: number;
  supplier?: string;
  supplier_part_number?: string;
  stock_quantity: number;
  minimum_stock_level: number;
  image_url?: string;
  instruction_pdf?: string;
  drawing_pdf?: string;
  assembly_notes?: string;
  safety_notes?: string;
  quantity?: number;
  is_optional?: boolean;
  notes?: string;
  is_low_stock?: boolean;
  set_usage_count?: number;
  translations?: {
    [languageCode: string]: {
      part_name: string;
      description: string;
    };
  };
}

export interface Tool {
  tool_id: number;
  tool_number: string;
  tool_name: string;
  description?: string;
  safety_instructions?: string;
  category: string;
  tool_type: string;
  condition_status: string;
  location?: string;
  purchase_date?: string;
  last_maintenance_date?: string;
  next_maintenance_date?: string;
  notes?: string;
  image_url?: string;
  active?: number;
  created_at: string;
  updated_at: string;
  quantity?: number;
  is_required?: boolean;
  set_tool_notes?: string;
  translations?: {
    [languageCode: string]: {
      tool_name: string;
      description?: string;
      safety_instructions?: string;
    };
  };
}

export interface Receipt {
  receipt_id: number;
  receipt_number?: string;
  supplier: string;
  purchase_date: string;
  total_amount: number;
  tax_amount?: number;
  currency: string;
  payment_method?: string;
  notes?: string;
  receipt_image_url?: string;
  created_at: string;
  items?: ReceiptItem[];
}

export interface ReceiptItem {
  receipt_item_id?: number;
  part_id?: number;
  quantity: number;
  unit_price: number;
  line_total: number;
  notes?: string;
  part_number?: string;
  part_name?: string;
  category?: string;
  unit_of_measure?: string;
  supplier?: string;
  supplier_part_number?: string;
}

export interface Instruction {
  instruction_id: number;
  step_order: number;
  estimated_time_minutes?: number;
  type_name: string;
  title: string;
  content: string;
}

export interface Language {
  language_id: number;
  language_code: string;
  language_name: string;
  is_default: boolean;
  active: boolean;
}

export interface Media {
  media_id: number;
  file_name: string;
  file_path: string;
  file_type: string;
  mime_type: string;
  file_size_bytes: number;
  created_at: string;
  media_category: string;
  display_order: number;
  is_featured: boolean;
  description?: string;
  alt_text?: string;
  file_url: string;
}

// Set creation data interface
export interface SetCreationData {
  name?: string;
  description?: string;
  category: string;
  difficulty_level: string;
  recommended_age_min: number;
  recommended_age_max: number;
  estimated_duration_minutes: number;
  base_price?: number;
  video_url?: string;
  learning_outcomes?: string[];
  translations: Array<{
    language_code: string;
    name: string;
    description: string;
  }>;
  parts: Array<{
    part_id: number;
    quantity: number;
    is_optional: boolean;
    notes: string;
  }>;
}

// Tool creation data interface
export interface ToolCreationData {
  tool_number: string;
  category: string;
  tool_type: string;
  condition_status?: string;
  location?: string;
  purchase_date?: string;
  last_maintenance_date?: string;
  next_maintenance_date?: string;
  notes?: string;
  image_url?: string;
  translations: Array<{
    language_code: string;
    tool_name: string;
    description?: string;
    safety_instructions?: string;
  }>;
}

export interface PartCreationData {
  part_number: string;
  category: string;
  unit_of_measure: string;
  unit_cost?: number;
  supplier?: string;
  supplier_part_number?: string;
  stock_quantity: number;
  minimum_stock_level: number;
  image_url?: string;
  instruction_pdf?: string;
  drawing_pdf?: string;
  assembly_notes?: string;
  safety_notes?: string;
  translations: Array<{
    language_code: string;
    part_name: string;
    description?: string;
  }>;
}

// Sets API
export const setsApi = {
  getAll: (language?: string, includeInactive?: boolean) => api.get<SetsResponse>('/sets', { params: { language, include_inactive: includeInactive ? 'true' : 'false' } }),
  getById: (id: number, language?: string) => api.get<Set>(`/sets/${id}`, { params: { language } }),
  create: (data: SetCreationData) => api.post('/sets', data),
  update: (id: number, data: Partial<Set>) => api.put(`/sets/${id}`, data),
  updatePrice: (id: number, base_price: number) => api.patch(`/sets/${id}/price`, { base_price }),
  updateVisibility: (id: number, admin_visible: boolean) => api.put(`/sets/${id}/visibility`, { admin_visible }),
  updateProviderVisibility: (provider_set_id: number, provider_visible: boolean) => api.put(`/provider-sets/${provider_set_id}/visibility`, { provider_visible }),
  updateTrustCertification: (id: number, tested_by_makerset: boolean) => api.put(`/sets/${id}/trust-certification`, { tested_by_makerset }),
  delete: (id: number) => api.delete(`/sets/${id}`),
  validateStock: (items: Array<{ set_id: number; quantity: number }>) => 
    api.post('/sets/validate-stock', { sets: items }),
  confirmPayment: (orderId: number, paymentData: { payment_reference: string; payment_amount: number; payment_method?: string }) => 
    api.put(`/orders/${orderId}/confirm-payment`, paymentData)
};

// Parts API
export const partsApi = {
  getAll: (language?: string, category?: string, lowStock?: boolean) => {
    const params: any = {};
    if (language) params.language = language;
    if (category) params.category = category;
    if (lowStock !== undefined) params.low_stock = lowStock;
    return api.get<PartsResponse>('/parts', { params });
  },
  getById: (id: number, language?: string) => {
    const params: any = {};
    if (language) params.language = language;
    return api.get<Part>(`/parts/${id}`, { params });
  },
  getNextNumber: (category?: string) => {
    const params: any = {};
    if (category) params.category = category;
    return api.get<{next_number: string}>('/parts/next-number', { params });
  },
  create: (data: PartCreationData) => api.post('/parts', data),
  update: (id: number, data: Partial<PartCreationData>) => api.put(`/parts/${id}`, data),
  delete: (id: number) => api.delete(`/parts/${id}`),
  getLowStock: (language?: string) => {
    const params: any = {};
    if (language) params.language = language;
    return api.get<Part[]>('/parts/alerts/low-stock', { params });
  },
};

// Tools API
export const toolsApi = {
  getAll: (language?: string, category?: string, toolType?: string, conditionStatus?: string, includeInactive?: boolean) => 
    api.get<ToolsResponse>('/tools', { params: { language, category, tool_type: toolType, condition_status: conditionStatus, include_inactive: includeInactive } }),
  getById: (id: number, language?: string) => api.get<Tool>(`/tools/${id}`, { params: { language } }),
  getNextNumber: (category?: string, toolType?: string) => api.get<{next_number: string}>('/tools/next-number', { params: { category, tool_type: toolType } }),
  create: (data: ToolCreationData) => api.post('/tools', data),
  update: (id: number, data: ToolCreationData) => api.put(`/tools/${id}`, data),
  delete: (id: number) => api.delete(`/tools/${id}`),
  activate: (id: number, active: boolean) => api.put(`/tools/${id}/activate`, { active }),
  getBySetId: (setId: number, language?: string) => api.get<Tool[]>(`/tools/set/${setId}`, { params: { language } }),
};

// Receipts API
export const receiptsApi = {
  getAll: (page?: number, limit?: number, supplier?: string, startDate?: string, endDate?: string) =>
    api.get<Receipt[]>('/receipts', { params: { page, limit, supplier, start_date: startDate, end_date: endDate } }),
  getById: (id: number, language?: string) => api.get<Receipt>(`/receipts/${id}`, { params: { language } }),
  getNextNumber: () => api.get<{next_number: string}>('/receipts/next-number'),
  create: (data: Partial<Receipt>) => api.post('/receipts', data),
  update: (id: number, data: Partial<Receipt>) => api.put(`/receipts/${id}`, data),
  delete: (id: number) => api.delete(`/receipts/${id}`),
  uploadImage: (id: number, file: File) => {
    const formData = new FormData();
    formData.append('receipt_image', file);
    return api.post(`/receipts/${id}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Instructions API
export const instructionsApi = {
  getBySetId: (setId: number, language?: string, type?: string) =>
    api.get<Instruction[]>(`/instructions/set/${setId}`, { params: { language, type } }),
};

// Languages API
export const languagesApi = {
  getAll: () => api.get<Language[]>('/languages'),
};

// Media API
// Order interfaces
export interface Order {
  order_id: number;
  order_number: string;
  customer_id: number;
  provider_id: number;
  provider_code?: string;
  order_date: string;
  status: string;
  total_amount: string;
  currency: string;
  shipping_address?: string;
  billing_address?: string;
  notes?: string;
  company_name?: string;
  created_at: string;
  updated_at: string;
  // Status-specific timestamps
  confirmed_at?: string;
  in_production_at?: string;
  shipped_at?: string;
  delivered_at?: string;
  cancelled_at?: string;
  // Customer information
  customer_first_name?: string;
  customer_last_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_city?: string;
  customer_postal_code?: string;
  customer_country?: string;
  customer_company_name?: string;
  // Provider information
  provider_company_name?: string;
  provider_first_name?: string;
  provider_last_name?: string;
  provider_email?: string;
  // Order items
  items?: OrderItem[];
}

export interface OrderItem {
  order_item_id: number;
  order_id: number;
  set_id: number;
  quantity: number;
  unit_price: number;
  line_total: number;
  set_name: string;
  set_description?: string;
  set_category?: string;
  difficulty_level?: string;
  recommended_age_min?: number;
  recommended_age_max?: number;
  estimated_duration_minutes?: number;
  teacher_manual_pdf?: string;
  student_manual_pdf?: string;
  production_manual_pdf?: string;
  drawing_pdf?: string;
}

export interface OrderStatusHistory {
  status_history_id: number;
  order_id: number;
  old_status?: string;
  new_status: string;
  changed_by?: number;
  changed_at: string;
  notes?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

export interface PackingListPart {
  type: 'part';
  part_id: number;
  part_number: string;
  part_name: string;
  part_description?: string;
  part_category?: string;
  unit_of_measure?: string;
  unit_cost?: number;
  supplier?: string;
  supplier_part_number?: string;
  stock_quantity: number;
  minimum_stock_level: number;
  image_url?: string;
  instruction_pdf?: string;
  drawing_pdf?: string;
  assembly_notes?: string;
  safety_notes?: string;
  total_quantity_needed: number;
  is_optional: boolean;
  used_in_sets: Array<{
    set_id: number;
    set_name: string;
    quantity_per_set: number;
    order_quantity: number;
    total_for_set: number;
    is_optional: boolean;
    notes?: string;
  }>;
}

export interface PackingListTool {
  type: 'tool';
  tool_id: number;
  tool_number: string;
  tool_name: string;
  tool_description?: string;
  tool_category?: string;
  tool_type?: string;
  condition_status?: string;
  location?: string;
  purchase_date?: string;
  last_maintenance_date?: string;
  next_maintenance_date?: string;
  tool_maintenance_notes?: string;
  image_url?: string;
  safety_instructions?: string;
  total_quantity_needed: number;
  is_required: boolean;
  used_in_sets: Array<{
    set_id: number;
    set_name: string;
    quantity_per_set: number;
    order_quantity: number;
    total_for_set: number;
    is_required: boolean;
    notes?: string;
  }>;
}

export type PackingListItem = PackingListPart | PackingListTool;

export interface PackingListResponse {
  order: Order;
  items: OrderItem[];
  packingList: PackingListItem[];
}

export const ordersApi = {
  getAll: (params?: any) => api.get<OrdersResponse>('/orders', { params }),
  getById: (id: number, language?: string) => api.get<{ order: Order }>(`/orders/${id}`, { params: { language } }),
  getByProvider: (providerId: number, status?: string) => api.get<OrdersResponse>(`/orders/provider/${providerId}`, { params: { status } }),
  create: (data: any) => api.post('/orders', data),
  update: (id: number, data: any) => api.put(`/orders/${id}`, data),
  delete: (id: number) => api.delete(`/orders/${id}`),
  permanentDelete: (id: number, putPartsBackToStock: boolean = true) => 
    api.delete(`/orders/${id}/permanent`, { data: { putPartsBackToStock } }),
  updateStatus: (id: number, status: string, notes?: string, updatedBy?: number) => 
    api.put(`/orders/${id}/status`, { status, notes, updated_by: updatedBy }),
  updateProviderStatus: (id: number, status: string, notes?: string, trackingNumber?: string) => 
    api.put(`/orders/${id}/provider-status`, { status, notes, tracking_number: trackingNumber }),
  getStatusHistory: (id: number) => 
    api.get<{ statusHistory: OrderStatusHistory[] }>(`/orders/${id}/status-history`),
  getPackingList: (id: number, language?: string) => 
    api.get<PackingListResponse>(`/orders/${id}/packing-list`, { params: { language } }),
  getStats: () => api.get('/orders/stats'),
  getProviderStats: (params?: { date_from?: string; date_to?: string }) => 
    api.get('/orders/stats/by-providers', { params }),
  getSalesManagement: (params?: { provider_id?: number; payment_status?: string; date_from?: string; date_to?: string }) => 
    api.get('/orders/sales-management', { params }),
  updatePaymentStatus: (id: number, paymentData: {
    payment_status: string;
    payment_method?: string;
    payment_reference?: string;
    payment_amount?: number;
    payment_notes?: string;
    payment_date?: string;
  }) => api.put(`/orders/${id}/payment`, paymentData),
  updatePaymentStatusAdmin: (id: number, paymentData: {
    payment_status: string;
    payment_method?: string;
    payment_reference?: string;
    payment_amount?: number;
    payment_date?: string;
    notes?: string;
  }) => api.put(`/orders/${id}/payment-status`, paymentData),
  processBankImport: (bankTransactions: Array<{
    amount: string;
    date: string;
    reference?: string;
    description?: string;
    payment_method?: string;
  }>) => api.post('/orders/bank-import', { bankTransactions }),
  
  // Automated reporting methods
  getMonthlyReports: () => api.get('/monthly-reports'),
  getMonthlyReportInvoices: (reportId: number) => api.get(`/monthly-reports/${reportId}/invoices`),
  generateMonthlyReport: (month: number, year: number) => api.post('/monthly-reports/generate', { month, year }),
  downloadInvoice: (filename: string) => api.get(`/invoices/download/${filename}`, { responseType: 'blob' }),
  
  // Notification methods
  getNotifications: () => api.get('/notifications'),
  markNotificationAsRead: (notificationId: number) => api.put(`/notifications/${notificationId}/read`),
  getUnreadNotificationCount: () => api.get('/notifications/unread-count'),
  createNotification: (notification: {
    type: string;
    title: string;
    message: string;
    created_for?: number | null;
    priority: string;
  }) => api.post('/notifications', notification),
};

export const providerPaymentsApi = {
  getReports: (params?: any) => api.get('/provider-payments/reports', { params }),
  getPayments: (params?: any) => api.get('/provider-payments/payments', { params }),
  generateMonthlyReports: (data: { year?: number; month?: number }) => 
    api.post('/provider-payments/generate-report', data),
  completePayment: (data: {
    order_id: number;
    payment_amount?: number;
    payment_method?: string;
    payment_reference?: string;
    notes?: string;
  }) => api.post('/provider-payments/complete-payment', data),
};

export const favoritesApi = {
  getAll: (userId: number) => api.get<FavoriteSet[]>(`/favorites?user_id=${userId}`),
  add: (userId: number, setId: number) => api.post('/favorites', { user_id: userId, set_id: setId }),
  remove: (userId: number, setId: number) => api.delete(`/favorites?user_id=${userId}&set_id=${setId}`),
  check: (userId: number, setId: number) => api.get<{ is_favorite: boolean; favorite_id: number | null }>(`/favorites/check?user_id=${userId}&set_id=${setId}`),
};

export const passwordResetApi = {
  requestReset: (email: string) => api.post('/auth/forgot-password', { email }),
  verifyToken: (token: string) => api.get<{ success: boolean; valid: boolean; user?: any }>(`/auth/verify-reset-token?token=${token}`),
  resetPassword: (token: string, newPassword: string) => api.post('/auth/reset-password', { token, new_password: newPassword }),
};

export const mediaApi = {
  upload: (file: File, setId?: number, partId?: number, mediaCategory?: string, description?: string, altText?: string) => {
    const formData = new FormData();
    formData.append('media', file);
    if (setId) formData.append('set_id', setId.toString());
    if (partId) formData.append('part_id', partId.toString());
    if (mediaCategory) formData.append('media_category', mediaCategory);
    if (description) formData.append('description', description);
    if (altText) formData.append('alt_text', altText);
    
    return api.post('/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getBySetId: (setId: number, language?: string) => 
    api.get<Media[]>(`/media/set/${setId}`, { params: { language } }),
  getByPartId: (partId: number) => 
    api.get(`/media/part/${partId}`),
  delete: (mediaId: number) => api.delete(`/media/${mediaId}`),
  setFeatured: (mediaId: number, isFeatured: boolean) => 
    api.patch(`/media/${mediaId}/featured`, { is_featured: isFeatured }),
  updateTranslations: (mediaId: number, translations: { description?: string; alt_text?: string }) =>
    api.patch(`/media/${mediaId}/translations`, translations),
};

// AI Translation API
export const aiTranslationApi = {
  translateText: (text: string, targetLanguage: string, context?: string) =>
    api.post('/ai/translate/text', { text, targetLanguage, context }),
  
  translateTool: (toolData: { tool_name: string; description?: string; safety_instructions?: string }) =>
    api.post('/ai/translate/tool', { toolData }),
  
  translateBatch: (texts: string[], targetLanguage: string, context?: string) =>
    api.post('/ai/translate/batch', { texts, targetLanguage, context }),
  
  getCacheStats: () => api.get('/ai/translate/cache/stats'),
  
  clearCache: () => api.delete('/ai/translate/cache')
};

export const setPartsApi = {
  getBySetId: (setId: number, language?: string) => 
    api.get(`/set-parts/set/${setId}`, { params: { language } }),
  
  addToSet: (data: {
    set_id: number;
    part_id: number;
    quantity: number;
    is_optional?: boolean;
    notes?: string;
  }) => api.post('/set-parts', data),
  
  update: (id: number, data: {
    quantity: number;
    is_optional?: boolean;
    notes?: string;
  }) => api.put(`/set-parts/${id}`, data),
  
  remove: (id: number) => api.delete(`/set-parts/${id}`)
};

export const setToolsApi = {
  getBySetId: (setId: number, language?: string) => 
    api.get(`/set-tools/set/${setId}`, { params: { language } }),
  
  addToSet: (data: {
    set_id: number;
    tool_id: number;
    quantity: number;
    is_optional?: boolean;
    notes?: string;
  }) => api.post('/set-tools', data),
  
  update: (id: number, data: {
    quantity: number;
    is_optional?: boolean;
    notes?: string;
    safety_notes?: string;
  }) => api.put(`/set-tools/${id}`, data),
  
  remove: (id: number) => api.delete(`/set-tools/${id}`)
};

// Admin Provider Management API
export interface ProviderSet {
  provider_set_id: number;
  provider_id: number;
  set_id: number;
  price: number;
  available_quantity: number;
  is_active: boolean;
  provider_visible: boolean;
  admin_visible: boolean;
  admin_status: 'active' | 'on_hold' | 'disabled';
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  set_name: string;
  set_description: string;
  category: string;
  difficulty_level: string;
  base_price: number;
  provider_username: string;
  provider_first_name: string;
  provider_last_name: string;
  provider_company: string;
  provider_code: string;
  provider_email: string;
}

export interface ProviderSetsResponse {
  provider_sets: ProviderSet[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ProviderSetStats {
  total_provider_sets: number;
  active_sets: number;
  on_hold_sets: number;
  disabled_sets: number;
  visible_to_customers: number;
  enabled_by_providers: number;
  unique_providers: number;
}

export const adminProviderSetsApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    status?: 'all' | 'active' | 'on_hold' | 'disabled';
    search?: string;
  }) => api.get<ProviderSetsResponse>('/admin/provider-sets', { params }),
  
  getById: (id: number) => api.get<{ provider_set: ProviderSet }>(`/admin/provider-sets/${id}`),
  
  updateVisibility: (id: number, admin_visible: boolean) =>
    api.put(`/admin/provider-sets/${id}/visibility`, { admin_visible }),
  
  updateStatus: (id: number, admin_status: 'active' | 'on_hold' | 'disabled', admin_notes?: string) =>
    api.put(`/api/admin/provider-sets/${id}/status`, { admin_status, admin_notes }),
  
  updateProviderVisibility: (id: number, provider_visible: boolean) =>
    api.put(`/admin/provider-sets/${id}/provider-visibility`, { provider_visible }),
  
  delete: (id: number) => api.delete(`/admin/provider-sets/${id}`),
  
  getStats: () => api.get<{ stats: ProviderSetStats }>('/admin/provider-sets/stats')
};

export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }),
  
  register: (userData: {
    email: string;
    password: string;
    username: string;
    first_name: string;
    last_name: string;
    company_name?: string;
  }) => api.post<AuthResponse>('/auth/register', userData),
  
  getProfile: () => api.get<ProfileResponse>('/auth/profile'),
  
  updateProfile: (userData: any) => api.put('/auth/profile', userData),
  
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/auth/change-password', { currentPassword, newPassword }),
  
  // Admin endpoints
  getUsers: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get('/auth/users', { params }),
  
  getUser: (userId: number) => api.get(`/auth/users/${userId}`),
  
  updateUser: (userId: number, userData: any) => api.put(`/auth/users/${userId}`, userData),
  
  deleteUser: (userId: number) => api.delete(`/auth/users/${userId}`)
};

// Users API
export const usersApi = {
  getAll: (params?: any) => api.get('/users', { params }),
  getById: (id: number) => api.get(`/users/${id}`),
  create: (data: any) => api.post('/users', data),
  update: (id: number, data: any) => api.put(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
  getProfile: () => api.get<ProfileResponse>('/users/profile'),
  getStats: () => api.get<UserStatsResponse>('/users/stats'),
};

// Provider API
export const providerApi = {
  getProviderSets: (providerId: number, includeInactive?: boolean) => 
    api.get('/provider-sets', { params: { provider_id: providerId, include_inactive: includeInactive } }),
  
  getProviderSet: (providerSetId: number) => 
    api.get(`/provider-sets/${providerSetId}`),
  
  createProviderSet: (providerSetData: any) => 
    api.post('/provider-sets', providerSetData),
  
  updateProviderSet: (providerSetId: number, providerSetData: any) => 
    api.put(`/provider-sets/${providerSetId}`, providerSetData),
  
  deleteProviderSet: (providerSetId: number) => 
    api.delete(`/provider-sets/${providerSetId}`),
  
  getPaymentStats: () => api.get('/provider-payment-stats')
};

// Shop API for customers to see provider sets with pricing and availability
export const shopApi = {
  getShopSets: () => api.get<ShopSetsResponse>('/shop-sets'),
};

// AI Naming Helper API
export const aiNamingApi = {
  getSuggestions: async (type: 'part' | 'tool' | 'set', context: any, currentName?: string) => {
    const response = await api.post('/ai/naming/suggestions', {
      type,
      description: context.description || JSON.stringify(context),
      currentName
    });
    return response.data;
  },
  
  getGuidelines: async (type: 'part' | 'tool' | 'set') => {
    const response = await api.get(`/ai/naming/guidelines/${type}`);
    return response.data;
  }
};

// Inventory Management API
export interface InventoryPart {
  part_id: number;
  part_number: string;
  part_name: string;
  category: string;
  unit_of_measure: string;
  unit_cost: number;
  stock_quantity: number;
  minimum_stock_level: number;
  supplier?: string;
  supplier_part_number?: string;
  image_url?: string;
  inventory_value: number;
  is_low_stock: boolean;
  is_out_of_stock: boolean;
}

export interface InventoryTransaction {
  transaction_id: number;
  part_id: number;
  transaction_type: 'add' | 'remove' | 'set' | 'income';
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reason?: string;
  notes?: string;
  supplier?: string;
  cost_per_unit?: number;
  purchase_date?: string;
  created_at: string;
  part_number: string;
  part_name: string;
}

export interface InventorySummary {
  total_parts: number;
  total_stock: number;
  total_value: number;
  low_stock_count: number;
  out_of_stock_count: number;
}

export const inventoryApi = {
  getParts: () => api.get<{ parts: InventoryPart[] }>('/inventory/parts'),
  adjustStock: (partId: number, data: {
    adjustment_type: 'add' | 'remove' | 'set';
    quantity: number;
    reason?: string;
    notes?: string;
  }) => api.post(`/inventory/parts/${partId}/adjust`, data),
  addIncome: (partId: number, data: {
    quantity: number;
    supplier?: string;
    cost_per_unit?: number;
    purchase_date?: string;
    notes?: string;
  }) => api.post(`/inventory/parts/${partId}/income`, data),
  getHistory: (partId: number, params?: { limit?: number; offset?: number }) => 
    api.get<{ transactions: InventoryTransaction[] }>(`/inventory/parts/${partId}/transactions`, { params }),
  getSummary: () => api.get<InventorySummary>('/inventory/summary'),
};

export const creditsApi = {
  getBalance: () => api.get('/user-credits'),
  getTransactions: () => api.get('/user-credits/transactions'),
  getShareStats: () => api.get('/social-shares/stats'),
  claimReward: () => api.post('/social-shares/claim-reward'),
};

export const cartReservationApi = {
  reserve: (data: { set_id: number; quantity: number }) => api.post('/cart/reserve', data),
  releaseAll: () => api.delete('/cart/reservations'),
};

// Request interceptor to add auth token
api.interceptors.request.use(
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

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
