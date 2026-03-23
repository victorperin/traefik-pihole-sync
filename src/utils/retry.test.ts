import { withRetry, isRetryableError, calculateDelay, RetryOptions } from './retry';

// Mock logger to prevent console output during tests
jest.mock('../logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('retry utility', () => {
  describe('isRetryableError', () => {
    it('should return true for EAI_AGAIN error', () => {
      const error = new Error('getaddrinfo EAI_AGAIN localhost');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for ECONNREFUSED error', () => {
      const error = new Error('connect ECONNREFUSED xxx.xxx.xxx.xxx:8080');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for ETIMEDOUT error', () => {
      const error = new Error('connect ETIMEDOUT');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for ENOTFOUND error', () => {
      const error = new Error('getaddrinfo ENOTFOUND example.com');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return false for non-network errors', () => {
      const error = new Error('Some other error');
      expect(isRetryableError(error)).toBe(false);
    });

    it('should return false for non-retryable HTTP errors', () => {
      const error = new Error('Request failed with status code 404');
      expect(isRetryableError(error)).toBe(false);
    });
  });

  describe('calculateDelay', () => {
    const defaultOptions: RetryOptions = {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 30000,
    };

    it('should return initial delay for first attempt', () => {
      const delay = calculateDelay(1, defaultOptions);
      expect(delay).toBeGreaterThanOrEqual(1000);
      expect(delay).toBeLessThan(1100);
    });

    it('should increase delay for subsequent attempts', () => {
      const delay1 = calculateDelay(1, defaultOptions);
      const delay2 = calculateDelay(2, defaultOptions);
      expect(delay2).toBeGreaterThan(delay1);
    });

    it('should cap delay at maxDelay', () => {
      const maxOptions: RetryOptions = {
        maxRetries: 10,
        initialDelay: 1000,
        maxDelay: 5000,
      };
      const delay = calculateDelay(10, maxOptions);
      expect(delay).toBeLessThanOrEqual(5100);
    });
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await withRetry(fn);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on transient failure and succeed', async () => {
      const attempts = ['fail', 'fail', 'success'];
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('EAI_AGAIN'))
        .mockRejectedValueOnce(new Error('EAI_AGAIN'))
        .mockResolvedValueOnce('success');
      
      const result = await withRetry(fn, { maxRetries: 3, initialDelay: 10 });
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries exhausted', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('EAI_AGAIN'));
      
      await expect(
        withRetry(fn, { maxRetries: 2, initialDelay: 10 })
      ).rejects.toThrow('EAI_AGAIN');
      
      expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('should not retry non-retryable errors', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Invalid input'));
      
      await expect(
        withRetry(fn, { maxRetries: 3, initialDelay: 10 })
      ).rejects.toThrow('Invalid input');
      
      expect(fn).toHaveBeenCalledTimes(1); // only initial attempt, no retries
    });

    it('should respect custom retry options', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('EAI_AGAIN'))
        .mockResolvedValue('success');
      
      const result = await withRetry(fn, { 
        maxRetries: 5, 
        initialDelay: 100,
        maxDelay: 1000 
      });
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });
});