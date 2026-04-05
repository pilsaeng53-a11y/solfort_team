export const Auth = {
  getToken: () => localStorage.getItem('sf_token'),
  getRole: () => localStorage.getItem('sf_role'),
  getDealerName: () => localStorage.getItem('sf_dealer_name'),
  getAssignedDealer: () => localStorage.getItem('sf_assigned_dealer') || '',
  getUserId: () => localStorage.getItem('sf_user_id'),
  isLoggedIn: () => !!localStorage.getItem('sf_token'),
  isDealer: () => localStorage.getItem('sf_role') === 'dealer',
  isCallTeam: () => localStorage.getItem('sf_role') === 'call_team',
  isDealerAdmin: () => localStorage.getItem('sf_role') === 'dealer_admin',
  isCallAdmin: () => localStorage.getItem('sf_role') === 'call_admin',
  isSuperAdmin: () => localStorage.getItem('sf_role') === 'super_admin',
  isManager: () => localStorage.getItem('sf_role') === 'manager',
  isAdmin: () => ['dealer_admin','call_admin','super_admin'].includes(localStorage.getItem('sf_role')),
  getHomeRoute: () => {
    const role = localStorage.getItem('sf_role');
    if (role === 'dealer') return '/dashboard';
    if (role === 'call_team') return '/call';
    if (role === 'dealer_admin') return '/admin/dealer';
    if (role === 'call_admin') return '/admin/call';
    if (role === 'super_admin') return '/admin/super';
    if (role === 'manager') return '/manager';
    return '/';
  },
  login: (data) => {
    localStorage.setItem('sf_token', data.token);
    localStorage.setItem('sf_role', data.role);
    localStorage.setItem('sf_dealer_name', data.dealer_name || '');
    localStorage.setItem('sf_user_id', data.user_id || '');
  },
  logout: () => {
    ['sf_token','sf_role','sf_dealer_name','sf_user_id'].forEach(k => localStorage.removeItem(k));
    window.location.href = '/';
  },
  headers: () => ({
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + localStorage.getItem('sf_token')
  })
};