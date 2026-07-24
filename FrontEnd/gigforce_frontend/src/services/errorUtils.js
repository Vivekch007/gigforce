// Normalizes errors thrown by apiClient (Axios) against the backend's
// GlobalExceptionHandler ErrorResponse shape:
// { timestamp, status, error, message, errors?: Record<field, message> }

export function getErrorMessage(error) {
  const data = error?.response?.data;
  if (data?.message) return data.message;
  if (error?.message === 'Network Error') {
    return 'Cannot reach the server. Please check your connection and try again.';
  }
  if (error?.message) return error.message;
  return 'Something went wrong. Please try again.';
}

export function getFieldErrors(error) {
  return error?.response?.data?.errors || {};
}

export function getStatusCode(error) {
  return error?.response?.status ?? null;
}
