export function getToken() {
  return localStorage.getItem('tenant_token') || '';
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('tenant_token', token);
  } else {
    localStorage.removeItem('tenant_token');
  }
  // notify any listeners
  window.dispatchEvent(new Event('tenant-auth-changed'));
}

export function clearToken() {
  localStorage.removeItem('tenant_token');
  window.dispatchEvent(new Event('tenant-auth-changed'));
}

