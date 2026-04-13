// Last updated: 2026-04-13 18:15:11
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'solfort-secret-2026';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(cors({ origin: '*' }));
app.use(express.json());

const auth = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: '인증 필요' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: '유효하지 않은 토큰' }); }
};

// AUTH
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: '아이디 또는 비밀번호가 틀렸습니다' });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: '아이디 또는 비밀번호가 틀렸습니다' });
    if (user.status === 'pending') return res.status(403).json({ error: '승인 대기 중입니다' });
    if (user.status === 'suspended') return res.status(403).json({ error: '계정이 정지되었습니다' });
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await pool.query('UPDATE users SET last_login_at=NOW(), last_login_ip=$1 WHERE id=$2', [ip, user.id]);
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    const { password_hash, ...userSafe } = user;
    res.json({ token, user: userSafe });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/register', async (req, res) => {
  const { username, password, name, phone, role, position, team_name, parent_referral_code } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    let parent_id = null, parent_name = null;
    if (parent_referral_code) {
      const p = await pool.query('SELECT id, name FROM users WHERE my_referral_code=$1', [parent_referral_code]);
      if (p.rows[0]) { parent_id = p.rows[0].id; parent_name = p.rows[0].name; }
    }
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let my_referral_code, isUnique = false;
    while (!isUnique) {
      my_referral_code = username.toUpperCase().slice(0,2) + Array.from({length:4},()=>chars[Math.floor(Math.random()*chars.length)]).join('');
      const ex = await pool.query('SELECT id FROM users WHERE my_referral_code=$1', [my_referral_code]);
      if (!ex.rows.length) isUnique = true;
    }
    const r = await pool.query(
      'INSERT INTO users (username,password_hash,name,phone,role,position,team_name,my_referral_code,parent_referral_code,parent_id,parent_name,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,\' pending\') RETURNING id,username,name,role,status,my_referral_code',
      [username,hash,name,phone,role,position,team_name,my_referral_code,parent_referral_code,parent_id,parent_name]
    );
    res.json({ success: true, user: r.rows[0] });
  } catch (e) {
    if (e.code==='23505') return res.status(400).json({ error: '이미 존재하는 아이디입니다' });
    res.status(500).json({ error: e.message });
  }
});

// USERS
app.get('/api/users', auth, async (req,res) => {
  const {role,status,team_name,parent_id} = req.query;
  let q='SELECT id,username,name,phone,role,position,team_name,region,my_referral_code,parent_id,parent_name,status,monthly_goal,incentive_rate,last_login_at,created_at FROM users WHERE 1=1';
  const p=[];
  if(role){p.push(role);q+=` AND role=$${p.length}`;}
  if(status){p.push(status);q+=` AND status=$${p.length}`;}
  if(team_name){p.push(team_name);q+=` AND team_name=$${p.length}`;}
  if(parent_id){p.push(parent_id);q+=` AND parent_id=$${p.length}`;}
  q+=' ORDER BY created_at DESC';
  const r=await pool.query(q,p);
  res.json(r.rows);
});

app.put('/api/users/:id', auth, async (req,res) => {
  const allowed=['name','phone','position','team_name','status','monthly_goal','incentive_rate','my_referral_code','parent_id','parent_name'];
  const updates=Object.entries(req.body).filter(([k])=>allowed.includes(k));
  if(!updates.length) return res.status(400).json({error:'업데이트 필드 없음'});
  const set=updates.map(([k],i)=>`${k}=$${i+2}`).join(', ');
  const vals=[req.params.id,...updates.map(([,v])=>v)];
  const r=await pool.query(`UPDATE users SET ${set},updated_at=NOW() WHERE id=$1 RETURNING *`,vals);
  res.json(r.rows[0]);
});

// SALES
app.get('/api/sales', auth, async (req,res) => {
  const {dealer_id,month,from_call_team}=req.query;
  let q='SELECT * FROM sales_records WHERE 1=1'; const p=[];
  if(dealer_id){p.push(dealer_id);q+=` AND dealer_id=$${p.length}`;}
  if(from_call_team){p.push(from_call_team);q+=` AND from_call_team=$${p.length}`;}
  if(month){p.push(month);q+=` AND TO_CHAR(registered_at,'YYYY-MM')=$${p.length}`;}
  q+=' ORDER BY registered_at DESC';
  const r=await pool.query(q,p); res.json(r.rows);
});

