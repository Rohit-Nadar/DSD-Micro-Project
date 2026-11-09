// API client connecting to FastAPI backend on Render or Localhost

const API_BASE = import.meta.env.VITE_API_URL || (
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:8000'
    : '/api'
);

async function request(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(errData.detail || errData.message || `Request failed (${res.status})`);
    }

    return await res.json();
  } catch (err) {
    console.error(`API Error on ${endpoint}:`, err);
    throw err;
  }
}

export const api = {
  // Card & Auth
  insertCard: (cardId) => request('/api/card/insert', {
    method: 'POST',
    body: JSON.stringify({ card_id: cardId })
  }),

  submitPin: (cardId, pin) => request('/api/auth/pin', {
    method: 'POST',
    body: JSON.stringify({ card_id: cardId, pin })
  }),

  getAccount: (cardId) => request(`/api/account/${cardId}`),

  // Transactions
  executeTransaction: ({ cardId, txType, amount, targetCardId }) => request('/api/transaction', {
    method: 'POST',
    body: JSON.stringify({
      card_id: cardId,
      tx_type: txType,
      amount: Number(amount) || 0,
      target_card_id: targetCardId || null
    })
  }),

  getTransactions: (cardId, limit = 8, query = '') => {
    const q = query ? `&q=${encodeURIComponent(query)}` : '';
    return request(`/api/transactions/${cardId}?limit=${limit}${q}`);
  },

  // PDF Receipt URL
  getPdfReceiptUrl: (receiptNo) => `${API_BASE}/api/receipt/${receiptNo}/pdf`,

  // Hardware Simulation
  simulateHardware: ({ cardId, pin, txType, amount, targetCardId }) => request('/api/hardware/simulate', {
    method: 'POST',
    body: JSON.stringify({
      card_id: Number(cardId) || 100123,
      pin: Number(pin) || 123456,
      tx_type: Number(txType) || 0,
      amount: Number(amount) || 0,
      target_card_id: Number(targetCardId) || 0
    })
  }),
  resetHardware: () => request('/api/hardware/reset', { method: 'POST' }),

  // Admin & Tests
  getAdminAccounts: () => request('/api/admin/accounts'),
  unlockAccount: (cardId) => request('/api/admin/unlock', {
    method: 'POST',
    body: JSON.stringify({ card_id: cardId })
  }),
  resetDailyLimits: () => request('/api/admin/reset-daily', { method: 'POST' }),
  resetDemoDatabase: () => request('/api/admin/reset-demo', { method: 'POST' }),
  runFrTestSuite: () => request('/api/admin/test-fr')
};

