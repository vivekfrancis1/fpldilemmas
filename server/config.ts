/**
 * Server Configuration for API Base URL
 * Automatically detects the correct base URL for internal API calls
 * Works in both development (localhost) and production environments
 */

export const getApiBaseUrl = (): string => {
  // Check if we're in production environment
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';
  
  // In production, use the internal service URL or current host
  if (isProduction) {
    // Try to get from environment variable first
    const productionUrl = process.env.API_BASE_URL;
    if (productionUrl) {
      return productionUrl;
    }
    
    // Fall back to relative URLs (same origin)
    return '';
  }
  
  // Development environment - use localhost
  return 'http://localhost:5000';
};

/**
 * Builds a complete API URL for internal server calls
 */
export const buildApiUrl = (endpoint: string): string => {
  const baseUrl = getApiBaseUrl();
  
  // Remove leading slash from endpoint if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  // If baseUrl is empty (production), return relative path
  if (!baseUrl) {
    return `/${cleanEndpoint}`;
  }
  
  // Return full URL for development
  return `${baseUrl}/${cleanEndpoint}`;
};

/**
 * Makes an internal API fetch call with proper URL resolution and timeouts
 */
export const internalFetch = async (endpoint: string, options?: RequestInit): Promise<Response> => {
  const baseUrl = getApiBaseUrl();
  
  let url: string;
  if (!baseUrl) {
    // Production: use relative URLs that resolve to same origin
    url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  } else {
    // Development: use full localhost URL
    url = buildApiUrl(endpoint);
  }
  
  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.log(`⏰ Internal API call timeout: ${url}`);
    controller.abort();
  }, 15000); // 15 second timeout for internal calls - faster failure
  
  try {
    console.log(`🌐 Internal API call: ${url}`);
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Internal API call timed out: ${url}`);
    }
    throw error;
  }
};