app.post('/api/sales', auth, async (req,res) => {
  const {customer_name,phone,amount,sof_quantity,wallet_address,dealer_id,dealer_name,from_call_team,registered_by_online,status,memo}=req.body;
  const r=await pool.query(
    'INSERT INTO sales_records (customer_name,phone,amount,sof_quantity,wallet_address,dealer_id,dealer_name,from_call_team,registered_by_online,status,memo) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *',
    [customer_name,phone,amount||0,sof_quantity||0,wallet_address,dealer_id,dealer_name,from_call_team,registered_by_online,status||'active',memo]
  );
  res.json(r.rows[0]);
});

// LEADS
app.get('/api/leads', auth, async (req,res) => {
  const {status,assigned_to,caller_id}=req.query;
  let q='SELECT * FROM call_leads WHERE 1=1'; const p=[];
  if(status){p.push(status);q+=` AND status=$${p.length}`;}
  if(assigned_to){p.push(assigned_to);q+=` AND assigned_to=$${p.length}`;}
  if(caller_id){p.push(caller_id);q+=` AND caller_id=$${p.length}`;}
  q+=' ORDER BY created_at DESC';
  const r=await pool.query(q,p); res.json(r.rows);
});

app.post('/api/leads', auth, async (req,res) => {
  const {name,phone,status,amount,memo,caller_id,caller_name,source,next_call_date}=req.body;
  const r=await pool.query(
    'INSERT INTO call_leads (name,phone,status,amount,memo,caller_id,caller_name,source,next_call_date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
    [name,phone,status||'신규',amount||0,memo,caller_id,caller_name,source||'manual',next_call_date]
  );
  res.json(r.rows[0]);
});

app.put('/api/leads/:id', auth, async (req,res) => {
  const allowed=['name','phone','status','amount','memo','tag','assigned_to','next_call_date'];
  const updates=Object.entries(req.body).filter(([k])=>allowed.includes(k));
  const set=updates.map(([k],i)=>`${k}=$${i+2}`).join(', ');
  const vals=[req.params.id,...updates.map(([,v])=>v)];
  const r=await pool.query(`UPDATE call_leads SET ${set},updated_at=NOW() WHERE id=$1 RETURNING *`,vals);
  res.json(r.rows[0]);
});

// NOTICES
app.get('/api/notices', auth, async (req,res) => {
  const {category}=req.query;
  let q='SELECT * FROM notices WHERE is_active=true'; const p=[];
  if(category&&category!=='전체'){p.push(category);q+=` AND (category=$${p.length} OR category='전체')`;}
  q+=' ORDER BY is_important DESC,created_at DESC';
  const r=await pool.query(q,p); res.json(r.rows);
});

app.post('/api/notices', auth, async (req,res) => {
  const {title,content,category,is_important,file_url,expires_at}=req.body;
  const r=await pool.query(
    'INSERT INTO notices (title,content,category,is_important,file_url,expires_at,author_id,author_name) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
    [title,content,category||'전체',is_important||false,file_url,expires_at,req.user.id,req.user.username]
  );
  res.json(r.rows[0]);
});

// ATTENDANCE
app.get('/api/attendance', auth, async (req,res) => {
  const {user_id,date_from,date_to}=req.query;
  let q='SELECT * FROM attendance_logs WHERE 1=1'; const p=[];
  if(user_id){p.push(user_id);q+=` AND user_id=$${p.length}`;}
  if(date_from){p.push(date_from);q+=` AND date>=$${p.length}`;}
  if(date_to){p.push(date_to);q+=` AND date<=$${p.length}`;}
  q+=' ORDER BY time DESC LIMIT 200';
  const r=await pool.query(q,p); res.json(r.rows);
});

app.post('/api/attendance', auth, async (req,res) => {
  const {type}=req.body;
  const r=await pool.query(
    'INSERT INTO attendance_logs (user_id,username,type,date,time) VALUES ($1,$2,$3,CURRENT_DATE,NOW()) RETURNING *',
    [req.user.id,req.user.username,type]
  );
  res.json(r.rows[0]);
});

