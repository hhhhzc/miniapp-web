export const platformName = platform => ({ meituan: '美团', eleme: '饿了么' }[platform] || platform);
export const statusName = status => ({ PENDING: '待付款', PAID: '已付款', COMPLETED: '已完成', REFUNDED: '已退款' }[status] || status);
export function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
export const formatAmount = fen => (Number(fen) / 100).toFixed(2);
