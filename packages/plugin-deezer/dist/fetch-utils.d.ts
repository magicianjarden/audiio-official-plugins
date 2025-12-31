/**
 * Protected Fetch Utilities for Deezer Plugin
 *
 * Implements rate limiting, circuit breaker, request deduplication,
 * exponential backoff, and User-Agent rotation to prevent API blocks.
 */
type CircuitState = 'closed' | 'open' | 'half-open';
declare class DeezerFetchClient {
    private circuitState;
    private failureCount;
    private lastFailureTime;
    private halfOpenSuccesses;
    private readonly circuitConfig;
    private readonly rateLimitConfig;
    private requestQueue;
    private activeRequests;
    private lastRequestTime;
    private requestInterval;
    private inFlightRequests;
    private userAgent;
    private proxyUrl;
    constructor();
    private getRandomUserAgent;
    private rotateUserAgent;
    private startRateLimiter;
    private isCircuitOpen;
    private recordSuccess;
    private recordFailure;
    private calculateBackoff;
    private sleep;
    /**
     * Build the request URL, applying proxy if configured
     */
    private buildRequestUrl;
    /**
     * Get circuit breaker status for monitoring
     */
    getCircuitStatus(): {
        state: CircuitState;
        failures: number;
        canRetryAt: number | null;
    };
    /**
     * Protected fetch with all safeguards
     */
    fetch(url: string, options?: RequestInit): Promise<Response>;
    /**
     * Fetch and parse JSON with all safeguards
     */
    fetchJson<T>(url: string, options?: RequestInit): Promise<T>;
    /**
     * Set proxy URL for requests
     */
    setProxyUrl(url: string | null): void;
    /**
     * Reset circuit breaker (for testing/recovery)
     */
    resetCircuitBreaker(): void;
    /**
     * Cleanup
     */
    destroy(): void;
}
export declare const deezerFetch: DeezerFetchClient;
export declare const protectedFetch: (url: string, options?: RequestInit) => Promise<Response>;
export declare const protectedFetchJson: <T>(url: string, options?: RequestInit) => Promise<T>;
export declare const getCircuitStatus: () => {
    state: CircuitState;
    failures: number;
    canRetryAt: number | null;
};
export declare const resetCircuitBreaker: () => void;
export declare const setProxyUrl: (url: string | null) => void;
export {};
//# sourceMappingURL=fetch-utils.d.ts.map