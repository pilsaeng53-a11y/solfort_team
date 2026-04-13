// Neon API 직접 연결 (Base44 완전 제거)
import { base44 as _b44 } from './base44Client.js';

const NEON_API = 'https://solfort-api-9red.onrender.com';

const _getToken = () => localStorage.getItem('sf_token');

const _headers = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${_getToken()}`
});

const _request = async (method, path, body) => {
  const url = `${NEON_API}${path}`;
  
  const options = {
    method,
    headers: _headers()
  };
  
  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }
  
  const res = await fetch(url, options);
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }
  
  return res.json();
};

// Auth
export const Auth = {
  currentUser: async () => {
    const token = _getToken();
    if (!token) return null;
    
    try {
      return await _request('GET', '/api/users/me');
    } catch (error) {
      localStorage.removeItem('sf_token');
      localStorage.removeItem('sf_role');
      localStorage.removeItem('sf_user');
      return null;
    }
  },
  
  login: async (username, password) => {
    const res = await _request('POST', '/api/auth/login', { username, password });
    
    if (res.token) {
      localStorage.setItem('sf_token', res.token);
      localStorage.setItem('sf_role', res.user.role);
      localStorage.setItem('sf_user', JSON.stringify(res.user));
    }
    
    return res;
  },
  
  logout: () => {
    localStorage.removeItem('sf_token');
    localStorage.removeItem('sf_role');
    localStorage.removeItem('sf_user');
  },
  
  isLoggedIn: () => !!_getToken(),
  getToken: _getToken,
  getRole: () => localStorage.getItem('sf_role'),
  getDealerName: () => localStorage.getItem('sf_dealer_name') || localStorage.getItem('sf_user') && JSON.parse(localStorage.getItem('sf_user')).dealer_name || '',
  getUserId: () => {
    const user = localStorage.getItem('sf_user');
    return user ? JSON.parse(user).id : null;
  }
};

// Users
export const Users = {
  list: () => _request('GET', '/api/users'),
  get: (id) => _request('GET', `/api/users/${id}`),
  update: (id, data) => _request('PUT', `/api/users/${id}`, data),
  me: () => _request('GET', '/api/users/me')
};

// Sales
export const Sales = {
  list: () => _request('GET', '/api/sales'),
  create: (data) => _request('POST', '/api/sales', data),
  approve: (id) => _request('PUT', `/api/sales/${id}/approve`),
  reject: (id) => _request('PUT', `/api/sales/${id}/reject`)
};

// Leads
export const Leads = {
  list: () => _request('GET', '/api/leads'),
  create: (data) => _request('POST', '/api/leads', data),
  update: (id, data) => _request('PUT', `/api/leads/${id}`, data)
};

// Notices
export const Notices = {
  list: () => _request('GET', '/api/notices'),
  create: (data) => _request('POST', '/api/notices', data)
};

// Events  
export const Events = {
  list: () => _request('GET', '/api/events'),
  create: (data) => _request('POST', '/api/events', data),
  update: (id, data) => _request('PUT', `/api/events/${id}`, data),
  delete: (id) => _request('DELETE', `/api/events/${id}`)
};

// Incentives
export const Incentives = {
  list: () => _request('GET', '/api/incentives'),
  create: (data) => _request('POST', '/api/incentives', data),
  update: (id, data) => _request('PUT', `/api/incentives/${id}`, data)
};

// Audit Logs
export const AuditLogs = {
  list: () => _request('GET', '/api/audit'),
  create: (data) => _request('POST', '/api/audit', data)
};

// Attendance
export const Attendance = {
  list: () => _request('GET', '/api/attendance'),
  create: (data) => _request('POST', '/api/attendance', data)
};

// Reviews
export const Reviews = {
  list: () => _request('GET', '/api/reviews'),
  create: (data) => _request('POST', '/api/reviews', data)
};

// Settlements
export const Settlements = {
  list: () => _request('GET', '/api/settlements'),
  update: (id, data) => _request('PUT', `/api/settlements/${id}`, data)
};

// base44 compat export
export const base44 = _b44;
export default _b44;