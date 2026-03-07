import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};

// Properties
export const propertiesApi = {
  getAll: () => api.get('/properties'),
  getOne: (id) => api.get(`/properties/${id}`),
  create: (data) => api.post('/properties', data),
  update: (id, data) => api.put(`/properties/${id}`, data),
  delete: (id) => api.delete(`/properties/${id}`),
};

// Rooms
export const roomsApi = {
  getAll: (propertyId) => api.get('/rooms', { params: { property_id: propertyId } }),
  getOne: (id) => api.get(`/rooms/${id}`),
  create: (data) => api.post('/rooms', data),
  update: (id, data) => api.put(`/rooms/${id}`, data),
  delete: (id) => api.delete(`/rooms/${id}`),
};

// Residents
export const residentsApi = {
  getAll: (params) => api.get('/residents', { params }),
  getOne: (id) => api.get(`/residents/${id}`),
  create: (data) => api.post('/residents', data),
  update: (id, data) => api.put(`/residents/${id}`, data),
  delete: (id) => api.delete(`/residents/${id}`),
};

// Payments
export const paymentsApi = {
  getAll: (params) => api.get('/payments', { params }),
  getOne: (id) => api.get(`/payments/${id}`),
  create: (data) => api.post('/payments', data),
  update: (id, data) => api.put(`/payments/${id}`, data),
  generateInvoice: (residentId, month) => api.post(`/payments/generate-invoice/${residentId}?month=${month}`),
};

// Complaints
export const complaintsApi = {
  getAll: (params) => api.get('/complaints', { params }),
  getOne: (id) => api.get(`/complaints/${id}`),
  create: (data) => api.post('/complaints', data),
  update: (id, data) => api.put(`/complaints/${id}`, data),
  delete: (id) => api.delete(`/complaints/${id}`),
};

// Staff
export const staffApi = {
  getAll: (propertyId) => api.get('/staff', { params: { property_id: propertyId } }),
  getOne: (id) => api.get(`/staff/${id}`),
  create: (data) => api.post('/staff', data),
  update: (id, data) => api.put(`/staff/${id}`, data),
  delete: (id) => api.delete(`/staff/${id}`),
};

// Notices
export const noticesApi = {
  getAll: () => api.get('/notices'),
  getOne: (id) => api.get(`/notices/${id}`),
  create: (data) => api.post('/notices', data),
  update: (id, data) => api.put(`/notices/${id}`, data),
  delete: (id) => api.delete(`/notices/${id}`),
};

// Settings
export const settingsApi = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
};

// Dashboard
export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
  getRevenueChart: () => api.get('/dashboard/revenue-chart'),
  getOccupancyChart: () => api.get('/dashboard/occupancy-chart'),
  getRecentPayments: () => api.get('/dashboard/recent-payments'),
  getRecentComplaints: () => api.get('/dashboard/recent-complaints'),
};

// Reports
export const reportsApi = {
  getRevenue: (params) => api.get('/reports/revenue', { params }),
  getOccupancy: () => api.get('/reports/occupancy'),
  getOutstandingDues: () => api.get('/reports/outstanding-dues'),
  getMaintenance: () => api.get('/reports/maintenance'),
  exportCsv: (type) => `${API_URL}/api/reports/export/csv/${type}`,
  exportPdf: (type) => `${API_URL}/api/reports/export/pdf/${type}`,
};

// Seed Data
export const seedData = () => api.post('/seed-data');

export default api;