// JOURNALS
app.get('/api/journals', auth, async (req,res) => {
  const {author_id,parent_id}=req.query;
  let q='SELECT * FROM daily_journals WHERE 1=1'; const p=[];
  if(author_id){p.push(author_id);q+=` AND author_id=$${p.length}`;}
  if(parent_id){p.push(parent_id);q+=` AND parent_id=$${p.length}`;}
  q+=' ORDER BY written_at DESC LIMIT 100';
  const r=await pool.query(q,p); res.json(r.rows);
});

app.post('/api/journals', auth, async (req,res) => {
  const {good_points,bad_points,tomorrow_goal,today_sales,parent_id,parent_name}=req.body;
  const u=(await pool.query('SELECT name,role,position,parent_id,parent_name FROM users WHERE id=$1',[req.user.id])).rows[0];
  const r=await pool.query(
    'INSERT INTO daily_journals (author_id,author_name,role,position,good_points,bad_points,tomorrow_goal,today_sales,parent_id,parent_name) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
    [req.user.id,u?.name,u?.role,u?.position,good_points,bad_points,tomorrow_goal,today_sales||0,parent_id||u?.parent_id,parent_name||u?.parent_name]
  );
  res.json(r.rows[0]);
});

// INCENTIVES
app.get('/api/incentives', auth, async (req,res) => {
  const {member_id}=req.query;
  let q='SELECT * FROM incentive_settings WHERE 1=1'; const p=[];
  if(member_id){p.push(member_id);q+=` AND member_id=$${p.length}`;}
  const r=await pool.query(q,p); res.json(r.rows);
});

app.post('/api/incentives', auth, async (req,res) => {
  const {member_id,member_name,rate_percent}=req.body;
  const r=await pool.query(
    'INSERT INTO incentive_settings (member_id,member_name,rate_percent,set_by,set_by_name) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [member_id,member_name,rate_percent,req.user.id,req.user.username]
  );
  res.json(r.rows[0]);
});

// AUDIT LOGS
app.get('/api/audit', auth, async (req,res) => {
  const r=await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 500');
  res.json(r.rows);
});

app.post('/api/audit', auth, async (req,res) => {
  const {action,target_name,detail}=req.body;
  const ip=req.headers['x-forwarded-for']||req.socket.remoteAddress;
  const u=(await pool.query('SELECT name,role FROM users WHERE id=$1',[req.user.id])).rows[0];
  const r=await pool.query(
    'INSERT INTO audit_logs (actor_id,actor_name,actor_role,action,target_name,detail,ip_address) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
    [req.user.id,u?.name,u?.role,action,target_name,detail,ip]
  );
  res.json(r.rows[0]);
});

// REVIEWS
app.get('/api/reviews', auth, async (req,res) => {
  const {staff_id}=req.query;
  let q='SELECT * FROM customer_reviews WHERE 1=1'; const p=[];
  if(staff_id){p.push(staff_id);q+=` AND staff_id=$${p.length}`;}
  q+=' ORDER BY created_at DESC';
  const r=await pool.query(q,p); res.json(r.rows);
});

app.post('/api/reviews', async (req,res) => {
  const {customer_name,rating,review,staff_id,staff_name,source}=req.body;
  const r=await pool.query(
    'INSERT INTO customer_reviews (customer_name,rating,review,staff_id,staff_name,source) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [customer_name,rating,review,staff_id,staff_name,source||'telegram']
  );
  res.json(r.rows[0]);
});

// SCRIPTS
app.get('/api/scripts', auth, async (req,res) => {
  const {is_shared,category}=req.query;
  let q='SELECT * FROM call_scripts WHERE 1=1'; const p=[];
  if(is_shared!==undefined){p.push(is_shared==='true');q+=` AND is_shared=$${p.length}`;}
  if(category){p.push(category);q+=` AND category=$${p.length}`;}
  q+=' ORDER BY likes DESC,created_at DESC';
  const r=await pool.query(q,p); res.json(r.rows);
});

app.post('/api/scripts', auth, async (req,res) => {
  const {title,content,category,is_shared}=req.body;
  const u=(await pool.query('SELECT name,position FROM users WHERE id=$1',[req.user.id])).rows[0];
  const r=await pool.query(
    'INSERT INTO call_scripts (title,content,category,is_shared,author_id,author_name,position) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
    [title,content,category,is_shared||false,req.user.id,u?.name,u?.position]
  );
  res.json(r.rows[0]);
});

