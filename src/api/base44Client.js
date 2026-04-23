// base44Client.js - Neon API 완전 프록시
// 이 파일 하나로 base44 SDK 호출 59개 파일 전부 자동 해결

const NEON_API = 'https://solfort-api-9red.onrender.com';
const _getAuthToken = () => localStorage.getItem('sf_token');
const _headers = () => ({
  'Content-Type': 'application/json',
  'Authorization': 'Bearer ' + _getAuthToken()
});

const _req = async (method, path, body, params) => {
  const token = _getAuthToken();
  if (!token) return Array.isArray([]) ? [] : {};
  const url = new URL(NEON_API + path);
  if (params) Object.entries(params).forEach(([k,v]) => {
    if (v != null && v !== '') url.searchParams.set(k, v);
  });
  const res = await fetch(url, {
    method,
    headers: _headers(),
    body: body ? JSON.stringify(body) : undefined
  });
  if (res.status === 401) {
    ['sf_token', 'sf_user', 'sf_role', 'sf_user_id'].forEach(k => localStorage.removeItem(k));
    window.location.href = '/';
    return;
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'API Error');
  return data;
};

const _makeEntity = (apiPath, extraCreate = {}) => ({
  list: (sort, limit, filters) => _req('GET', apiPath, null, filters),
  filter: (filters) => _req('GET', apiPath, null, filters),
  get: (id) => _req('GET', apiPath + '/' + id),
  create: (data) => _req('POST', apiPath, { ...data, ...extraCreate }),
  update: (id, data) => _req('PUT', apiPath + '/' + id, data),
  delete: (id) => _req('PUT', apiPath + '/' + id, { status: 'deleted' }),
});

const _entities = {
  DealerInfo: _makeEntity('/api/users'),
  CallTeamMember: _makeEntity('/api/users', { role: 'call_team' }),
  OnlineTeamMember: _makeEntity('/api/users', { role: 'online_team' }),
  SalesRecord: _makeEntity('/api/sales'),
  CallLead: _makeEntity('/api/leads'),
  Notice: _makeEntity('/api/notices'),
  AttendanceLog: _makeEntity('/api/attendance'),
  DailyJournal: _makeEntity('/api/journals'),
  CustomerReview: _makeEntity('/api/reviews'),
  IncentiveSetting: _makeEntity('/api/incentives'),
  AuditLog: _makeEntity('/api/audit'),
  SalesSettlement: _makeEntity('/api/settlements'),
  SettlementRecord: _makeEntity('/api/settlements'),
  SystemSettings: _makeEntity('/api/settings'),
  CallScript: _makeEntity('/api/scripts'),
  CallLog: _makeEntity('/api/leads'),
  User: {
    me: () => {
      try { return JSON.parse(localStorage.getItem('sf_user')); } catch { return null; }
    },
    list: () => _req('GET', '/api/users'),
    get: (id) => _req('GET', '/api/users/' + id),
    update: (id, data) => _req('PUT', '/api/users/' + id, data),
  },
};

const _auth = {
  currentUser: () => {
    try { return JSON.parse(localStorage.getItem('sf_user')); } catch { return null; }
  },
  me: () => {
    try { return JSON.parse(localStorage.getItem('sf_user')); } catch { return null; }
  },
  updateMe: async (data) => {
    const user = JSON.parse(localStorage.getItem('sf_user') || '{}');
    const res = await fetch(NEON_API + '/api/users/' + user.id, {
      method: 'PUT',
      headers: _headers(),
      body: JSON.stringify(data)
    });
    const updated = await res.json();
    if (!res.ok) throw new Error(updated.error || 'Update failed');
    const merged = { ...user, ...data };
    localStorage.setItem('sf_user', JSON.stringify(merged));
    return merged;
  },
  login: async (username, password) => {
    const res = await fetch(NEON_API + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    localStorage.setItem('sf_token', data.token);
    localStorage.setItem('sf_user', JSON.stringify(data.user));
    localStorage.setItem('sf_role', data.user.role);
    localStorage.setItem('sf_user_id', data.user.id);
    return data.user;
  },
  logout: () => {
    ['sf_token', 'sf_user', 'sf_role', 'sf_user_id'].forEach(k => localStorage.removeItem(k));
    window.location.href = '/';
  },
  isLoggedIn: () => !!localStorage.getItem('sf_token'),
  getToken: () => localStorage.getItem('sf_token'),
  getRole: () => localStorage.getItem('sf_role'),
  getUserId: () => localStorage.getItem('sf_user_id'),
};

// base44 메인 객체 (기존 코드: base44.entities.X, base44.auth.Y)
export const base44 = {
  entities: _entities,
  auth: _auth,
  api: NEON_API,
};

export default base44;

// 개별 export (기존 코드 호환)
export const entities = _entities;
export const auth = _auth;
export const getCurrentUser = _auth.currentUser;
export const getUserToken = _auth.getToken;