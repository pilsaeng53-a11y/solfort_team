import { useState, useEffect } from "react";
const API = 'https://solfort-api-9red.onrender.com';
const h = () => ({'Content-Type':'application/json','Authorization':'Bearer '+localStorage.getItem('sf_token')});
const TABS = ["온라인팀 현황", "DB실적", "광고현황", "전체 현황"];

export default function OnlineDirector() {
  const [tab, setTab] = useState(0);
  useEffect(() => { document.title = "SolFort - 온라인디렉터"; }, []);
  return (
    <div className="min-h-screen bg-[#080a12]">
      <div className="flex items-center justify-between px-4 py-4 border-b border-purple-500/20">
        <h1 className="text-lg font-bold text-white">🌐 온라인 디렉터</h1>
        <button onClick={()=>{localStorage.clear();window.location.href='/';}} className="text-xs text-gray-500 hover:text-white">로그아웃</button>
      </div>
      <div className="flex overflow-x-auto gap-1 px-4 py-3 border-b border-white/[0.06]">
        {TABS.map((t,i)=>(
          <button key={i} onClick={()=>setTab(i)}
            className={`shrink-0 px-4 py-2 rounded-lg text-xs font-medium transition-all ${tab===i?'bg-purple-500/20 text-purple-400 border border-purple-500/30':'bg-white/5 text-gray-400'}`}>{t}</button>
        ))}
      </div>
      <div className="max-w-5xl mx-auto px-4 py-5">
        {tab===0 && <TeamTab />}
        {tab===1 && <DBTab />}
        {tab===2 && <AdTab />}
        {tab===3 && <AnalyticsTab />}
      </div>
    </div>
  );
}

