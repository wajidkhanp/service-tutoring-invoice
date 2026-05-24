import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

const auth = axios.create({
  baseURL: '/auth',
  withCredentials: true,
});

function redirectToLogin() {
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) redirectToLogin();
    return Promise.reject(err);
  }
);

auth.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config.url.includes('/login')) redirectToLogin();
    return Promise.reject(err);
  }
);

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
export const getMonthAttendance = (year, month) => api.get('/attendance', { params: { year, month } });
export const getStudentAttendance = (studentId, year) => api.get(`/attendance/student/${studentId}`, { params: year ? { year } : {} });
export const saveAttendance = (date, records) => api.post('/attendance', { date, records });
export const confirmAllPresent = (date) => api.post(`/attendance/${date}/confirm`);
export const clearAttendanceEntry = (date, studentId) => api.delete(`/attendance/${date}/${studentId}`);
export const getReportCards = (params = {}) => api.get('/reportcards', { params });
export const getReportCardMonths = () => api.get('/reportcards/months');
export const getReportCard = (id) => api.get(`/reportcards/${id}`);
export const createReportCard = (payload) => api.post('/reportcards', payload);
export const bulkCreateReportCards = (payload) => api.post('/reportcards/bulk', payload);
export const updateReportCard = (id, payload) => api.put(`/reportcards/${id}`, payload);
export const deleteReportCard = (id) => api.delete(`/reportcards/${id}`);
export const downloadReportCardPdf = (id) => api.get(`/reportcards/${id}/pdf`, { responseType: 'blob' });
export const emailReportCard = (id) => api.post(`/reportcards/${id}/email`);
export const getDailyProgress = (date, studentId) => api.get('/daily-progress', { params: { date, studentId } });
export const saveDailyProgress = (date, studentId, progress) => api.post('/daily-progress', { date, studentId, progress });
export const clearDailyProgress = (date, studentId) => api.delete(`/daily-progress/${date}/${studentId}`);
export const getDailyProgressSummary = (year, month, studentId) => api.get('/daily-progress/summary', { params: { year, month, studentId } });
export const getStudentYearProgress = (studentId, year) => api.get('/daily-progress/year', { params: { studentId, year } });
export const getMonthHolidays = (year, month) => api.get('/holidays', { params: { year, month } });
export const toggleHoliday = (date) => api.post('/holidays', { date });
export const getAuditRecent = () => api.get('/audit/recent');
export const getAuditAll = () => api.get('/audit/all');
export const getSettings = () => api.get('/settings');
export const updateSettings = (data) => api.put('/settings', data);
export const uploadSignature = (formData) => api.post('/settings/signature', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
export const deleteSignature = () => api.delete('/settings/signature');

export default api;
