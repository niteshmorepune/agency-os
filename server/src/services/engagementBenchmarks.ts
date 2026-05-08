interface Benchmark {
  good: number;
  avg: number;
  poor: number;
}

interface TieredBenchmark extends Benchmark {
  min: number;
  max: number;
}

export const BENCHMARKS: Record<string, Record<string, TieredBenchmark> | { any: Benchmark }> = {
  instagram: {
    micro:  { min: 0,        max: 10000,   good: 5,   avg: 3,   poor: 1 },
    small:  { min: 10000,    max: 100000,  good: 3,   avg: 1.5, poor: 0.5 },
    medium: { min: 100000,   max: 1000000, good: 1.5, avg: 0.8, poor: 0.3 },
    large:  { min: 1000000,  max: Infinity, good: 0.8, avg: 0.4, poor: 0.1 },
  },
  linkedin:   { any: { good: 3,   avg: 1.5, poor: 0.5 } },
  facebook:   { any: { good: 1.5, avg: 0.8, poor: 0.3 } },
  twitter:    { any: { good: 2,   avg: 0.9, poor: 0.3 } },
  tiktok:     { any: { good: 10,  avg: 5,   poor: 2   } },
  youtube:    { any: { good: 4,   avg: 2,   poor: 0.5 } },
  pinterest:  { any: { good: 3,   avg: 1.5, poor: 0.5 } },
  instagram_reels: {
    micro:  { min: 0,        max: 10000,   good: 8,   avg: 4,   poor: 1.5 },
    small:  { min: 10000,    max: 100000,  good: 5,   avg: 2.5, poor: 0.8 },
    medium: { min: 100000,   max: 1000000, good: 3,   avg: 1.5, poor: 0.5 },
    large:  { min: 1000000,  max: Infinity, good: 1.5, avg: 0.7, poor: 0.2 },
  },
};

export type EngagementRating = 'poor' | 'below_average' | 'average' | 'good' | 'excellent';

export function getBenchmark(platform: string, followers: number): Benchmark {
  const platformKey = platform.toLowerCase();
  const data = BENCHMARKS[platformKey];
  if (!data) return { good: 2, avg: 1, poor: 0.5 };

  if ('any' in data) return (data as { any: Benchmark }).any;

  const tiers = data as Record<string, TieredBenchmark>;
  for (const tier of Object.values(tiers)) {
    if (followers >= tier.min && followers < tier.max) {
      return { good: tier.good, avg: tier.avg, poor: tier.poor };
    }
  }
  return { good: 2, avg: 1, poor: 0.5 };
}

export function calculateEngagementRate(params: {
  followers: number;
  avgLikes: number;
  avgComments: number;
  avgShares: number;
  avgReach?: number;
}): number {
  const { followers, avgLikes, avgComments, avgShares, avgReach } = params;
  const denominator = avgReach && avgReach > 0 ? avgReach : followers;
  if (denominator === 0) return 0;
  return ((avgLikes + avgComments + avgShares) / denominator) * 100;
}

export function getRating(rate: number, benchmark: Benchmark): EngagementRating {
  if (rate >= benchmark.good * 1.5) return 'excellent';
  if (rate >= benchmark.good)       return 'good';
  if (rate >= benchmark.avg)        return 'average';
  if (rate >= benchmark.poor)       return 'below_average';
  return 'poor';
}

export function getPercentile(rate: number, platform: string, followers: number): number {
  const benchmark = getBenchmark(platform, followers);
  if (rate >= benchmark.good * 1.5) return 95;
  if (rate >= benchmark.good)       return 75;
  if (rate >= benchmark.avg)        return 50;
  if (rate >= benchmark.poor)       return 25;
  return 10;
}
