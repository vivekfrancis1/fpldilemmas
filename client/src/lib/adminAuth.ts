/**
 * Admin Authentication Utilities for Production Environment
 * Handles secure admin access with secret key authentication
 */

// Check if we're in production environment
export const isProduction = () => import.meta.env.PROD;

// Get admin key from URL parameters or prompt user
export const getAdminKey = (): string | null => {
  if (!isProduction()) {
    return null; // No key needed in development
  }
  
  // Check URL parameters first
  const urlParams = new URLSearchParams(window.location.search);
  const keyFromUrl = urlParams.get('admin_key');
  
  if (keyFromUrl) {
    // Store in sessionStorage for subsequent requests
    sessionStorage.setItem('admin_key', keyFromUrl);
    return keyFromUrl;
  }
  
  // Check sessionStorage for previously stored key
  const keyFromStorage = sessionStorage.getItem('admin_key');
  if (keyFromStorage) {
    return keyFromStorage;
  }
  
  // Prompt user for admin key
  const promptedKey = prompt(
    'Admin access requires authentication. Please enter the admin key:'
  );
  
  if (promptedKey) {
    sessionStorage.setItem('admin_key', promptedKey);
    return promptedKey;
  }
  
  return null;
};

// Add admin key to API request URL if needed
export const addAdminKeyToUrl = (url: string): string => {
  const adminKey = getAdminKey();
  
  if (!adminKey || !isProduction()) {
    return url; // No key needed in development
  }
  
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}admin_key=${encodeURIComponent(adminKey)}`;
};

// Clear stored admin key (for logout)
export const clearAdminKey = (): void => {
  sessionStorage.removeItem('admin_key');
  
  // Also clear from URL if present
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('admin_key')) {
    urlParams.delete('admin_key');
    const newUrl = `${window.location.pathname}${urlParams.toString() ? '?' + urlParams.toString() : ''}`;
    window.history.replaceState({}, '', newUrl);
  }
};

// Check if user has valid admin access
export const hasAdminAccess = (): boolean => {
  if (!isProduction()) {
    return true; // Always allow in development
  }
  
  const adminKey = sessionStorage.getItem('admin_key');
  return !!adminKey; // Simple check - actual validation happens on server
};

// Custom fetch wrapper for admin API calls
export const adminFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const urlWithKey = addAdminKeyToUrl(url);
  
  try {
    const response = await fetch(urlWithKey, options);
    
    // Handle unauthorized responses
    if (response.status === 401) {
      clearAdminKey();
      
      // Prompt for key again
      const newKey = getAdminKey();
      if (newKey) {
        const retryUrl = addAdminKeyToUrl(url);
        return fetch(retryUrl, options);
      } else {
        throw new Error('Admin authentication required');
      }
    }
    
    return response;
  } catch (error) {
    console.error('Admin API call failed:', error);
    throw error;
  }
};