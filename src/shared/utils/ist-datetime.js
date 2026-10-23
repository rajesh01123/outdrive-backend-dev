// A date-time without an offset ("2026-10-23 10:30" or "2026-10-23T10:30") is Indian time; the service only runs in India.
const LOCAL_TIME = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/;

/** Returns a Date, null for an empty value, or undefined when the value cannot be read. */
export const parseIstDatetime = (value) => {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return null;
  const date = new Date(LOCAL_TIME.test(raw) ? `${raw.replace(' ', 'T')}+05:30` : raw);
  return Number.isNaN(date.getTime()) ? undefined : date;
};
