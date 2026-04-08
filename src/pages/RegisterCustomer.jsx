import { useState } from "react";
import { useNavigate } from "react-router-dom";
const API = 'https://solfort-api-9red.onrender.com';
const h = () => ({'Content-Type':'application/json','Authorization':'Bearer '+localStorage.getItem('sf_token')});

export default function RegisterCustomer() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('sf_user')||'{}');
  const [form, setForm] = useState({customer_name:'',phone:'',amount:'',wallet_address:'',memo:''});
  const [loading, setLoading] = useState(false);
  const [dupWarning, setDupWarning] = useState(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const checkDuplicate = async () => {
    if(!form.phone) return false;
    const res = await fetch(API+'/api/sales?phone='+encodeURIComponent(form.phone), {headers:h()});
    const data = await res.json();
    if(Array.isArray(data) && data.length > 0) {
      setDupWarning(data.length);
      return true;
    }
    return false;
  };

  const doSubmit = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(API+'/api/sales', {
        method:'POST', headers:h(),
        body: JSON.stringify({
          customer_name: form.customer_name,
          phone: form.phone,
          amount: Number(form.amount.replace(/[^0-9]/g,'')),
          wallet_address: form.wallet_address,
          memo: form.memo,
          dealer_id: user.id,
          dealer_name: user.name || user.username,
          source: 'direct',
        })
      });
      const data = await res.json();
      if(!res.ok) throw new Error(data.error);
      setSuccess(true);
      setDupWarning(null);
      setForm({customer_name:'',phone:'',amount:'',wallet_address:'',memo:''});
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if(!form.customer_name||!form.phone||!form.amount) { setError('이름, 연락처, 금액은 필수입니다'); return; }
    const isDup = await checkDuplicate();
    if(!isDup) await doSubmit();
  };

  return (
    <div className="min-h-screen bg-[#080a12] p-4 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={()=>navigate(-1)} className="text-gray-500 hover:text-white">←</button>
        <h1 className="text-lg font-bold text-white">고객 매출 등록</h1>
      </div>

      {success && (
        <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center">
          <p className="text-emerald-400 font-bold">✅ 등록 완료!</p>
        </div>
      )}

      {dupWarning && (
        <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <p className="text-amber-400 font-bold text-sm">⚠️ 이미 등록된 연락처입니다 ({dupWarning}건)</p>
          <p className="text-gray-400 text-xs mt-1">계속 등록하시겠습니까?</p>
          <div className="flex gap-2 mt-3">
            <button onClick={doSubmit} className="flex-1 py-2 bg-amber-500/20 text-amber-400 rounded-lg text-xs font-bold">계속 등록</button>
            <button onClick={()=>setDupWarning(null)} className="flex-1 py-2 bg-white/5 text-gray-400 rounded-lg text-xs">취소</button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {[
          {key:'customer_name', label:'고객 이름 *', placeholder:'홍길동'},
          {key:'phone', label:'연락처 *', placeholder:'010-0000-0000'},
          {key:'amount', label:'매출 금액 *', placeholder:'1000000'},
          {key:'wallet_address', label:'지갑 주소', placeholder:'0x...'},
          {key:'memo', label:'메모', placeholder:'비고 사항'},
        ].map(({key, label, placeholder}) => (
          <div key={key}>
            <label className="text-xs text-gray-400 mb-1 block">{label}</label>
            <input
              value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))}
              placeholder={placeholder}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        ))}
        
        {error && <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
        
        <button
          onClick={handleSubmit} disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-emerald-600 to-blue-600 text-white font-bold rounded-xl text-sm disabled:opacity-60"
        >
          {loading ? '등록 중...' : '✅ 매출 등록'}
        </button>
        
        <button onClick={()=>navigate('/my-sales-excel')}
          className="w-full py-2.5 bg-white/5 border border-white/10 text-gray-400 rounded-xl text-xs hover:text-white transition-colors">
          📊 내 매출 엑셀 다운로드
        </button>
      </div>
    </div>
  );
}