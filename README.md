# Mind Behind Money — Connect Form

A branded contact page for business people coming from the Instagram reels. Each submission
(Name, Mobile, Email, Opinion) is saved as a new row in a Google Sheet.

Built with React + Vite.

```
index.html                  page <head> (fonts, icons, meta tags)
src/App.jsx                 the form: steps, validation, sending to Google Sheet
src/config.js               ← set SCRIPT_URL (and INSTAGRAM_URL) here
src/translations.js         English / Hinglish text for every Hindi line
src/style.css               brand styling (cream / teal / gold, Poppins)
public/assets/              logo + favicon
google-apps-script/Code.gs  paste this into Google Apps Script
```

Run locally: `npm install` once, then `npm run dev` (opens a local preview).
Build for hosting: `npm run build` → upload the contents of the `dist/` folder.

## Step 1: Create the Google Sheet + script (5 minutes)

1. Go to <https://sheets.new> and name the sheet, e.g. **Mind Behind Money – Leads**.
2. In the sheet, open **Extensions → Apps Script**.
3. Delete everything in `Code.gs` and paste in the contents of `google-apps-script/Code.gs`.
   *(Optional: set `NOTIFY_EMAIL` to your email to get an email for every new lead.)*
4. Click **Save** (💾).
5. Click **Deploy → New deployment**.
   - Click the ⚙️ next to "Select type" and choose **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click **Deploy**, then **Authorize access** and allow it.
     (If Google says "app isn't verified", click **Advanced → Go to … (unsafe)**. This is normal for your own scripts.)
6. Copy the **Web app URL**. It looks like `https://script.google.com/macros/s/AKfy.../exec`.

The first submission automatically creates a **Responses** tab with these Hindi column headings
(one column per form question):
`Timestamp | नाम | फ़ोन / WhatsApp | ईमेल | शहर | किस चीज़ में मदद चाहिए | बिज़नेस का नाम | बिज़नेस टाइप |
इंडस्ट्री | बिज़नेस कितना पुराना है | सोशल मीडिया हैंडल | वेबसाइट | मंथली रेवेन्यू | अभी मार्केटिंग ख़र्च / महीना |
आगे मार्केटिंग बजट | सबसे बड़ी परेशानी | अगले 3 महीने का लक्ष्य | कब से शुरू करना चाहते हैं | कहाँ से पता चला |
कॉल का सही टाइम | Source | Device`

If you pick "Other" and type something, the sheet saves it as `Other: <typed text>`. Multiple "मदद" choices are
saved comma-separated in one cell.

> If you change the questions later, start a new tab (or delete the `Responses` tab) so the headings match.

## Step 2: Connect the page

Open `src/config.js` and paste the URL:

```js
const CONFIG = {
  SCRIPT_URL: "https://script.google.com/macros/s/AKfy.../exec",
  INSTAGRAM_URL: "https://www.instagram.com/your_handle/", // optional, shows a button after submit
};
```

Until `SCRIPT_URL` is set, the form runs in **demo mode**: it shows the success screen but saves nothing.

## Step 3: Put it online (free)

First run `npm run build`. The ready-to-upload site is in the `dist/` folder. Then pick one:
- **Netlify Drop**: go to <https://app.netlify.com/drop> and drag the `dist` folder in. You get a live link instantly.
- **Hostinger / any hosting**: upload everything inside `dist/` to `public_html`.

Then put the link in your **Instagram bio** or **Add link** on the profile, and mention it in your reels/captions
("Business idea? Link in bio 👆").

## 1:1 session booking (15 min ₹499 · 45 min ₹1,000)

Visitors can book a paid 1:1 session from the form card and from the thank-you screen.
Flow: choose plan → details, date, time → pay → booking saved → PDF receipt downloads.

| Part | File |
|---|---|
| Prices / plans | `src/config.js` → `SESSION_PLANS` (and `server/lib/plans.js`, which decides the real price) |
| Booking screen | `src/Booking.jsx` |
| Razorpay window | `src/payment.js` |
| Server calls + local backup | `src/bookingStore.js` |
| PDF receipt | `src/receiptPdf.js` (made in the browser, no library) |
| Server (Vercel) | `server/api/create-order.js`, `server/api/verify-payment.js` |

While `API_URL` in `src/config.js` is empty the booking runs in **test mode**: no money is taken, the receipt is watermarked,
and bookings stay in the visitor's browser (localStorage `mbm-bookings`).

### How a real payment works

```
Website ──► server /api/create-order ──► Razorpay: create order for ₹499 / ₹1000   (MongoDB: booking "created")
Website ──► Razorpay payment window (UPI / card / netbanking)
Website ──► server /api/verify-payment ──► checks Razorpay signature with Key Secret (MongoDB: booking "paid")
Website ──► confirmation screen + PDF receipt
```

### Razorpay + MongoDB setup

1. **Razorpay**: sign up at razorpay.com → Test Mode → Account & Settings → API Keys → Generate Key.
   Keep the Key ID and Key Secret somewhere safe.
2. **MongoDB Atlas** (free): create a cluster → Database Access: add a user → Network Access: allow `0.0.0.0/0`
   (Vercel has no fixed IP) → Connect → Drivers → copy the `mongodb+srv://…` link.
3. **Vercel** (free): sign in with GitHub → Add New Project → import `mind-behind-money-form` →
   **Root Directory: `server`**, Framework: Other → Environment Variables (see `server/.env.example`):
   `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `MONGODB_URI`, `MONGODB_DB`, `ALLOWED_ORIGINS` → Deploy.
4. Put the Vercel address (e.g. `https://mind-behind-money-api.vercel.app`) in `API_URL` in `src/config.js` and push.
5. Test with Razorpay test payments (UPI `success@razorpay`). Bookings appear in MongoDB → `mindbehindmoney` → `bookings`.
6. Going live: finish Razorpay KYC, then in Vercel replace the two Razorpay variables with the **live** keys and redeploy.

Never put the Razorpay **Key Secret** or the **MongoDB link** in `src/`: anyone can read the website's code.
They go only into Vercel's Environment Variables.

## Updating the script later

If you edit `Code.gs`, go to **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**.
That way the URL stays the same.

## Built-in protections
- Field validation (Indian 10-digit mobile for +91, email format, minimum message length)
- Hidden "honeypot" field that blocks most spam bots
- Spreadsheet formula injection is neutralised in `Code.gs`
- Script lock so simultaneous submissions don't overwrite each other
