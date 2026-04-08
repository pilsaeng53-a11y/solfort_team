// base44Client.js - Neon API 완전 프록시
// base44 SDK를 사용하는 모든 파일이 자동으로 Neon API를 사용하게 됨

const API = 'https://solfort-api-9red.onrender.com';

const getAuthToken = () => localStorage.getItem('sf_token');

const makeHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': 'Bearer ' + getAuthToken()
});

const apiReq = async (method, path, body, params) => {
  const url = new URL(API + path);
  if (params) Object.entries(params).forEach(([k,v]) => {
    if (v != null && v !== '') url.searchParams.set(k, String(v));
  });
  const res = await fetch(url, {
    method,
    headers: makeHeaders(),
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'API Error');
  return data;
};

// 엔티티 팩토리
const makeEntity = (apiPath, extraCreate) => ({
  list: (_sort, _limit, filters) => apiReq('GET', apiPath, null, filters),
  filter: (filters) => apiReq('GET', apiPath, null, filters),
  get: (id) => apiReq('GET', apiPath + '/' + id),
  create: (data) => apiReq('POST', apiPath, extraCreate ? {...data, ...extraCreate} : data),
  update: (id, data) => apiReq('PUT', apiPath + '/' + id, data),
  delete: (id) => apiReq('PUT', apiPath + '/' + id, {status:'deleted'}),
});

const entities = {
  DealerInfo: makeEntity('/api/users'),
  CallTeamMember: makeEntity('/api/users', {role:'call_team'}),
  OnlineTeamMember: makeEntity('/api/users', {role:'online_team'}),
  SalesRecord: makeEntity('/api/sales'),
  CallLead: makeEntity('/api/leads'),
  Notice: makeEntity('/api/notices'),
  AttendanceLog: makeEntity('/api/attendance'),
  DailyJournal: makeEntity('/api/journals'),
  CustomerReview: makeEntity('/api/reviews'),
  IncentiveSetting: makeEntity('/api/incentives'),
  AuditLog: makeEntity('/api/audit'),
  SalesSettlement: makeEntity('/api/settlements'),
  CallScript: makeEntity('/api/scripts'),
  CallLog: makeEntity('/api/leads'),
  User: {
    me: () => { try { return JSON.parse(localStorage.getItem('sf_user')); } catch { return null; } },
    list: () => apiReq('GET', '/api/users'),
    get: (id) => apiReq('GET', '/api/users/' + id),
    update: (id, data) => apiReq('PUT', '/api/users/' + id, data),
  },
};

const auth = {
  currentUser: () => { try { return JSON.parse(localStorage.getItem('sf_user')); } catch { return null; } },
  login: async (username, password) => {
    const res = await fetch(API + '/api/auth/login', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({username, password})
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
    ['sf_token','sf_user','sf_role','sf_user_id'].forEach(k => localStorage.removeItem(k));
    window.location.href = '/';
  },
  isLoggedIn: () => !!localStorage.getItem('sf_token'),
  getToken: () => localStorage.getItem('sf_token'),
  getRole: () => localStorage.getItem('sf_role'),
  getUserId: () => localStorage.getItem('sf_user_id'),
};

export const base44 = { entities, auth, api: API };
export default base44;
export { entities, auth };
export const getCurrentUser = auth.currentUser;
