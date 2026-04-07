const API_URL = 'https://solfort-api-9red.onrender.com';

const getToken = () => localStorage.getItem('sf_token');

const api = {
  get: async (path, params = {}) => {
    const url = new URL(API_URL + path);
    Object.entries(params).forEach(([k,v]) => v && url.searchParams.set(k, v));
    const res = await fetch(url, { headers: { 'Authorization': 'Bearer ' + getToken() } });
    if (!res.ok) throw new Error((await res.json()).error || 'API Error');
    return res.json();
  },
  post: async (path, body) => {
    const res = await fetch(API_URL + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error((await res.json()).error || 'API Error');
    return res.json();
  },
  put: async (path, body) => {
    const res = await fetch(API_URL + path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error((await res.json()).error || 'API Error');
    return res.json();
  }
};

export default api;
export { API_URL };