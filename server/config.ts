/**
 * Server Configuration for API Base URL
 * Automatically detects the correct base URL for internal API calls
 * Works in both development (localhost) and production environments
 */

export const getApiBaseUrl = (): string => {
  // Check if we're in production environment
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';
  
  // In production, always use localhost for internal calls.
  // Using the public hostname (e.g. via API_BASE_URL) adds ~5s per hop, causes 90–125s chain
  // timeouts in the aggregator, and creates a circular dependency during startup (the server
  // calls itself via the public domain before the domain is reachable).
  if (isProduction) {
    return `http://localhost:${process.env.PORT || 5000}`;
  }
  
  // Development environment - use localhost
  return `http://localhost:${process.env.PORT || 5000}`;
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
  if (baseUrl === '') {
    // Fallback case: use relative URLs that resolve to same origin
    url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  } else {
    // Development or production: use full URL
    url = buildApiUrl(endpoint);
  }
  
  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.log(`⏰ Internal API call timeout: ${url}`);
    controller.abort();
  }, 120000); // 120 second timeout for complex projection calls (increased for cache management stability)
  
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