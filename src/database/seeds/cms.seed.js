import { CmsPage, Faq, SupportContact } from '../models/index.js';

// Starter content for the app's WebView pages. The legal pages are drafts to be reviewed before launch;
// everything is editable in admin → Content.
const pages = [
  {
    slug: 'about-us', title: 'About Us', audience: 'all',
    content: `<p>OutDrive is a ride and delivery app from Indore, built so you can move around your city — and beyond it — from one place.</p>
<h2>What you can do with OutDrive</h2>
<ul><li><strong>City rides</strong> on bike, auto or car, booked in seconds.</li><li><strong>Shared rides</strong> — pay only for your seat.</li><li><strong>Outstation and round trips</strong> to nearby cities.</li><li><strong>Scheduled rides</strong> booked ahead of time.</li><li><strong>Parcel delivery</strong> on bike or 3 wheeler.</li></ul>
<h2>Our promise</h2>
<p>Clear fares before you book, verified drivers, and support that answers when you need it.</p>`
  },
  {
    slug: 'terms-and-conditions', title: 'Terms & Conditions', audience: 'all',
    content: `<p>These terms apply when you use the OutDrive app and services. By creating an account or booking a ride or delivery, you agree to them.</p>
<h2>1. Your account</h2>
<p>You need a valid Indian mobile number to sign up. Keep your account details correct and do not share your login with others. You are responsible for activity on your account.</p>
<h2>2. Bookings and fares</h2>
<p>The fare shown before booking is an estimate based on distance, time and the vehicle you choose. The final fare can change because of route changes, waiting time, tolls, parking or other charges that apply during the trip.</p>
<h2>3. Cancellations</h2>
<p>Each service has its own cancellation policy, shown in the app before you book. A cancellation fee may apply after a driver has been assigned.</p>
<h2>4. Payments</h2>
<p>You can pay by the methods shown in the app. Wallet balance can be used where it is offered.</p>
<h2>5. Behaviour</h2>
<p>Treat drivers and other riders with respect. Do not carry illegal, dangerous or prohibited items, including in parcels. We may suspend accounts that break these rules.</p>
<h2>6. Liability</h2>
<p>OutDrive connects you with independent drivers. We work to keep every trip safe, but to the extent allowed by law we are not liable for indirect losses arising from a trip.</p>
<h2>7. Changes</h2>
<p>We may update these terms. The date at the bottom of this page shows the latest version.</p>`
  },
  {
    slug: 'privacy-policy', title: 'Privacy Policy', audience: 'all',
    content: `<p>This policy explains what information OutDrive collects, why, and the choices you have.</p>
<h2>Information we collect</h2>
<ul><li><strong>Account details:</strong> name, mobile number, profile photo and emergency contact you add.</li><li><strong>Trip details:</strong> pickup and drop locations, saved places, route, fares and payment method.</li><li><strong>Device details:</strong> device and app information used to keep your login secure.</li><li><strong>Location:</strong> your location while you book and during a trip, to find nearby drivers and show the route.</li></ul>
<h2>How we use it</h2>
<p>To provide rides and deliveries, calculate fares, keep trips safe, prevent fraud, give support and improve the app.</p>
<h2>Sharing</h2>
<p>We share the trip details a driver needs to complete your booking. We do not sell your personal information.</p>
<h2>Your choices</h2>
<p>You can update your profile, remove saved places and delete your account from the app. Deleting your account signs you out of every device.</p>
<h2>Contact</h2>
<p>For privacy questions write to <a href="mailto:support@outdrive.app">support@outdrive.app</a>.</p>`
  },
  {
    slug: 'refund-policy', title: 'Refund Policy', audience: 'user',
    content: `<p>If you were charged incorrectly, we will make it right.</p>
<h2>When you can get a refund</h2>
<ul><li>You were charged for a trip or delivery that did not happen.</li><li>You were charged twice for the same booking.</li><li>A cancellation fee was charged when it should not have been.</li></ul>
<h2>How refunds are paid</h2>
<p>Approved refunds go back to the original payment method or to your OutDrive wallet. Bank and card refunds can take a few working days to show.</p>
<h2>How to ask</h2>
<p>Contact support from <strong>Help &amp; Support</strong> with your booking ID.</p>`
  },
  {
    slug: 'cancellation-policy', title: 'Cancellation Policy', audience: 'user',
    content: `<p>You can cancel any booking from the app.</p>
<h2>City rides and scheduled rides</h2>
<p>Free cancellation until a driver is assigned. After the driver is assigned, a cancellation fee may apply. Scheduled rides can be cancelled free of charge up to 30 minutes before the pickup time.</p>
<h2>Outstation and round trips</h2>
<p>Free cancellation up to 1 hour before pickup. Later cancellations may be charged.</p>
<h2>Parcel delivery</h2>
<p>Free cancellation until the parcel is picked up. After pickup, the delivery cannot be cancelled.</p>
<h2>If the driver cancels</h2>
<p>You are never charged when a driver cancels. We will help you find another ride.</p>`
  },
  {
    slug: 'driver-terms', title: 'Driver Terms', audience: 'driver',
    content: `<p>These terms apply to drivers who partner with OutDrive.</p>
<h2>Joining</h2>
<p>You need a valid driving licence, vehicle registration, insurance and the permits your vehicle requires. Your documents are verified before your account is activated.</p>
<h2>Earnings</h2>
<p>OutDrive does not deduct a commission from your ride earnings. Any platform fee or subscription will be shown to you clearly before it applies.</p>
<h2>On every trip</h2>
<ul><li>Verify the trip OTP before starting.</li><li>Follow traffic rules and treat customers with respect.</li><li>Do not carry prohibited items in parcels.</li></ul>
<h2>Account suspension</h2>
<p>Accounts may be suspended for expired documents, safety complaints or misuse of the app.</p>`
  }
];

