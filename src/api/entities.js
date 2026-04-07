const API = 'https://solfort-api-9red.onrender.com';
const getToken = () => localStorage.getItem('sf_token');
const h = () => ({ 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() });

const req = async (method, path, body, params) => {
  const url = new URL(API + path);
  if (params) Object.entries(params).forEach(([k,v]) => v != null && url.searchParams.set(k, v));
  const res = await fetch(url, { method, headers: h(), body: body ? JSON.stringify(body) : undefined });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error');
  return data;
};

// DealerInfo - 대리점/딜러 (role: dealer, dealer_admin)
export const DealerInfo = {
  list: (filters={}) => req('GET', '/api/users', null, filters),
  get: (id) => req('GET', '/api/users/' + id),
  create: (data) => req('POST', '/api/auth/register', data),
  update: (id, data) => req('PUT', '/api/users/' + id, data),
  filter: (filters={}) => req('GET', '/api/users', null, filters),
};

// CallTeamMember - 콜팀
export const CallTeamMember = {
  list: (filters={}) => req('GET', '/api/users', null, {...filters, role: filters.role || 'call_team'}),
  get: (id) => req('GET', '/api/users/' + id),
  create: (data) => req('POST', '/api/auth/register', {...data, role: 'call_team'}),
  update: (id, data) => req('PUT', '/api/users/' + id, data),
  filter: (filters={}) => req('GET', '/api/users', null, filters),
};

// OnlineTeamMember - 온라인팀
export const OnlineTeamMember = {
  list: (filters={}) => req('GET', '/api/users', null, {...filters, role: filters.role || 'online_team'}),
  get: (id) => req('GET', '/api/users/' + id),
  create: (data) => req('POST', '/api/auth/register', {...data, role: 'online_team'}),
  update: (id, data) => req('PUT', '/api/users/' + id, data),
  filter: (filters={}) => req('GET', '/api/users', null, filters),
};

// SalesRecord - 매출 기록
export const SalesRecord = {
  list: (filters={}) => req('GET', '/api/sales', null, filters),
  get: (id) => req('GET', '/api/sales/' + id),
  create: (data) => req('POST', '/api/sales', data),
  update: (id, data) => req('PUT', '/api/sales/' + id, data),
  filter: (filters={}) => req('GET', '/api/sales', null, filters),
};

// CallLead - 콜 리드
export const CallLead = {
  list: (filters={}) => req('GET', '/api/leads', null, filters),
  get: (id) => req('GET', '/api/leads/' + id),
  create: (data) => req('POST', '/api/leads', data),
  update: (id, data) => req('PUT', '/api/leads/' + id, data),
  filter: (filters={}) => req('GET', '/api/leads', null, filters),
};

// Notice - 공지사항
export const Notice = {
  list: (filters={}) => req('GET', '/api/notices', null, filters),
  get: (id) => req('GET', '/api/notices/' + id),
  create: (data) => req('POST', '/api/notices', data),
  filter: (filters={}) => req('GET', '/api/notices', null, filters),
};

// AttendanceLog - 출퇴근
export const AttendanceLog = {
  list: (filters={}) => req('GET', '/api/attendance', null, filters),
  create: (data) => req('POST', '/api/attendance', data),
  filter: (filters={}) => req('GET', '/api/attendance', null, filters),
};

// DailyJournal - 일지
export const DailyJournal = {
  list: (filters={}) => req('GET', '/api/journals', null, filters),
  create: (data) => req('POST', '/api/journals', data),
  filter: (filters={}) => req('GET', '/api/journals', null, filters),
};

// CustomerReview - 고객 만족도
export const CustomerReview = {
  list: (filters={}) => req('GET', '/api/reviews', null, filters),
  create: (data) => req('POST', '/api/reviews', data),
  filter: (filters={}) => req('GET', '/api/reviews', null, filters),
};

// IncentiveSetting - 인센티브
export const IncentiveSetting = {
  list: (filters={}) => req('GET', '/api/incentives', null, filters),
  create: (data) => req('POST', '/api/incentives', data),
  filter: (filters={}) => req('GET', '/api/incentives', null, filters),
};

// AuditLog - 감사 로그
export const AuditLog = {
  list: () => req('GET', '/api/audit'),
  create: (data) => req('POST', '/api/audit', data),
};

// SalesSettlement - 정산
export const SalesSettlement = {
  list: (filters={}) => req('GET', '/api/settlements', null, filters),
  update: (id, data) => req('PUT', '/api/settlements/' + id, data),
  filter: (filters={}) => req('GET', '/api/settlements', null, filters),
};

// CallScript - 스크립트
export const CallScript = {
  list: (filters={}) => req('GET', '/api/scripts', null, filters),
  create: (data) => req('POST', '/api/scripts', data),
  filter: (filters={}) => req('GET', '/api/scripts', null, filters),
};

// CallLog - 통화 기록 (간단)
export const CallLog = {
  list: (filters={}) => req('GET', '/api/leads', null, filters),
  create: (data) => req('POST', '/api/leads', data),
};

// Auth helper
export const getCurrentUser = () => {
  try { return JSON.parse(localStorage.getItem('sf_user')); } catch { return null; }
};
export { getToken };
export const logout = () => { localStorage.removeItem('sf_token'); localStorage.removeItem('sf_user'); };