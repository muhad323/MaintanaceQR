interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory rate limiting store (sliding window)
const rateLimitMap = new Map<string, RateLimitRecord>();

/**
 * Check and record a rate limit entry
 * @param key unique identifier (e.g. `login:${ip}` or `add_log:${userId}`)
 * @param maxRequests maximum allowed requests within the window
 * @param windowMs window duration in milliseconds
 * @returns { allowed: boolean; remaining: number; retryAfterSeconds: number }
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
  const existing = rateLimitMap.get(key);

  if (!existing || now > existing.resetAt) {
    rateLimitMap.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      retryAfterSeconds: 0,
    };
  }

  if (existing.count >= maxRequests) {
    const retryAfterSeconds = Math.ceil((existing.resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: maxRequests - existing.count,
    retryAfterSeconds: 0,
  };
}

/**
 * Clean up expired rate limits periodically
 */
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    rateLimitMap.forEach((record, key) => {
      if (now > record.resetAt) {
        rateLimitMap.delete(key);
      }
    });
  }, 60000); // Clean every minute
}
