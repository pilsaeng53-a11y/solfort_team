// base44Client.js - Neon API 완전 프록시
// base44 SDK를 사용하는 모든 파일이 자동으로 Neon API를 사용하게 됨

const API = 'https://solfort-api-9red.onrender.com';
const getToken = () => localStorage.getItem('sf_token');
const h = () => ({ 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() });
const kst = (d) => d ? new Date(d).toLocaleString('ko-KR', {timeZone:'Asia/Seoul'}) : '-';

const req = async (method, path, body, params) => {
  const url = new URL(API + path);
  if (params) Object.entries(params).forEach(([k,v]) => v != null && v !== '' && url.searchParams.set(k, v));
  const res = await fetch(url, { method, headers: h(), body: body ? JSON.stringify(body) : undefined });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'API Error');
  return data;
};

// 엔티티 팩토리 - 각 엔티티 타입에 맞는 API 경로 매핑
const makeEntity = (apiPath, extraCreate = {}) => ({
  list: (sort, limit, filters) => req('GET', apiPath, null, filters),
  filter: (filters) => req('GET', apiPath, null, filters),
  get: (id) => req('GET', apiPath + '/' + id),
  create: (data) => req('POST', apiPath, {...data, ...extraCreate}),
  update: (id, data) => req('PUT', apiPath + '/' + id, data),
  delete: (id) => req('PUT', apiPath + '/' + id, {status:'deleted'}),
});

// base44.entities 완전 모사
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
  // 추가 엔티티들
  User: {
    me: () => {
      const u = localStorage.getItem('sf_user');
      return u ? JSON.parse(u) : null;
    },
    list: (sort, limit) => req('GET', '/api/users'),
    get: (id) => req('GET', '/api/users/' + id),
    update: (id, data) => req('PUT', '/api/users/' + id, data),
  },
};

// Auth 헬퍼
const auth = {
  currentUser: () => {
    const u = localStorage.getItem('sf_user');
    return u ? JSON.parse(u) : null;
  },
  login: async (username, password) => {
    const res = await fetch(API + '/api/auth/login', {
      method:'POST', headers:{'Content-Type':'application/json'},
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

// base44 객체 - 기존 코드와 완전 호환
export const base44 = {
  entities,
  auth,
  api: API,
};

export default base44;

// 추가 export들 (기존 코드 호환)
export { entities, auth };
export const getCurrentUser = auth.currentUser;
export const getToken = auth.getToken;
