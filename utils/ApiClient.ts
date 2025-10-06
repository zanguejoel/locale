import { ApiResponse, ApisauceInstance, create } from 'apisauce';
import { AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
export const API_URL_PROD = "https://api.odysseytech.ai";
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
          if (this.isCacheable(config)) {
            const cachedResponse = this.getCachedResponse(config);
            if (cachedResponse) {
              return Promise.reject({ __cached: true, response: cachedResponse });
            }
          }
          return config;
        } catch (error) {
          console.error('Cache interceptor error:', error);
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
          console.error('Cache response error:', error);
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

    const currentRetryCount = this.retryCount.get(this.getCacheKey(requestConfig)) || 0;

    if (
      [404, 429].includes(error.response?.status ?? 0) &&
      currentRetryCount < CONFIG.MAX_RETRIES
    ) {
      this.retryCount.set(this.getCacheKey(requestConfig), currentRetryCount + 1);
      console.log(`Retrying request (${currentRetryCount + 1}/${CONFIG.MAX_RETRIES})...`);
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
        console.error({
          message: 'Please check your internet connection.',
          duration: 5000,
          title: 'Network Error',
        });
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
    console.log('[ApiClient] Cleanup complete - intervals cleared and cache purged');
  }
}

// Create and export a singleton instance
const apiClient = new ApiClient();
export default apiClient;