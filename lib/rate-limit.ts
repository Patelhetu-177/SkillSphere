import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export async function rateLimit(identifier: string) {
    const rateLimit = new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(30, "10s"),
        analytics: false,
        prefix: "@upstash/ratelimit"
    });

    try {
        const result = await rateLimit.limit(identifier);
        return {
            success: result.success,
            remaining: result.remaining, 
            reset: result.reset, 
        };
    } catch (error) {
        console.error('Rate limit error:', error);
        return { success: true };
    }
}
