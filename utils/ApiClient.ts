import { ApiResponse, ApisauceInstance, create } from 'apisauce';
import { AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { getToken, saveTokenWithExpiry, clearAllTokens, isTokenExpired } from './SecureTokenManager';
import { storage } from '@/hooks/useMMKVStorage';

export const API_URL_DEV = "https://api-alpha.odysseytech.ai";
// export const API_URL_PROD = "https://api.odysseytech.ai";
export const API_URL_PROD = API_URL_DEV;
// Types and Interfaces
interface Config {
  MAX_RETRIES: number;
  CACHE_SIZE: number;
  CACHE_CLEANUP_INTERVAL: number;
  DEFAULT_CACHE_DURATION: number;
}

interface CacheDurations {
  shortTerm: number;
  mediumTerm: number;
  longTerm: number;
  veryLongTerm: number;
}

interface CachedData<T> {
  timestamp: number;
  duration: number;
  response: AxiosResponse<T>;
}

interface ApiError {
  __cached?: boolean;
  response?: AxiosResponse;
  config?: AxiosRequestConfig;
}

// Refresh Token API Types
export interface RefreshTokenRequest {
  token: string;
  user_id: number;
  client: string;
}

export interface RefreshTokenResponse {
  token: string;
  expires_at: string;
  message: string;
}

type HttpMethod = 'get' | 'post' | 'put' | 'delete';

// Constants
const CONFIG: Config = {
  MAX_RETRIES: 3,
  CACHE_SIZE: 100,
  CACHE_CLEANUP_INTERVAL: 60 * 1000, // 1 minute
  DEFAULT_CACHE_DURATION: 60 * 60 * 1000, // 1 hour
};

const CACHE_DURATIONS: CacheDurations = {
  shortTerm: 15 * 60 * 1000,     // 15 minutes
  mediumTerm: 30 * 60 * 1000,    // 30 minutes
  longTerm: 12 * 60 * 60 * 1000, // 12 hours
  veryLongTerm: 24 * 60 * 60 * 1000, // 24 hours
};

// Endpoint-specific cache configuration
const ENDPOINT_CACHE_CONFIG = new Map<string, number>([

]);

// Cacheable POST endpoints
const CACHEABLE_POSTS = new Set<string>([
  // API_ENDPOINTS.API_V1_ML_NEWS_ANALYSIS,
]);

class LRUCache<K, V> {
  #cache: Map<K, V>;
  #maxSize: number;

  constructor(maxSize: number) {
    this.#cache = new Map<K, V>();
    this.#maxSize = maxSize;
  }

  get(key: K): V | null {
    if (!this.#cache.has(key)) return null;
    const item = this.#cache.get(key)!;
    this.#cache.delete(key);
    this.#cache.set(key, item);
    return item;
  }

  set(key: K, value: V): void {
    if (this.#cache.has(key)) {
      this.#cache.delete(key);
    } else if (this.#cache.size >= this.#maxSize) {
      const firstKey = this.#cache.keys().next().value;
      if (firstKey !== undefined) {
        this.#cache.delete(firstKey);
      }
    }
    this.#cache.set(key, value);
  }

  delete(key: K): void {
    this.#cache.delete(key);
  }

  clear(): void {
    this.#cache.clear();
  }

  *entries(): IterableIterator<[K, V]> {
    yield* this.#cache.entries();
  }
}

class ApiClient {
  private cache: LRUCache<string, CachedData<unknown>>;
  private retryCount: Map<string, number>;
  private api: ApisauceInstance;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<string> | null = null;

  constructor(baseURL: string = API_URL_PROD) {
    this.cache = new LRUCache(CONFIG.CACHE_SIZE);
    this.retryCount = new Map();

    this.api = create({
      baseURL,
      headers: {
        Accept: 'application/json',
      },
    });

    this.setupInterceptors();
    this.setupCacheCleanup();
    this.setupResponseTransform();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.api.axiosInstance.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        try {
          // Check if token is expired before making request (except for auth endpoints)
          const isAuthEndpoint = config.url?.includes('/auth/login') || 
                                 config.url?.includes('/auth/register') ||
                                 config.url?.includes('/auth/refresh-token') ||
                                 config.url?.includes('/auth/forgot-password');
          
          if (!isAuthEndpoint && config.headers?.['Authorization']) {
            const expired = await isTokenExpired();
            if (expired) {
              console.log('[ApiClient] Token expired before request, attempting refresh');
              try {
                const newToken = await this.refreshToken();
                config.headers['Authorization'] = newToken;
              } catch (error) {
                console.error('[ApiClient] Proactive refresh failed, rejecting request');
                return Promise.reject(new Error('SESSION_EXPIRED'));
              }
            }
          }

          if (this.isCacheable(config)) {
            const cachedResponse = this.getCachedResponse(config);
            if (cachedResponse) {
              return Promise.reject({ __cached: true, response: cachedResponse });
            }
          }
          return config;
        } catch (error) {
          // console.error('Request interceptor error:', error);
          return config;
        }
      },
      (error: Error) => Promise.reject(error)
    );

    // Response interceptor
    this.api.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        try {
          if (this.isCacheable(response.config)) {
            this.setCachedResponse(response.config, response);
          }
          return response;
        } catch (error) {
          // console.error('Cache response error:', error);
          return response;
        }
      },
      this.handleResponseError.bind(this)
    );
  }

  private setupCacheCleanup(): void {
    // Clear any existing interval first
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.cleanupInterval = setInterval(() => {
      for (const [key, value] of this.cache.entries()) {
        if (Date.now() - value.timestamp > value.duration) {
          this.cache.delete(key);
        }
      }
    }, CONFIG.CACHE_CLEANUP_INTERVAL);
  }

  public setAuthToken(token: string): void {
    this.api.setHeader('Authorization', token);
  }

  /**
   * Refresh authentication token
   * Prevents concurrent refresh requests by using a shared promise
   * @returns New token string
   */
  public async refreshToken(): Promise<string> {
    // Prevent concurrent refresh requests
    if (this.isRefreshing && this.refreshPromise) {
      console.log('[ApiClient] Token refresh already in progress, waiting...');
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this._performTokenRefresh();

    try {
      const newToken = await this.refreshPromise;
      return newToken;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  /**
   * Internal method to perform the actual token refresh
   * @private
   */
  private async _performTokenRefresh(): Promise<string> {
    try {
      const currentToken = await getToken();
      const userString = storage.getString('user');
      
      if (!currentToken || !userString) {
        throw new Error('No token or user found');
      }

      const userData = JSON.parse(userString);
      
      if (!userData.user_id) {
        throw new Error('User ID not found');
      }

      console.log('[ApiClient] Refreshing token for user:', userData.user_id);
      
      const response = await this.api.post<RefreshTokenResponse>('/auth/refresh-token', {
        token: currentToken,
        user_id: userData.user_id,
        client: 'APP'
      });

      if (!response.ok || !response.data) {
        console.error('[ApiClient] Token refresh failed:', response.problem, response.data);
        const errorData = response.data as any;
        throw new Error(errorData?.detail || 'Token refresh failed');
      }

      const { token: newToken, expires_at } = response.data;
      
      // Save new token and expiry
      await saveTokenWithExpiry(newToken, expires_at);
      this.setAuthToken(newToken);
      
      console.log('[ApiClient] Token refreshed successfully, expires:', expires_at);
      return newToken;
      
    } catch (error: any) {
      console.error('[ApiClient] Token refresh error:', error);
      // Clear tokens on refresh failure
      await clearAllTokens();
      throw error;
    }
  }

  private getCacheKey(request: AxiosRequestConfig): string {
    const { method, url, params = {}, data = {}, headers = {} } = request;
    const { Authorization, ...restHeaders } = headers;

    return JSON.stringify({
      method,
      url,
      params: this.sortObject(params),
      data: this.sortObject(data),
      headers: restHeaders
    });
  }

  private sortObject<T extends object>(obj: T): T {
    return Object.keys(obj).sort().reduce((acc, key) => {
      acc[key as keyof T] = obj[key as keyof T];
      return acc;
    }, {} as T);
  }

  private getCacheDuration(url: string): number {
    for (const [endpoint, duration] of ENDPOINT_CACHE_CONFIG) {
      if (url.includes(endpoint)) {
        return duration;
      }
    }
    return CONFIG.DEFAULT_CACHE_DURATION;
  }

  private isCacheable(request: AxiosRequestConfig): boolean {
    const method = request.method?.toLowerCase() as HttpMethod;
    const url = request.url ?? '';

    const isEndpointCacheable = Array.from(ENDPOINT_CACHE_CONFIG.keys()).some(
      endpoint => url.includes(endpoint)
    );

    if (method === 'get') {
      return isEndpointCacheable;
    }

    if (method === 'post') {
      return CACHEABLE_POSTS.has(url);
    }

    return false;
  }

  private getCachedResponse(request: AxiosRequestConfig): AxiosResponse | null {
    const key = this.getCacheKey(request);
    const cachedData = this.cache.get(key);

    if (!cachedData) return null;

    const { timestamp, response, duration } = cachedData;
    const isExpired = Date.now() - timestamp > duration;

    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return response;
  }

  private setCachedResponse(request: AxiosRequestConfig, response: AxiosResponse): void {
    const key = this.getCacheKey(request);
    const duration = this.getCacheDuration(request.url ?? '');

    this.cache.set(key, {
      timestamp: Date.now(),
      duration,
      response: { ...response }
    });
  }

  private async handleResponseError(error: ApiError): Promise<AxiosResponse | Promise<never>> {
    if (error.__cached) {
      return Promise.resolve(error.response!);
    }

    const requestConfig = error.config;
    if (!requestConfig) return Promise.reject(error);

    // Handle 401 Unauthorized - attempt token refresh
    if (error.response?.status === 401 && !requestConfig.url?.includes('/auth/refresh-token')) {
      try {
        console.log('[ApiClient] 401 error detected - attempting token refresh');
        const newToken = await this.refreshToken();
        
        // Retry original request with new token
        requestConfig.headers = requestConfig.headers || {};
        requestConfig.headers['Authorization'] = newToken;
        
        console.log('[ApiClient] Retrying request with refreshed token');
        return this.api.axiosInstance(requestConfig);
        
      } catch (refreshError) {
        console.error('[ApiClient] Token refresh failed - session expired');
        // Token refresh failed - user needs to re-login
        const sessionExpiredError = new Error('SESSION_EXPIRED');
        (sessionExpiredError as any).originalError = refreshError;
        return Promise.reject(sessionExpiredError);
      }
    }

    const currentRetryCount = this.retryCount.get(this.getCacheKey(requestConfig)) || 0;

    if (
      [404, 429].includes(error.response?.status ?? 0) &&
      currentRetryCount < CONFIG.MAX_RETRIES
    ) {
      this.retryCount.set(this.getCacheKey(requestConfig), currentRetryCount + 1);
      // console.log(`Retrying request (${currentRetryCount + 1}/${CONFIG.MAX_RETRIES})...`);
      return this.api.axiosInstance(requestConfig);
    }

    this.retryCount.delete(this.getCacheKey(requestConfig));
    return Promise.reject(error);
  }

  private setupResponseTransform(): void {
    this.api.addResponseTransform(response => {
      /* if (isHttpError(response.status)) {
        handleError(response);
      } */

      if (response.problem === 'NETWORK_ERROR') {
        // console.error({
        //   message: 'Please check your internet connection.',
        //   duration: 5000,
        //   title: 'Network Error',
        // });
      }
    });
  }

  // Public API methods
  public async get<T>(url: string, params: object = {}, config: AxiosRequestConfig = {}): Promise<ApiResponse<T>> {
    return this.api.get(url, params, config);
  }

  public async post<T>(url: string, data: object = {}, config: AxiosRequestConfig = {}): Promise<ApiResponse<T>> {
    return this.api.post(url, data, config);
  }

  public async put<T>(url: string, data: object = {}, config: AxiosRequestConfig = {}): Promise<ApiResponse<T>> {
    return this.api.put(url, data, config);
  }

  public async patch<T>(url: string, data: object = {}, config: AxiosRequestConfig = {}): Promise<ApiResponse<T>> {
    return this.api.patch(url, data, config);
  }

  public async delete<T>(url: string, config: AxiosRequestConfig = {}): Promise<ApiResponse<T>> {
    return this.api.delete(url, config);
  }

  // Delete Account Methods
  public async requestAccountDeletion(): Promise<ApiResponse<{ detail: string }>> {
    return this.api.post('/auth/close-account-request');
  }

  public async deleteAccount(code: string, email: string): Promise<ApiResponse<{ detail: string }>> {
    return this.api.post('/auth/close-account', { code, email });
  }

  /**
   * Cleanup method to stop intervals and clear cache
   * Call this when the app is being destroyed or backgrounded for extended periods
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
    this.retryCount.clear();
    // console.log('[ApiClient] Cleanup complete - intervals cleared and cache purged');
  }
}

// Create and export a singleton instance
const apiClient = new ApiClient();
export default apiClient;