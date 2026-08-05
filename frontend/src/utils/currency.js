export function formatINR(amount) {
  const num = Number(amount);
  const safe = Number.isFinite(num) ? num : 0;
  return `₹${Math.round(safe).toLocaleString('en-IN')}`;
}
