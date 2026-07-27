import apiClient from './apiClient';

// --- System Settings Service ---

let mockSettings = {
  passwordPolicy: 'STRONG',
  sessionTimeout: '30',
  mfaEnabled: true,
  emailEnabled: true,
  smsEnabled: false,
  pushEnabled: true,
  companyName: 'GigForce Enterprise Inc.',
  timeZone: 'EST (UTC-5)',
  dateFormat: 'YYYY-MM-DD',
};

export async function getSystemSettings() {
  return mockSettings;
}

export async function updateSystemSettings(payload) {
  mockSettings = { ...mockSettings, ...payload };
  return mockSettings;
}
