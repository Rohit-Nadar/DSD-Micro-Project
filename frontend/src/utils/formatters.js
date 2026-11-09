// Formatting utilities for currency, cards, and date-times

export function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(num);
}

export function maskCardNumber(cardId) {
  if (!cardId) return '••••••';
  const str = String(cardId);
  if (str.length <= 4) return '••' + str;
  return '••' + str.slice(-4);
}

export function formatDateTime(isoString) {
  if (!isoString) return new Date().toLocaleString('en-IN');
  try {
    const d = new Date(isoString);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch (e) {
    return isoString;
  }
}

