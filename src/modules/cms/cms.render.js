// Server-rendered, script-free pages for the app's WebView. Text is escaped; CMS bodies are pre-sanitized HTML.
export const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const themes = {
  light: { bg: '#f6f7f9', card: '#ffffff', ink: '#15181d', muted: '#5f6670', line: '#e3e6ea', gold: '#b7860b', accent: '#f5b71b', soft: '#fff6dc' },
  dark: { bg: '#0d1116', card: '#161b21', ink: '#f3f4f6', muted: '#a4aab3', line: '#2a3038', gold: '#ffc12b', accent: '#ffc12b', soft: '#2a2310' }
};

const formatDate = (date) => new Date(date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' });

const styles = (t) => `
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:${t.bg};color:${t.ink};font:16px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;overflow-wrap:anywhere}
main{max-width:760px;margin:0 auto;padding:20px 18px 40px}
header{padding:6px 0 16px;border-bottom:1px solid ${t.line};margin-bottom:18px}
.brand{display:inline-block;margin-bottom:10px;color:${t.gold};font:700 11px/1 ui-monospace,Menlo,Consolas,monospace;letter-spacing:2px}
h1{margin:0;font-size:26px;line-height:1.25;letter-spacing:-.3px}
h2{margin:26px 0 8px;font-size:20px;line-height:1.3}h3{margin:20px 0 6px;font-size:17px}h4{margin:16px 0 4px;font-size:15px}
p{margin:0 0 12px}ul,ol{margin:0 0 14px;padding-left:22px}li{margin:4px 0}
a{color:${t.gold};font-weight:600}blockquote{margin:14px 0;padding:10px 14px;border-left:3px solid ${t.accent};background:${t.soft};border-radius:6px}
hr{border:0;border-top:1px solid ${t.line};margin:22px 0}
table{width:100%;border-collapse:collapse;margin:12px 0;font-size:14px;display:block;overflow-x:auto}th,td{border:1px solid ${t.line};padding:8px;text-align:left;vertical-align:top}th{background:${t.soft}}
.updated{margin-top:28px;padding-top:14px;border-top:1px solid ${t.line};color:${t.muted};font-size:13px}
.group{margin:22px 0 8px;color:${t.gold};font:700 12px/1 ui-monospace,Menlo,Consolas,monospace;letter-spacing:1.5px;text-transform:uppercase}
details{background:${t.card};border:1px solid ${t.line};border-radius:12px;margin:8px 0}
summary{cursor:pointer;list-style:none;padding:14px 44px 14px 16px;font-weight:700;position:relative}
summary::-webkit-details-marker{display:none}
summary::after{content:"+";position:absolute;right:16px;top:11px;color:${t.gold};font-size:22px;font-weight:400}
details[open] summary::after{content:"−"}
.answer{padding:0 16px 14px;color:${t.muted};white-space:pre-line}
.contact{display:flex;align-items:center;gap:14px;background:${t.card};border:1px solid ${t.line};border-radius:12px;padding:14px 16px;margin:10px 0;color:${t.ink};text-decoration:none;font-weight:400}
.contact i{flex:0 0 40px;height:40px;border-radius:12px;background:${t.soft};color:${t.gold};display:grid;place-items:center;font-style:normal;font-size:18px}
.contact b{display:block;font-size:15px}.contact span{color:${t.muted};font-size:14px}
.contact em{margin-left:auto;color:${t.gold};font-style:normal;font-size:20px}
.empty{color:${t.muted};text-align:center;padding:40px 0}
`;

/** Full HTML document. bodyHtml must already be safe (sanitized CMS HTML or escaped text). */
export const renderDocument = ({ title, bodyHtml, updatedAt, theme = 'light', header = true }) => {
  const t = themes[theme] || themes.light;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="${theme === 'dark' ? 'dark' : 'light'}">
<title>${escapeHtml(title)} · OutDrive</title>
<style>${styles(t)}</style>
</head>
<body>
<main>
${header ? `<header><span class="brand">OUTDRIVE</span><h1>${escapeHtml(title)}</h1></header>` : ''}
${bodyHtml}
${updatedAt ? `<p class="updated">Last updated: ${formatDate(updatedAt)}</p>` : ''}
</main>
</body>
</html>`;
};

export const renderFaqBody = (faqs) => {
  if (!faqs.length) return '<p class="empty">No questions yet.</p>';
  const groups = new Map();
  for (const faq of faqs) groups.set(faq.category, [...(groups.get(faq.category) || []), faq]);
  return [...groups.entries()].map(([category, items]) => `<p class="group">${escapeHtml(category)}</p>${items
    .map((faq) => `<details><summary>${escapeHtml(faq.question)}</summary><div class="answer">${escapeHtml(faq.answer)}</div></details>`).join('')}`).join('');
};

const contactIcons = { phone: '☎', whatsapp: '✆', email: '✉', address: '⌖', website: '↗', hours: '◷' };

export const renderSupportBody = (contacts, actionUrl) => {
  if (!contacts.length) return '<p class="empty">Support details will be added soon.</p>';
  return contacts.map((contact) => {
    const inner = `<i>${contactIcons[contact.type] || '•'}</i><span><b>${escapeHtml(contact.label)}</b><span>${escapeHtml(contact.value)}</span></span>`;
    const href = actionUrl(contact);
    return href ? `<a class="contact" href="${escapeHtml(href)}">${inner}<em>›</em></a>` : `<div class="contact">${inner}</div>`;
  }).join('');
};

export const renderNotFound = ({ theme }) => renderDocument({
  title: 'Page not found',
  bodyHtml: '<p class="empty">This page is not available. Please go back and try again.</p>',
  theme
});
