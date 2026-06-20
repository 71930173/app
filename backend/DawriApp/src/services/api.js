import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BASE_URL from '../config/api-config';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token')
        || await AsyncStorage.getItem('adminToken')
        || await AsyncStorage.getItem('staffToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Auth interceptor error:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      await AsyncStorage.multiRemove([
        'token', 'userType', 'user',
        'adminToken', 'adminData',
        'staffToken', 'staffData',
      ]);
    }
    return Promise.reject(error);
  }
);

export default api;

export const authAPI = {
  login: (credentials, type) => api.post(`/${type}/login`, credentials),
  signup: (data, type) => api.post(`/${type}/signup`, data),
  verify: () => api.get('/auth/verify'),
  guestSignup: (data) => api.post('/auth/guest/signup', data),
  guestLogin: (data) => api.post('/auth/guest/login', data),
  studentSignup: (data) => api.post('/auth/student/signup', data),
  studentLogin: (data) => api.post('/auth/student/login', data),
  staffLogin: (data) => api.post('/auth/staff/login', data),
  adminLogin: (data) => api.post('/auth/admin/login', data),
};

export const studentAPI = {
  getProfile: () => api.get('/student/profile'),
  updateProfile: (data) => api.put('/student/profile', data),
  getIssueTypes: () => api.get('/student/issue-types'),
  getAvailableStaff: (issueTypeId) => api.get('/student/available-staff', { params: { issueTypeId } }),
  createAppointment: (data) => api.post('/student/appointments', {
    staff_id: parseInt(data.staff_id),
    issue_type_id: parseInt(data.issue_type_id),
    description: data.description || '',
  }),
  getMyAppointments: () => api.get('/student/my-appointments'),
  getActiveAppointment: () => api.get('/student/active-appointment'),
  cancelAppointment: (id) => api.post(`/student/appointments/${id}/cancel`),
  getQueueStatus: (appointmentId) => api.get(`/student/queue-status/${appointmentId}`),
  getNotifications: () => api.get('/student/notifications'),
  markNotificationRead: (id) => api.put(`/student/notifications/${id}/read`),
};

export const guestAPI = {
  getProfile: () => api.get('/guest/profile'),
  updateProfile: (data) => api.put('/guest/profile', data),
  getIssueTypes: () => api.get('/guest/issue-types'),
  getAvailableStaff: (issueTypeId) => api.get('/guest/available-staff', { params: { issueTypeId } }),
  createAppointment: (data) => api.post('/guest/appointments', {
    staff_id: parseInt(data.staff_id),
    issue_type_id: parseInt(data.issue_type_id),
    description: data.description || '',
  }),
  getMyAppointments: () => api.get('/guest/my-appointments'),
  getActiveAppointment: () => api.get('/guest/active-appointment'),
  cancelAppointment: (id) => api.post(`/guest/appointments/${id}/cancel`),
  getQueueStatus: (appointmentId) => api.get(`/guest/queue-status/${appointmentId}`),
  getNotifications: () => api.get('/guest/notifications'),
  markNotificationRead: (id) => api.put(`/guest/notifications/${id}/read`),
};

export const staffAPI = {
  getMyQueue: () => api.get('/staff/my-queue'),
  serveNext: () => api.post('/staff/serve-next'),
  serveSpecific: (appointmentId) => api.post(`/staff/serve/${appointmentId}`),
  markServed: (appointmentId) => api.post(`/staff/mark-served/${appointmentId}`),
  cancelAppointment: (appointmentId, reason) => api.post(`/staff/cancel/${appointmentId}`, { reason }),
  resolveRemotely: (appointmentId, note) => api.post(`/staff/resolve-remotely/${appointmentId}`, { resolutionNote: note }),
  updateAvailability: (data) => api.put('/staff/availability', data),
  getMyStats: (period) => api.get(`/staff/stats?period=${period}`),
  getProfile: () => api.get('/staff/profile'),
  updateProfile: (data) => api.put('/staff/profile', data),
  getNotifications: () => api.get('/staff/notifications'),
};

export const adminAPI = {
  getDashboardStats: (period) => api.get(`/admin/dashboard?period=${period}`),
  getRecentActivity: (limit) => api.get(`/admin/recent-activity?limit=${limit}`),
  getAllStaff: () => api.get('/admin/staff'),
  createStaff: (data) => api.post('/admin/staff', data),
  updateStaff: (id, data) => api.put(`/admin/staff/${id}`, data),
  deleteStaff: (id) => api.delete(`/admin/staff/${id}`),
  updateStaffStatus: (id, status) => api.put(`/admin/staff/${id}/status`, { status }),
  getIssueTypes: () => api.get('/admin/issue-types'),
  createIssueType: (data) => api.post('/admin/issue-types', data),
  updateIssueType: (id, data) => api.put(`/admin/issue-types/${id}`, data),
  deleteIssueType: (id) => api.delete(`/admin/issue-types/${id}`),
  getPeakHours: (period) => api.get(`/admin/peak-hours?period=${period}`),
  getAnalytics: (period) => api.get(`/admin/analytics?period=${period}`),
  getStaffPerformance: () => api.get('/admin/staff-performance'),
  getSystemSettings: () => api.get('/admin/settings'),
  updateSystemSetting: (key, value) => api.put('/admin/settings', { key, value }),
  getNotifications: (limit) => api.get(`/admin/notifications?limit=${limit}`),
  markNotificationRead: (id) => api.put(`/admin/notifications/${id}/read`),
};
