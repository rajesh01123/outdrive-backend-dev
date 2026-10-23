import sanitizeHtml from 'sanitize-html';

// Admin HTML goes straight into the app's WebView, so only plain formatting survives — no scripts, styles or events.
const options = {
  allowedTags: ['h2', 'h3', 'h4', 'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li', 'a', 'blockquote', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
  allowedAttributes: { a: ['href'] },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  // The page already has an <h1> title, so editor headings start at h2.
  transformTags: { h1: 'h2' },
  exclusiveFilter: (frame) => frame.tag === 'p' && !frame.text.trim() && !frame.mediaChildren?.length
};

export const sanitizeCmsHtml = (html) => sanitizeHtml(String(html || ''), options).trim();

// Visible text, used to reject a page whose content is empty after sanitizing.
export const htmlText = (html) => sanitizeHtml(String(html || ''), { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, ' ').trim();
