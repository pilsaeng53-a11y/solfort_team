import { useState, useEffect } from 'react';
import { base44 } from '@/api/neonClient';
import SFCard from '@/components/SFCard';
import { Trash2 } from 'lucide-react';

export default function ManagerAccountPanel() {
  const [dealers, setDealers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', username: '', password: '', selectedDealer: '' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.DealerInfo.filter({ status: 'active' }, '-created_date', 500),
      base44.entities.DealerInfo.filter({ role: 'manager' }, '-created_date', 200),
    ]).then(([d, m]) => {
      setDealers(d);
      setManagers(m);
      setLoading(false);
    });
  }, []);

  const handleForm = k => e => {
    setForm(p => ({ ...p, [k]: e.target.value }));
  };

  const handleCreate = async () => {
    if (!form.name || !form.username || !form.password || !form.selectedDealer) {
      alert('모든 필수항목을 입력해주세요.');
      return;
    }

    const duplicate = managers.find(m => m.username === form.username);
    if (duplicate) {
      alert('이미 사용 중인 아이디입니다.');
      return;
    }

    setSaving(true);
    try {
      const newManager = await base44.entities.DealerInfo.create({
        dealer_name: '매니저_' + form.name,
        owner_name: form.name,
        username: form.username,
        password: form.password,
        role: 'manager',
        status: 'active',
        assigned_dealer: form.selectedDealer,
        region: '',
      });
      setManagers(prev => [...prev, newManager]);
      setForm({ name: '', username: '', password: '', selectedDealer: '' });
      alert('매니저 계정이 생성되었습니다.');
    } catch (e) {
      alert('생성 중 오류: ' + e.message);
    }
    setSaving(false);
  };

  const handleDelete = async (managerId) => {
    if (!window.confirm('이 매니저 계정을 삭제하시겠습니까?')) return;
    setDeleting(managerId);
    try {
      await base44.entities.DealerInfo.delete(managerId);
      setManagers(prev => prev.filter(m => m.id !== managerId));
    } catch (e) {
      alert('삭제 중 오류: ' + e.message);
    }
    setDeleting(null);
  };

  if (loading) {
    return <div className="text-center py-12"><div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto" /></div>;
  }

  const activeDealers = dealers.filter(d => d.status === 'active' && d.role !== 'manager');

  return (
    <div className="space-y-6">
      {/* Create Manager */}
      <SFCard>
        <h3 className="text-sm font-semibold text-white mb-4">🔑 매니저 계정 생성</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">이름 <span className="text-red-400">*</span></label>
            <input value={form.name} onChange={handleForm('name')} placeholder="예: 박매니저"
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">아이디 <span className="text-red-400">*</span></label>
              <input value={form.username} onChange={handleForm('username')} placeholder="영문/숫자"
                className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">비밀번호 <span className="text-red-400">*</span></label>
              <input type="password" value={form.password} onChange={handleForm('password')} placeholder="4자 이상"
                className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs placeholder:text-gray-600" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">담당 대리점 <span className="text-red-400">*</span></label>
            <select value={form.selectedDealer} onChange={handleForm('selectedDealer')}
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs">
              <option value="">선택</option>
              {activeDealers.map(d => (
                <option key={d.id} value={d.dealer_name}>{d.dealer_name} ({d.owner_name})</option>
              ))}
            </select>
          </div>
          <button onClick={handleCreate} disabled={saving}
            className="w-full py-2.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold hover:bg-amber-500/30 disabled:opacity-40 transition-all">
            {saving ? '생성 중...' : '🔑 매니저 계정 생성'}
          </button>
        </div>
      </SFCard>

      {/* Manager List */}
      <SFCard>
        <h3 className="text-sm font-semibold text-white mb-4">활성 매니저 ({managers.length})</h3>
        {managers.length === 0 ? (
          <p className="text-xs text-gray-600 text-center py-8">매니저 계정이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-gray-500 border-b border-white/[0.06]">
                {['이름', '아이디', '담당대리점', '계정명', '액션'].map(h => (
                  <th key={h} className="text-left py-3 px-2 font-medium">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {managers.map(m => (
                  <tr key={m.id} className="border-b border-white/[0.04]">
                    <td className="py-3 px-2 text-white font-medium">{m.owner_name}</td>
                    <td className="py-3 px-2 text-gray-400">{m.username}</td>
                    <td className="py-3 px-2 text-amber-400">{m.assigned_dealer}</td>
                    <td className="py-3 px-2 text-gray-500">{m.dealer_name}</td>
                    <td className="py-3 px-2">
                      <button onClick={() => handleDelete(m.id)} disabled={deleting === m.id}
                        className="flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 rounded text-[10px] hover:bg-red-500/30 disabled:opacity-50 transition-all">
                        <Trash2 className="h-3 w-3" /> 삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SFCard>
    </div>
  );
}