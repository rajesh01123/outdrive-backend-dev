// Public booking numbers are derived from the row id, so no extra column or counter is needed.
const OFFSET = 1000;

export const bookingCode = (id) => `OD${OFFSET + Number(id)}`;
export const requestCode = (id) => `req_${OFFSET + Number(id)}`;

// "OD1005", "od1005", "req_1005" or "1005" -> 5; anything else -> null.
export const parseBookingCode = (value) => {
  const match = String(value || '').trim().match(/^(?:od|req_)?(\d+)$/i);
  if (!match) return null;
  const id = Number(match[1]) - OFFSET;
  return id > 0 ? id : null;
};