function Loader(){return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"/></div>;}

function TeamTab(){
  const [members,setMembers]=useState([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    fetch(API+'/api/users?role=online_team',{headers:h()}).then(r=>r.json()).then(setMembers).finally(()=>setLoading(false));
  },[]);
  if(loading) return <Loader/>;
  const active=members.filter(m=>m.status==='active').length;
  const pending=members.filter(m=>m.status==='pending').length;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {[{label:'총 온라인팀',v:members.length,c:'text-purple-400'},{label:'활성',v:active,c:'text-emerald-400'},{label:'대기',v:pending,c:'text-yellow-400'}].map(x=>(
          <div key={x.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-xs text-gray-500">{x.label}</p>
            <p className={`text-2xl font-bold mt-1 ${x.c}`}>{x.v}</p>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="text-gray-500 border-b border-white/[0.06]">
            {['이름','아이디','연락처','팀','메타 계정','상태','가입일'].map(c=><th key={c} className="text-left py-3 px-2">{c}</th>)}
          </tr></thead>
          <tbody>{members.length===0?<tr><td colSpan={7} className="py-8 text-center text-gray-600">온라인팀원 없음</td></tr>:
            members.map(m=>(
              <tr key={m.id} className="border-b border-white/[0.04]">
                <td className="py-3 px-2 text-white font-medium">{m.name}</td>
                <td className="py-3 px-2 text-gray-500">{m.username}</td>
                <td className="py-3 px-2 text-gray-400">{m.phone||'-'}</td>
                <td className="py-3 px-2 text-gray-400">{m.team_name||'-'}</td>
                <td className="py-3 px-2 text-gray-300 max-w-[150px] truncate">{m.meta_ad_account||'-'}</td>
                <td className="py-3 px-2"><span className={`px-2 py-0.5 rounded-full text-xs ${m.status==='active'?'bg-emerald-500/20 text-emerald-400':'bg-yellow-500/20 text-yellow-400'}`}>{m.status==='active'?'활성':'대기'}</span></td>
                <td className="py-3 px-2 text-gray-500">{m.created_at?.split('T')[0]||'-'}</td>
              </tr>
            ))
          }</tbody>
        </table>
      </div>
    </div>
  );
}

function DBTab(){
  const [sales,setSales]=useState([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    fetch(API+'/api/sales',{headers:h()}).then(r=>r.json()).then(setSales).finally(()=>setLoading(false));
  },[]);
  if(loading) return <Loader/>;
  const onlineSales=sales.filter(r=>r.registered_by_online);
  const dealers=new Set(onlineSales.map(r=>r.dealer_name).filter(Boolean));
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {[{label:'총 DB 수',v:onlineSales.length,c:'text-blue-400'},{label:'연결 대리점',v:dealers.size,c:'text-emerald-400'},{label:'총 매출',v:'₩'+onlineSales.reduce((a,r)=>a+(r.amount||0),0).toLocaleString(),c:'text-yellow-400'}].map(x=>(
          <div key={x.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-xs text-gray-500">{x.label}</p>
            <p className={`text-xl font-bold mt-1 ${x.c}`}>{x.v}</p>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="text-gray-500 border-b border-white/[0.06]">
            {['고객명','연락처','금액','담당딜러','등록일'].map(c=><th key={c} className="text-left py-3 px-2">{c}</th>)}
          </tr></thead>
          <tbody>{onlineSales.slice(0,50).map(r=>(
            <tr key={r.id} className="border-b border-white/[0.04]">
              <td className="py-3 px-2 text-white">{r.customer_name}</td>
              <td className="py-3 px-2 text-gray-400">{r.phone||'-'}</td>
              <td className="py-3 px-2 text-emerald-400 font-bold">₩{(r.amount||0).toLocaleString()}</td>
              <td className="py-3 px-2 text-gray-300">{r.dealer_name||'-'}</td>
              <td className="py-3 px-2 text-gray-500">{r.registered_at?.split('T')[0]||'-'}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

function AdTab(){
  const [members,setMembers]=useState([]);
  const [sales,setSales]=useState([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    Promise.all([
      fetch(API+'/api/users?role=online_team',{headers:h()}).then(r=>r.json()),
      fetch(API+'/api/sales',{headers:h()}).then(r=>r.json()),
    ]).then(([m,s])=>{setMembers(m);setSales(s);}).finally(()=>setLoading(false));
  },[]);
  if(loading) return <Loader/>;
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-white">광고 성과</h3>
      <table className="w-full text-xs">
        <thead><tr className="text-gray-500 border-b border-white/[0.06]">
          {['팀원','메타 계정','DB 수','연결 대리점'].map(c=><th key={c} className="text-left py-3 px-2">{c}</th>)}
        </tr></thead>
        <tbody>{members.map(m=>{
          const mr=sales.filter(r=>r.registered_by_online===m.username);
          const dc=new Set(mr.map(r=>r.dealer_name).filter(Boolean)).size;
          return(
            <tr key={m.id} className="border-b border-white/[0.04]">
              <td className="py-3 px-2 text-white font-medium">{m.name}</td>
              <td className="py-3 px-2 text-gray-300 max-w-[200px] truncate">{m.meta_ad_account||'-'}</td>
              <td className="py-3 px-2 text-blue-400 font-bold">{mr.length}건</td>
              <td className="py-3 px-2 text-emerald-400">{dc}개</td>
            </tr>
          );
        })}</tbody>
      </table>
    </div>
  );
}

function AnalyticsTab(){
  const [sales,setSales]=useState([]);
  const [users,setUsers]=useState([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    Promise.all([
      fetch(API+'/api/sales',{headers:h()}).then(r=>r.json()),
      fetch(API+'/api/users',{headers:h()}).then(r=>r.json()),
    ]).then(([s,u])=>{setSales(s);setUsers(u);}).finally(()=>setLoading(false));
  },[]);
  if(loading) return <Loader/>;
  const total=sales.reduce((a,r)=>a+(r.amount||0),0);
  const dealers=users.filter(u=>u.role==='dealer'||u.role==='dealer_admin');
  const callTeams=users.filter(u=>u.role==='call_team'||u.role==='call_admin');
  const online=users.filter(u=>u.role==='online_team'||u.role==='online_director');
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        {[{label:'총 매출',v:'₩'+total.toLocaleString(),c:'text-yellow-400'},{label:'총 건수',v:sales.length+'건',c:'text-white'},
          {label:'대리점 수',v:dealers.length,c:'text-emerald-400'},{label:'콜팀 수',v:callTeams.length,c:'text-blue-400'},
          {label:'온라인팀',v:online.length,c:'text-purple-400'},{label:'오늘 가입',v:users.filter(u=>u.created_at?.startsWith(new Date().toISOString().split('T')[0])).length,c:'text-pink-400'}].map(x=>(
          <div key={x.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-xs text-gray-500">{x.label}</p>
            <p className={`text-2xl font-bold mt-1 ${x.c}`}>{x.v}</p>
          </div>
        ))}
      </div>
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-3">최근 매출 (상위 10건)</h3>
        <table className="w-full text-xs">
          <thead><tr className="text-gray-500 border-b border-white/[0.06]">
            {['고객명','금액','딜러','날짜'].map(c=><th key={c} className="text-left py-2 px-2">{c}</th>)}
          </tr></thead>
          <tbody>{sales.slice(0,10).map(r=>(
            <tr key={r.id} className="border-b border-white/[0.04]">
              <td className="py-2 px-2 text-white">{r.customer_name}</td>
              <td className="py-2 px-2 text-emerald-400 font-bold">₩{(r.amount||0).toLocaleString()}</td>
              <td className="py-2 px-2 text-gray-400">{r.dealer_name||'-'}</td>
              <td className="py-2 px-2 text-gray-500">{r.registered_at?.split('T')[0]||'-'}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}