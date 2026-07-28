import apiClient from './apiClient';

// --- AuthController (/api/v1/auth) ---

// LoginRequestDTO { email, password } -> LoginResponseDTO { accessToken, email, role }
export function login(payload) {
  return apiClient.post('/auth/login', payload).then((res) => res.data);
}

// RegisterRequestDTO { name, email, password, phone, role, orgUnitId? } -> UserResponseDTO
export function register(payload) {
  return apiClient.post('/auth/register', payload).then((res) => res.data);
}

// ForgotPasswordRequestDTO { email } -> 200 empty body
export function forgotPassword(payload) {
  return apiClient.post('/auth/forgot-password', payload).then((res) => res.data);
}

// ResetPasswordRequestDTO { token, newPassword } -> 200 empty body
export function resetPassword(payload) {
  return apiClient.post('/auth/reset-password', payload).then((res) => res.data);
}

// ChangePasswordRequestDTO { oldPassword, newPassword } -> 200 empty body
export function changePassword(payload) {
  return apiClient.post('/auth/change-password', payload).then((res) => res.data);
}

// Audit-only server call; JWT itself is not blacklisted server-side.
export function logout() {
  return apiClient.post('/auth/logout').then((res) => res.data);
}

// Used by the Contractor dashboard right after login/registration. The
// ContractorProfile is created asynchronously (AFTER_COMMIT event listener),
// so this can 404 for a brief window right after a CONTRACTOR registers.
export function getMyContractorProfile() {
  return apiClient.get('/contractors/profiles/me').then((res) => res.data);
}
