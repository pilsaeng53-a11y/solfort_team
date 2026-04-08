// KST 한국 시간 헬퍼
export const kstDate = (date) => {
  const d = date ? new Date(date) : new Date();
  return new Date(d.toLocaleString('en-US', {timeZone: 'Asia/Seoul'}));
};

export const kstNow = () => new Date(new Date().toLocaleString('en-US', {timeZone: 'Asia/Seoul'}));

export const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('ko-KR', {timeZone: 'Asia/Seoul'});
};

export const formatTime = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleTimeString('ko-KR', {timeZone: 'Asia/Seoul'});
};

export const formatDateTime = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('ko-KR', {timeZone: 'Asia/Seoul'});
};

export const todayKST = () => {
  return new Date().toLocaleDateString('ko-KR', {timeZone: 'Asia/Seoul', year:'numeric', month:'2-digit', day:'2-digit'}).replace(/. /g,'-').replace('.','');
};

export const nowKSTString = () => new Date().toLocaleTimeString('ko-KR', {timeZone: 'Asia/Seoul'});