const faqs = [
  ['Booking', 'How do I book a ride?', 'Open the app, choose a service such as One Way, set your pickup and drop, pick a vehicle and tap Book. You will see the fare before you confirm.'],
  ['Booking', 'Can I book a ride for later?', 'Yes. Choose Scheduled on the home screen and pick a time from 30 minutes to 7 days ahead.'],
  ['Booking', 'How is my fare calculated?', 'The fare depends on the vehicle, the distance and the time of the trip. The full breakdown — base fare, distance, time and taxes — is shown before you book.'],
  ['Booking', 'What is a Shared Ride?', 'In a Shared Ride you book seats in a car going your way and pay only for the seats you book.'],
  ['Payments', 'Which payment methods can I use?', 'Cash and wallet are available now. Online payments will be added soon.'],
  ['Payments', 'I was charged twice. What should I do?', 'Contact support from Help & Support with your booking ID. Extra charges are refunded to your original payment method or wallet.'],
  ['Parcel', 'What can I send by parcel?', 'Documents, small packages and everyday items. Illegal, dangerous or prohibited items are not allowed.'],
  ['Account', 'How do I save my Home and Work address?', 'When you set a pickup or drop, tap the heart icon and save it as Home, Work or any name you like.'],
  ['Account', 'How do I delete my account?', 'Go to Profile → Delete account. You will receive an OTP to confirm. Deleting your account signs you out of every device.']
];

const contacts = [
  // Real contact (also on the website).
  { type: 'email', label: 'Email support', value: 'support@outdrive.app', status: 'active' },
  { type: 'address', label: 'Office', value: 'Indore, Madhya Pradesh, India', status: 'active' },
  // Placeholders: switched off until the admin enters the real numbers and hours.
  { type: 'phone', label: 'Customer care', value: '+91 90000 00000', status: 'inactive' },
  { type: 'whatsapp', label: 'WhatsApp chat', value: '+91 90000 00000', status: 'inactive' },
  { type: 'hours', label: 'Support hours', value: 'Every day, 8 AM – 10 PM', status: 'inactive' }
];

// Pages: only missing slugs are added. FAQs and contacts: only into an empty table.
// So nothing an admin edited or deleted comes back on a later seed run.
export const seedCms = async () => {
  for (const [index, page] of pages.entries()) {
    if (await CmsPage.findOne({ where: { slug: page.slug } })) continue;
    await CmsPage.create({ ...page, status: 'published', sortOrder: index + 1 });
    console.info(`  Seeded page /pages/${page.slug}.`);
  }
  if (!(await Faq.count())) {
    await Faq.bulkCreate(faqs.map(([category, question, answer], index) => ({ category, question, answer, audience: 'user', status: 'published', sortOrder: index + 1 })));
    console.info(`  Seeded ${faqs.length} FAQs.`);
  }
  if (!(await SupportContact.count())) {
    await SupportContact.bulkCreate(contacts.map((contact, index) => ({ ...contact, audience: 'all', sortOrder: index + 1 })));
    console.info(`  Seeded ${contacts.length} support contacts (phone, WhatsApp and hours start inactive).`);
  }
};
