import { Request, Response, NextFunction } from 'express';
import { twilioService } from '../services/twilio';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const RATE_LIMIT_WINDOW = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS = 5; // 5 OTP requests per window

function cleanupExpiredEntries() {
  const now = Date.now();
  const entries = Array.from(rateLimitStore.entries());
  for (const [key, entry] of entries) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

setInterval(cleanupExpiredEntries, 60000); // Cleanup every minute

export function otpRateLimiter(req: Request, res: Response, next: NextFunction) {
  let identifier: string;
  
  if (req.body.phone) {
    try {
      identifier = twilioService.normalizePhoneNumber(req.body.phone);
    } catch {
      identifier = req.ip || 'unknown';
    }
  } else {
    identifier = req.ip || 'unknown';
  }
  
  if (!identifier || identifier === 'unknown') {
    return res.status(400).json({ error: 'Invalid request' });
  }

  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || entry.resetAt <= now) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW,
    });
    return next();
  }

  if (entry.count >= MAX_REQUESTS) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return res.status(429).json({
      error: 'Too many OTP requests',
      retryAfter: retryAfterSeconds,
    });
  }

  entry.count++;
  return next();
}
