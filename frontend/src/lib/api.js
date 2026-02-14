import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
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

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  getMe: () => api.get('/auth/me'),
};

// Shops API
export const shopsAPI = {
  getAll: () => api.get('/shops'),
  create: (data) => api.post('/shops', data),
  getById: (id) => api.get(`/shops/${id}`),
};

// Products API
export const productsAPI = {
  getAll: (shopId) => api.get('/products', { params: { shop_id: shopId } }),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
};

// Batches/Stock API
export const batchesAPI = {
  getAll: (productId) => api.get('/batches', { params: { product_id: productId } }),
  create: (data) => api.post('/batches', data),
  update: (id, data) => api.put(`/batches/${id}`, data),
  delete: (id) => api.delete(`/batches/${id}`),
  generateQR: (id) => api.post(`/batches/${id}/generate-qr`),
};

// Sales API
export const salesAPI = {
  getAll: (shopId) => api.get('/sales', { params: { shop_id: shopId } }),
  create: (data) => api.post('/sales', data),
  delete: (id) => api.delete(`/sales/${id}`),
};

// Employees API
export const employeesAPI = {
  getAll: (shopId) => api.get('/employees', { params: { shop_id: shopId } }),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`),
};

// Documents API
export const documentsAPI = {
  getAll: (employeeId) => api.get('/documents', { params: { employee_id: employeeId } }),
  sign: (id) => api.put(`/documents/${id}/sign`),
  downloadPDF: (id) => api.get(`/documents/${id}/pdf`, { responseType: 'blob' }),
};

// AI API
export const aiAPI = {
  generateContract: (employeeId) => api.post('/ai/contract', { employee_id: employeeId }),
  generateWorkAttestation: (employeeId) => api.post('/ai/attestation-work', { employee_id: employeeId }),
  generateStageAttestation: (employeeId) => api.post('/ai/attestation-stage', { employee_id: employeeId }),
  generateProductAd: (data) => api.post('/ai/product-ad', data),
  generateJobOffer: (data) => api.post('/ai/job-offer', data),
  getHelp: (question) => api.post('/ai/help', { question }),
};

// Accounts API
export const accountsAPI = {
  getAll: (shopId) => api.get('/accounts', { params: { shop_id: shopId } }),
};

// Payments API (Mock)
export const paymentsAPI = {
  initiateOrange: (amount, phone) => api.post('/payments/orange/initiate', { amount, phone }),
  confirmOrange: (transactionId) => api.post('/payments/orange/confirm', { transaction_id: transactionId }),
  processCard: (amount) => api.post('/payments/card', { amount }),
};

// WhatsApp/SMS API (Mock)
export const messagingAPI = {
  sendWhatsApp: (phone, saleId) => api.post('/whatsapp/send-receipt', { phone, sale_id: saleId }),
  sendSMS: (phone, saleId) => api.post('/sms/send-receipt', { phone, sale_id: saleId }),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
};

export default api;
