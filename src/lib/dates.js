// Dates in the content are calendar days (front matter `2026-01-27`), parsed as UTC midnight.
// Format them in UTC too, so a build machine in another time zone cannot shift a day.
const fmt = (opts) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...opts });
const day = fmt({ month: 'short', day: 'numeric', year: 'numeric' });
const month = fmt({ month: 'short', year: 'numeric' });

/** 2026-01-27 */
export const isoDay = (d) => d.toISOString().slice(0, 10);
/** 2026-09 */
export const isoMonth = (d) => d.toISOString().slice(0, 7);
/** Jan 27, 2026 */
export const dayLabel = (d) => day.format(d);
/** Jan 2026 */
export const monthLabel = (d) => month.format(d);
