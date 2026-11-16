type Bucket = {
    count: number;
    resetAt: number;
};
export const MAX_TRACKED_KEYS = 10000;
const OVERFLOW_KEY = "\u0000overflow";
export const createRateLimiter = ({ limit, windowMs }: {
    limit: number;
    windowMs: number;
}) => {
    const buckets = new Map<string, Bucket>();
    const pruneExpired = (now: number) => {
        for (const [key, bucket] of buckets) {
            if (bucket.resetAt > now)
                break;
            buckets.delete(key);
        }
    };
    const resolveKey = (key: string, now: number) => {
        pruneExpired(now);
        if (buckets.has(key))
            return key;
        const trackedCount = buckets.size - (buckets.has(OVERFLOW_KEY) ? 1 : 0);
        return trackedCount < MAX_TRACKED_KEYS ? key : OVERFLOW_KEY;
    };
    return {
        retryAfter(key: string): number {
            const now = Date.now();
            const bucket = buckets.get(resolveKey(key, now));
            if (!bucket || bucket.count < limit)
                return 0;
            return Math.ceil((bucket.resetAt - now) / 1000);
        },
        hit(key: string) {
            const now = Date.now();
            const resolved = resolveKey(key, now);
            const bucket = buckets.get(resolved);
            if (bucket) {
                bucket.count += 1;
            }
            else {
                buckets.set(resolved, { count: 1, resetAt: now + windowMs });
            }
        },
        reset(key: string) {
            buckets.delete(key);
        },
    };
};
type FailureRecord = {
    failures: number;
    lockedUntil: number;
    expiresAt: number;
};
export const createBackoffLimiter = ({ freeAttempts, baseDelayMs, maxDelayMs, resetAfterMs, }: {
    freeAttempts: number;
    baseDelayMs: number;
    maxDelayMs: number;
    resetAfterMs: number;
}) => {
    const records = new Map<string, FailureRecord>();
    const expiryMs = Math.max(resetAfterMs, maxDelayMs);
    const pruneExpired = (now: number) => {
        for (const [key, record] of records) {
            if (record.expiresAt > now)
                break;
            records.delete(key);
        }
    };
    const resolveKey = (key: string, now: number) => {
        pruneExpired(now);
        if (records.has(key))
            return key;
        const trackedCount = records.size - (records.has(OVERFLOW_KEY) ? 1 : 0);
        return trackedCount < MAX_TRACKED_KEYS ? key : OVERFLOW_KEY;
    };
    return {
        retryAfter(key: string): number {
            const now = Date.now();
            const record = records.get(resolveKey(key, now));
            if (!record || record.lockedUntil <= now)
                return 0;
            return Math.ceil((record.lockedUntil - now) / 1000);
        },
        fail(key: string) {
            const now = Date.now();
            const resolved = resolveKey(key, now);
            const failures = (records.get(resolved)?.failures ?? 0) + 1;
            const excess = failures - freeAttempts;
            const delay = excess >= 0 ? Math.min(baseDelayMs * 2 ** excess, maxDelayMs) : 0;
            records.delete(resolved);
            records.set(resolved, {
                failures,
                lockedUntil: delay > 0 ? now + delay : 0,
                expiresAt: now + expiryMs,
            });
        },
        reset(key: string) {
            records.delete(key);
        },
    };
};
export const createConcurrencyLimiter = ({ maxConcurrent, maxQueued, }: {
    maxConcurrent: number;
    maxQueued: number;
}) => {
    let active = 0;
    const waiting: Array<() => void> = [];
    const release = () => {
        const next = waiting.shift();
        if (next)
            next();
        else
            active -= 1;
    };
    return {
        async tryRun<T>(task: () => Promise<T>): Promise<{
            ok: true;
            value: T;
        } | {
            ok: false;
        }> {
            if (active < maxConcurrent) {
                active += 1;
            }
            else if (waiting.length < maxQueued) {
                await new Promise<void>((resolve) => waiting.push(resolve));
            }
            else {
                return { ok: false };
            }
            try {
                return { ok: true, value: await task() };
            }
            finally {
                release();
            }
        },
    };
};
const MAX_IP_LENGTH = 45;
const IP_PATTERN = /^[0-9a-fA-F.:]+$/;
const getTrustedProxyHops = (): number => {
    const hops = Number(process.env.TRUSTED_PROXY_HOPS ?? 0);
    return Number.isInteger(hops) && hops > 0 ? hops : 0;
};
export const getClientIp = (request: Request): string | null => {
    const hops = getTrustedProxyHops();
    if (hops === 0)
        return null;
    const forwarded = request.headers.get("x-forwarded-for");
    if (!forwarded)
        return null;
    const chain = forwarded.split(",").map((part) => part.trim());
    const candidate = chain[chain.length - hops];
    if (!candidate || candidate.length > MAX_IP_LENGTH || !IP_PATTERN.test(candidate)) {
        return null;
    }
    return candidate;
};
