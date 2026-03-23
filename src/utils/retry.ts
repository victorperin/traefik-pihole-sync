import axios, { AxiosError } from 'axios';
import { logger } from '../logger';

/**
 * Retry configuration options
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries: number;
  /** Initial delay in milliseconds (default: 1000) */
  initialDelay: number;
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelay: number;
  /** Callback called before each retry */
  onRetry?: (attempt: number, error: Error, delay: number) => void;
}

/**
 * Default retry options
 */
const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
};

/**
 * Error codes that should trigger a retry
 */
const RETRYABLE_ERROR_CODES = [
  'EAI_AGAIN',      // DNS lookup failure
  'ECONNREFUSED',   // Connection refused
  'ETIMEDOUT',      // Connection timed out
  'ENOTFOUND',      // Host not found
  'ENETUNREACH',    // Network unreachable
  'ECONNRESET',     // Connection reset by peer
];

/**
 * Checks if an error is retryable based on its code or message
 */
export function isRetryableError(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    
    // Check if it's a network error (no response)
    if (axiosError.code && RETRYABLE_ERROR_CODES.includes(axiosError.code)) {
      return true;
    }
    
    // Check for timeout
    if (axiosError.code === 'ECONNABORTED') {
      return true;
    }
    
    // Check response status for retryable codes
    if (axiosError.response) {
      const status = axiosError.response.status;
      // Retry on 502, 503, 504 (Bad Gateway, Service Unavailable, Gateway Timeout)
      if (status === 502 || status === 503 || status === 504) {
        return true;
      }
    }
    
    // Check message for DNS errors
    if (axiosError.message && axiosError.message.includes('getaddrinfo')) {
      return true;
    }
    
    return false;
  }
  
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    // Check for common network error patterns
    if (message.includes('eai_again') || 
        message.includes('connect econnrefused') ||
        message.includes('connect etimedout') ||
        message.includes('getaddrinfo') ||
        message.includes('socket')) {
      return true;
    }
  }
  
  return false;
}

/**
 * Calculates the delay for the next retry using exponential backoff
 * with jitter
 */
export function calculateDelay(attempt: number, options: RetryOptions): number {
  // Exponential backoff: initialDelay * 2^attempt
  const exponentialDelay = options.initialDelay * Math.pow(2, attempt - 1);
  
  // Add jitter (random value between 0 and 100ms)
  const jitter = Math.random() * 100;
  
  // Cap at maxDelay
  const delay = Math.min(exponentialDelay + jitter, options.maxDelay);
  
  return Math.floor(delay);
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Executes an async function with retry logic
 * 
 * @param fn The function to execute
 * @param options Retry configuration options
 * @returns The result of the function
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const mergedOptions: RetryOptions = {
    ...DEFAULT_RETRY_OPTIONS,
    ...options,
  };
  
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= mergedOptions.maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if we should retry
      const isLastAttempt = attempt > mergedOptions.maxRetries;
      
      if (!isRetryableError(error) || isLastAttempt) {
        throw error;
      }
      
      const delay = calculateDelay(attempt, mergedOptions);
      
      logger.warn(
        { attempt, maxRetries: mergedOptions.maxRetries, delay, error: lastError.message },
        'Request failed, retrying...'
      );
      
      if (mergedOptions.onRetry) {
        mergedOptions.onRetry(attempt, lastError, delay);
      }
      
      await sleep(delay);
    }
  }
  
  // This should never be reached, but TypeScript needs it
  throw lastError || new Error('Max retries exceeded');
}

/**
 * Creates a retryable version of an axios request
 * 
 * @param axiosFn The axios function to wrap (e.g., axios.get)
 * @param options Retry configuration options
 * @returns A function that wraps the axios call with retry logic
 */
export function createRetryableRequest(
  options: Partial<RetryOptions> = {}
) {
  return async function retryableRequest<T>(
    ...args: Parameters<typeof axios.get>
  ): Promise<T> {
    return withRetry(
      async () => {
        // We need to handle different axios methods with different argument patterns
        // This is a simplified approach that should work for most cases
        const method = args[0];
        const url = typeof method === 'string' ? method : '';
        const config = typeof method === 'object' ? method : args[1];
        
        // Reconstruct the call based on what we have
        if (url && config) {
          return axios.get(url, config) as Promise<T>;
        } else if (url) {
          return axios.get(url) as Promise<T>;
        }
        
        throw new Error('Invalid arguments for axios request');
      },
      options
    );
  };
}