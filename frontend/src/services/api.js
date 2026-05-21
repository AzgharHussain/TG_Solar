// frontend/src/services/api.js
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

// Request interceptor - attach token
api.interceptors.request.use((config) => {
  const auth = JSON.parse(localStorage.getItem('auth-storage') || '{}');
  const token = auth?.state?.token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor - handle 401
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error);
  }
);

// Auth
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),
  loginHistory: () => api.get('/auth/login-history'),
};

// Dashboard
export const dashboardAPI = {
  sarpanch: (params) => api.get('/dashboard/sarpanch', { params }),
  mandal: (params) => api.get('/dashboard/mandal', { params }),
  district: (params) => api.get('/dashboard/district', { params }),
  state: (params) => api.get('/dashboard/state', { params }),
  monthlyTrend: (params) => api.get('/dashboard/monthly-trend', { params }),
  districtSummary: (params) => api.get('/dashboard/district-summary', { params }),
};

// Households
export const householdsAPI = {
  list: (params) => api.get('/households', { params }),
  get: (id) => api.get(`/households/${id}`),
  create: (data) => api.post('/households', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, data) => api.put(`/households/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id, data) => api.delete(`/households/${id}`, { data }),
  applySolar: (id) => api.post(`/households/${id}/apply-solar`),
  markInstalled: (id, data) => api.post(`/households/${id}/mark-installed`, data),
  stats: (params) => api.get('/households/stats/village', { params }),
};

// Farmers
export const farmersAPI = {
  list: (params) => api.get('/farmers', { params }),
  get: (id) => api.get(`/farmers/${id}`),
  create: (data) => api.post('/farmers', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, data) => api.put(`/farmers/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id) => api.delete(`/farmers/${id}`),
  applyPump: (id, data) => api.post(`/farmers/${id}/apply-pump`, data),
  markInstalled: (id, data) => api.post(`/farmers/${id}/mark-installed`, data),
  stats: (params) => api.get('/farmers/stats/village', { params }),
};

// Land Parcels
export const landAPI = {
  list: (params) => api.get('/land-parcels', { params }),
  get: (id) => api.get(`/land-parcels/${id}`),
  create: (data) => api.post('/land-parcels', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, data) => api.put(`/land-parcels/${id}`, data),
  delete: (id) => api.delete(`/land-parcels/${id}`),
};

// Applications
export const applicationsAPI = {
  list: (params) => api.get('/applications', { params }),
  get: (id) => api.get(`/applications/${id}`),
  updateStatus: (id, data) => api.put(`/applications/${id}/status`, data),
  stats: (params) => api.get('/applications/stats/overview', { params }),
};

// Villages
export const villagesAPI = {
  list: (params) => api.get('/villages', { params }),
  mapData: (village_id) => api.get(`/villages/map-data/${village_id}`),
  update: (id, data) => api.put(`/villages/${id}`, data),
};

// SHG
export const shgAPI = {
  list: (params) => api.get('/shg', { params }),
  get: (id) => api.get(`/shg/${id}`),
  create: (data) => api.post('/shg', data),
  update: (id, data) => api.put(`/shg/${id}`, data),
  addCollection: (id, data) => api.post(`/shg/${id}/collections`, data),
  addExpense: (id, data) => api.post(`/shg/${id}/expenses`, data),
};

// Complaints
export const complaintsAPI = {
  list: (params) => api.get('/complaints', { params }),
  get: (id) => api.get(`/complaints/${id}`),
  create: (data) => api.post('/complaints', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, data) => api.put(`/complaints/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

// Reports
export const reportsAPI = {
  householdRegister: (params) => api.get('/reports/household-register', { params }),
  farmerRegister: (params) => api.get('/reports/farmer-register', { params }),
  coverage: (params) => api.get('/reports/coverage', { params }),
  qr: (type, id) => api.get(`/reports/qr/${type}/${id}`),
  templateHouseholds: () => `${API_BASE}/reports/templates/households`,
  templateFarmers: () => `${API_BASE}/reports/templates/farmers`,
  householdExcel: (params) => `${API_BASE}/reports/household-register?format=excel&village_id=${params.village_id}`,
  farmerExcel: (params) => `${API_BASE}/reports/farmer-register?format=excel&village_id=${params.village_id}`,
};

// Notifications
export const notificationsAPI = {
  list: () => api.get('/notifications'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

// SMS
export const smsAPI = {
  logs: (params) => api.get('/sms/logs', { params }),
  templates: () => api.get('/sms/templates'),
  updateTemplate: (id, data) => api.put(`/sms/templates/${id}`, data),
  send: (data) => api.post('/sms/send', data),
};

// Mandal
export const mandalAPI = {
  villages: (params) => api.get('/mandal/villages', { params }),
  pendingApplications: (params) => api.get('/mandal/applications/pending', { params }),
};

// District
export const districtAPI = {
  mandals: (params) => api.get('/district/mandals', { params }),
  vendors: () => api.get('/district/vendors'),
  schemes: () => api.get('/district/schemes'),
};

// State
export const stateAPI = {
  districts: () => api.get('/state/districts'),
  vendors: () => api.get('/state/vendors'),
  createVendor: (data) => api.post('/state/vendors', data),
  updateVendor: (id, data) => api.put(`/state/vendors/${id}`, data),
  schemes: () => api.get('/state/schemes'),
  createScheme: (data) => api.post('/state/schemes', data),
};

// Settings
export const settingsAPI = {
  getVillage: (params) => api.get('/settings/village', { params }),
  updateVillage: (data) => api.put('/settings/village', data),
  getUsers: () => api.get('/settings/users'),
  createUser: (data) => api.post('/settings/users', data),
  updateUser: (id, data) => api.put(`/settings/users/${id}`, data),
  auditLogs: () => api.get('/settings/audit-logs'),
};

export default api;