// SETTLEMENTS
app.get('/api/settlements', auth, async (req,res) => {
  const {month}=req.query;
  let q='SELECT * FROM sales_settlements WHERE 1=1'; const p=[];
  if(month){p.push(month);q+=` AND month=$${p.length}`;}
  const r=await pool.query(q,p); res.json(r.rows);
});

app.put('/api/settlements/:id', auth, async (req,res) => {
  const {status}=req.body;
  const r=await pool.query(
    "UPDATE sales_settlements SET status=$1,settled_at=CASE WHEN $1='지급완료' THEN NOW() ELSE settled_at END WHERE id=$2 RETURNING *",
    [status,req.params.id]
  );
  res.json(r.rows[0]);
});

// ADMIN - 코드 발급
app.post('/api/admin/assign-code', auth, async (req,res) => {
  if(req.user.role!=='super_admin') return res.status(403).json({error:'권한 없음'});
  const {target_user_id,custom_code}=req.body;
  const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code=custom_code||Array.from({length:6},()=>chars[Math.floor(Math.random()*chars.length)]).join('');
  const exists=await pool.query('SELECT id FROM users WHERE my_referral_code=$1',[code]);
  if(exists.rows.length) return res.status(400).json({error:'이미 사용 중인 코드입니다'});
  const r=await pool.query('UPDATE users SET my_referral_code=$1 WHERE id=$2 RETURNING id,name,username,my_referral_code',[code,target_user_id]);
  res.json({success:true,user:r.rows[0],code});
});

// 초기 관리자
app.post('/api/init-admin', async (req,res) => {
  try {
    const ex=await pool.query("SELECT id FROM users WHERE role='super_admin' LIMIT 1");
    if(ex.rows.length) return res.status(400).json({error:'이미 초기화됨'});
    const hash=await bcrypt.hash('solfort2026!',10);
    const r=await pool.query(
      "INSERT INTO users (username,password_hash,name,role,status,my_referral_code) VALUES ('admin',$1,'총관리자','super_admin','active','ADMIN1') RETURNING id,username,name,role",
      [hash]
    );
    res.json({success:true,user:r.rows[0],message:'초기 관리자 생성. ID: admin, PW: solfort2026!'});
  } catch(e){ res.status(500).json({error:e.message}); }
});

app.get('/health', async (req,res) => {
  try { await pool.query('SELECT 1'); res.json({status:'ok',db:'connected',time:new Date().toISOString()}); }
  catch(e){ res.status(500).json({status:'error',db:'disconnected'}); }
});

app.get('/', (req,res) => res.json({name:'SolFort API Server',version:'1.0.0',status:'running'}));


// === TELEGRAM BOT WEBHOOK ===
const https = require('https');

