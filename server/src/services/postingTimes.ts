export const POSTING_TIMES: Record<string, Record<string, string[]>> = {
  linkedin: {
    IN:     ['Tue 08:00', 'Wed 10:00', 'Thu 08:00', 'Fri 09:00'],
    GLOBAL: ['Tue 10:00', 'Wed 08:00', 'Thu 10:00'],
    US:     ['Tue 09:00', 'Wed 12:00', 'Thu 09:00'],
    UK:     ['Tue 08:00', 'Wed 09:00', 'Thu 08:00'],
    UAE:    ['Sun 09:00', 'Mon 10:00', 'Tue 09:00'],
    AU:     ['Tue 08:00', 'Wed 09:00', 'Thu 08:00'],
  },
  instagram: {
    IN:     ['Mon 18:00', 'Wed 12:00', 'Fri 19:00', 'Sun 11:00'],
    GLOBAL: ['Mon 09:00', 'Wed 11:00', 'Fri 10:00'],
    US:     ['Mon 11:00', 'Wed 15:00', 'Fri 10:00'],
    UK:     ['Mon 12:00', 'Wed 11:00', 'Fri 13:00'],
    UAE:    ['Mon 20:00', 'Wed 20:00', 'Fri 20:00'],
    AU:     ['Mon 09:00', 'Thu 09:00', 'Sat 10:00'],
  },
  facebook: {
    IN:     ['Wed 13:00', 'Thu 13:00', 'Fri 11:00'],
    GLOBAL: ['Wed 15:00', 'Thu 13:00', 'Fri 11:00'],
    US:     ['Wed 13:00', 'Thu 14:00', 'Fri 12:00'],
    UK:     ['Wed 13:00', 'Thu 13:00', 'Fri 11:00'],
    UAE:    ['Sun 13:00', 'Mon 13:00', 'Wed 13:00'],
    AU:     ['Wed 11:00', 'Thu 11:00', 'Fri 10:00'],
  },
  twitter: {
    IN:     ['Mon 09:00', 'Wed 12:00', 'Fri 17:00'],
    GLOBAL: ['Mon 08:00', 'Wed 09:00', 'Fri 12:00'],
    US:     ['Mon 09:00', 'Wed 12:00', 'Fri 09:00'],
    UK:     ['Mon 08:00', 'Wed 09:00', 'Fri 08:00'],
    UAE:    ['Sun 09:00', 'Mon 12:00', 'Wed 17:00'],
    AU:     ['Mon 08:00', 'Wed 10:00', 'Fri 08:00'],
  },
  youtube: {
    IN:     ['Fri 17:00', 'Sat 11:00', 'Sun 11:00'],
    GLOBAL: ['Thu 17:00', 'Fri 17:00', 'Sat 10:00'],
    US:     ['Thu 14:00', 'Fri 12:00', 'Sat 11:00'],
    UK:     ['Thu 16:00', 'Fri 15:00', 'Sat 10:00'],
    UAE:    ['Thu 20:00', 'Fri 20:00', 'Sat 11:00'],
    AU:     ['Thu 18:00', 'Fri 17:00', 'Sat 10:00'],
  },
  tiktok: {
    IN:     ['Tue 19:00', 'Thu 19:00', 'Fri 18:00', 'Sat 13:00'],
    GLOBAL: ['Tue 19:00', 'Thu 19:00', 'Sat 11:00'],
    US:     ['Tue 09:00', 'Thu 19:00', 'Fri 22:00'],
    UK:     ['Tue 19:00', 'Thu 20:00', 'Sat 10:00'],
    UAE:    ['Mon 20:00', 'Thu 20:00', 'Sat 21:00'],
    AU:     ['Tue 19:00', 'Thu 19:00', 'Sat 10:00'],
  },
  pinterest: {
    IN:     ['Sat 20:00', 'Sun 20:00', 'Fri 21:00'],
    GLOBAL: ['Sat 21:00', 'Sun 20:00', 'Fri 20:00'],
    US:     ['Sat 20:00', 'Sun 21:00', 'Fri 20:00'],
    UK:     ['Sat 20:00', 'Sun 19:00', 'Fri 20:00'],
    UAE:    ['Sat 21:00', 'Sun 21:00', 'Fri 21:00'],
    AU:     ['Sat 20:00', 'Sun 19:00', 'Fri 19:00'],
  },
  whatsapp: {
    IN:     ['Mon 10:00', 'Wed 10:00', 'Fri 10:00'],
    GLOBAL: ['Mon 09:00', 'Wed 09:00', 'Fri 09:00'],
    US:     ['Mon 10:00', 'Wed 10:00', 'Fri 10:00'],
    UK:     ['Mon 09:00', 'Wed 09:00', 'Fri 09:00'],
    UAE:    ['Sun 10:00', 'Mon 10:00', 'Wed 10:00'],
    AU:     ['Mon 09:00', 'Wed 09:00', 'Fri 09:00'],
  },
  google_ads: {
    IN:     ['Mon 09:00', 'Wed 11:00', 'Thu 10:00', 'Fri 09:00'],
    GLOBAL: ['Mon 09:00', 'Tue 10:00', 'Thu 11:00'],
    US:     ['Tue 10:00', 'Wed 11:00', 'Thu 10:00'],
    UK:     ['Mon 09:00', 'Wed 10:00', 'Thu 09:00'],
    UAE:    ['Sun 09:00', 'Mon 10:00', 'Wed 10:00'],
    AU:     ['Mon 09:00', 'Wed 10:00', 'Thu 09:00'],
  },
  email: {
    IN:     ['Tue 09:00', 'Thu 10:00', 'Sat 10:00'],
    GLOBAL: ['Tue 10:00', 'Thu 09:00'],
    US:     ['Tue 10:00', 'Thu 14:00'],
    UK:     ['Tue 09:00', 'Thu 10:00'],
    UAE:    ['Sun 10:00', 'Tue 10:00', 'Thu 10:00'],
    AU:     ['Tue 09:00', 'Thu 10:00'],
  },
};

const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export interface SlotRating {
  day: string;
  time: string;
  rating: 'optimal' | 'acceptable' | 'avoid';
}

export function getPostingSchedule(params: {
  platforms: string[];
  location: string;
  postsPerWeek: number;
}): Record<string, { recommended: string[]; grid: SlotRating[] }> {
  const { platforms, location, postsPerWeek } = params;
  const loc = location.toUpperCase();

  const result: Record<string, { recommended: string[]; grid: SlotRating[] }> = {};

  for (const platform of platforms) {
    const key = platform.toLowerCase();
    const times = POSTING_TIMES[key]?.[loc] ?? POSTING_TIMES[key]?.['GLOBAL'] ?? [];
    const recommended = times.slice(0, postsPerWeek);

    const optimalSet = new Set(recommended);
    const allTimes = Object.values(POSTING_TIMES[key] ?? {}).flat();
    const acceptableSet = new Set(allTimes.filter(t => !optimalSet.has(t)));

    const grid: SlotRating[] = [];
    for (const day of DAY_ORDER) {
      for (const hour of [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]) {
        const time = `${String(hour).padStart(2, '0')}:00`;
        const slot = `${day} ${time}`;
        grid.push({
          day,
          time,
          rating: optimalSet.has(slot) ? 'optimal' : acceptableSet.has(slot) ? 'acceptable' : 'avoid',
        });
      }
    }

    result[platform] = { recommended, grid };
  }

  return result;
}
