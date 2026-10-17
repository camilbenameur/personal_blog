// Dates in the content are calendar days (front matter `2026-01-27`), parsed as UTC midnight.
// Format them in UTC too, so a build machine in another time zone cannot shift a day.
// Labels follow the page language: "Jan 27, 2026" in English, "27 janv. 2026" in French.
const LOCALES = { en: 'en-US', fr: 'fr-FR' };
const cache = new Map();
const fmt = (lang, kind) => {
  const key = `${lang}:${kind}`;
  if (!cache.has(key)) {
    const opts = kind === 'day' ? { month: 'short', day: 'numeric', year: 'numeric' } : { month: 'short', year: 'numeric' };
    cache.set(key, new Intl.DateTimeFormat(LOCALES[lang] ?? LOCALES.en, { timeZone: 'UTC', ...opts }));
  }
  return cache.get(key);
};

/** 2026-01-27 */
export const isoDay = (d) => d.toISOString().slice(0, 10);
/** 2026-09 */
export const isoMonth = (d) => d.toISOString().slice(0, 7);
/** Jan 27, 2026 / 27 janv. 2026 */
export const dayLabel = (d, lang = 'en') => fmt(lang, 'day').format(d);
/** Jan 2026 / janv. 2026 */
export const monthLabel = (d, lang = 'en') => fmt(lang, 'month').format(d);