// 텔레그램 메시지 전송 함수
function sendTelegramMessage(chatId, text) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    });
    
    const options = {
      hostname: 'api.telegram.com',
      path: '/bot8761677364:AAGCYaWWvlIP5kO3cx5hQiap7-e_3gczlz8/sendMessage',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

app.post('/api/telegram/webhook', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || !message.text) {
      return res.json({ ok: true });
    }
    
    const chatId = message.chat.id;
    const text = message.text.trim();
    const username = message.from.username || message.from.first_name || '익명';
    
    // 정규식 파싱
    const nameMatch = text.match(/([가-힣]{2,4})/);
    const name = nameMatch ? nameMatch[1] : null;
    
    const phoneMatch = text.match(/010[-\s]?(\d{4})[-\s]?(\d{4})/);
    const phone = phoneMatch ? `010-${phoneMatch[1]}-${phoneMatch[2]}` : null;
    
    const amountMatch = text.match(/(\d{1,3}(?:,?\d{3})*)\s*(만원|만|원)?/);
    let amount = null;
    if (amountMatch) {
      const num = parseInt(amountMatch[1].replace(/,/g, ''));
      const unit = amountMatch[2];
      if (unit === '만원' || unit === '만') amount = num * 10000;
      else amount = num >= 1000 ? num : num * 10000;
    }
    
    const walletMatch = text.match(/([A-Za-z0-9]{20,})/);
    const wallet = walletMatch ? walletMatch[1] : null;
    
    const isLead = text.includes('리드');
    const isNew = text.includes('신규');
    const isDuplicate = text.includes('추가');
    
    // 1. 모든 메시지 로그
    try {
      await pool.query(`
        INSERT INTO telegram_messages (chat_id, username, message_text, created_at)
        VALUES ($1, $2, $3, NOW())
      `, [chatId, username, text]);
    } catch (e) { console.error('Message log error:', e); }
    
    // 2. Chat ID로 직원 조회
    const staffResult = await pool.query(
      'SELECT * FROM telegram_users WHERE chat_id = $1 AND is_active = true',
      [chatId]
    );
    
    const staffName = staffResult.rows.length > 0 ? staffResult.rows[0].user_name : username;
    const source = staffResult.rows.length > 0
      ? (staffResult.rows[0].role === 'call_team' ? 'telegram_call' : 'telegram_dealer')
      : 'telegram_unknown';
    
    // 3. 매출 처리
    if (name && amount && !isLead) {
      const today = new Date().toISOString().split('T')[0];
      const status = isNew ? 'new' : isDuplicate ? 'duplicate' : 'existing';
      
      await pool.query(`
        INSERT INTO sales_records 
        (customer_name, phone, amount, wallet_address, source, dealer_name, customer_status, sale_date, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      `, [name, phone, amount, wallet, source, staffName, status, today]);
      
      const emoji = status === 'new' ? '🟡' : status === 'duplicate' ? '🔴' : '🟢';
      const statusText = status === 'new' ? '신규고객' : status === 'duplicate' ? '추가매출' : '기존고객';
      
      const msg = `💰 매출 등록 완료!\n\n👤 고객: ${name}\n${phone ? `📞 연락처: ${phone}\n` : ''}💰 금액: ₩${amount.toLocaleString()}\n${wallet ? `💳 지갑: ${wallet.slice(0,10)}...\n` : ''}👨‍💼 담당: ${staffName}\n${emoji} ${statusText}`;
      
      await sendTelegramMessage(chatId, msg);
    }
    // 4. 리드 처리
    else if (name && isLead) {
      await pool.query(`
        INSERT INTO call_leads
        (customer_name, phone, interested_amount, assigned_to, status, memo, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `, [name, phone, amount, staffName, '대기', text]);
      
      const msg = `📋 리드 등록 완료!\n\n👤 고객: ${name}\n${phone ? `📞 연락처: ${phone}\n` : ''}${amount ? `💰 관심금액: ₩${amount.toLocaleString()}\n` : ''}👨‍💼 담당: ${staffName}`;
      
      await sendTelegramMessage(chatId, msg);
    }
    // 5. 일반 메시지
    else {
      await sendTelegramMessage(chatId, '✅ 메시지가 수집되었습니다.\n\n사용법:\n• 매출: "홍길동 50만원 신규 010-1234-5678"\n• 리드: "김철수 리드 010-5678-1234"');
    }
    
    return res.json({ ok: true });
    
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return res.json({ ok: true });
  }
});

// Webhook 설정 (최초 1회)
app.get('/api/telegram/set-webhook', async (req, res) => {
  const WEBHOOK_URL = 'https://solfort-api-9red.onrender.com/api/telegram/webhook';
  
  return new Promise((resolve) => {
    const data = JSON.stringify({ 
      url: WEBHOOK_URL,
      drop_pending_updates: true
    });
    
    const options = {
      hostname: 'api.telegram.com',
      path: '/bot8761677364:AAGCYaWWvlIP5kO3cx5hQiap7-e_3gczlz8/setWebhook',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    const request = https.request(options, (response) => {
      let body = '';
      response.on('data', chunk => body += chunk);
      response.on('end', () => {
        const result = JSON.parse(body);
        res.json({ success: true, webhook: WEBHOOK_URL, telegram_response: result });
        resolve();
      });
    });
    
    request.on('error', (e) => {
      res.status(500).json({ error: e.message });
      resolve();
    });
    
    request.write(data);
    request.end();
  });
});


app.listen(PORT, () => console.log('SolFort API running on port ' + PORT));
