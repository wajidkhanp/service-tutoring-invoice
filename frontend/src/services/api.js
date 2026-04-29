import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

const auth = axios.create({
  baseURL: '/auth',
  withCredentials: true,
});

export const getMe = () => auth.get('/me');
export const login = (userId, password) => auth.post('/login', { userId, password });
export const logout = () => auth.post('/logout');
export const getStudents = () => api.get('/students');
export const createStudent = (student) => api.post('/students', student);
export const updateStudent = (studentId, payload) => api.put(`/students/${studentId}`, payload);
export const deleteStudent = (studentId) => api.delete(`/students/${studentId}`);
export const getInvoices = (params = {}) => api.get('/invoices', { params });
export const createInvoice = (invoice) => api.post('/invoices/generate', invoice);
export const generateAllInvoices = (payload) => api.post('/invoices/generate-all', payload);
export const downloadInvoiceZip = (year, month) => api.get(`/invoices/zip/${year}/${month}`, { responseType: 'blob' });
export const emailInvoice = (invoiceNumber) => api.post(`/invoices/${invoiceNumber}/email`);
export const exportCsv = (params = {}) => api.get('/invoices/export/csv', { params, responseType: 'blob' });
export const getAuditRecent = () => api.get('/audit/recent');
export const getAuditAll = () => api.get('/audit/all');
export const getSettings = () => api.get('/settings');
export const updateSettings = (data) => api.put('/settings', data);
export const uploadSignature = (formData) => api.post('/settings/signature', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
export const deleteSignature = () => api.delete('/settings/signature');

export default api;
