// Normalizes errors thrown by apiClient (Axios) against the backend's
// GlobalExceptionHandler ErrorResponse shape:
// { timestamp, status, error, message, errors?: Record<field, message> }

export function getErrorMessage(error) {
  const data = error?.response?.data;
  
  // Handle backend 500 leaks of IllegalStateException messages
  if (data?.status === 500 && data?.message) {
    const msg = data.message;
    if (msg.includes('You can add Comment only when')) {
      return 'Comments can only be added to timesheets in REJECTED status.';
    }
    if (msg.toLowerCase().includes('balance exceeded')) {
      return 'The invoice amount exceeds the remaining Purchase Order balance. Please contact finance.';
    }
    if (msg.toLowerCase().includes('po not active') || msg.toLowerCase().includes('purchase order not active')) {
      return 'The associated Purchase Order is currently inactive or closed.';
    }
    return `Server Error: ${msg}`;
  }

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
