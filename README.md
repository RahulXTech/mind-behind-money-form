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

## 1:1 session booking (15 min ₹499 · 45 min ₹999)

Visitors can book a paid 1:1 session from the form card and from the thank-you screen.
Flow: choose plan → details, date, time → pay → booking saved → PDF receipt downloads.

| Part | File |
|---|---|
| Prices / plans | `src/config.js` → `SESSION_PLANS` (and `server/lib/plans.js`, which decides the real price) |
| Booking screen | `src/Booking.jsx` |
| Razorpay window | `src/payment.js` |
| Server calls + local backup | `src/bookingStore.js` |
| PDF receipt | `src/receiptPdf.js` (made in the browser, no library) |
| Payment rules | `server/lib/payments.js` (order, verification, booking creation) · `server/lib/webhook.js` (Razorpay webhook) |
| Server entry | `server/index.js` (Hostinger / any Node host) · `server/api/*.js` (Vercel) |
| Server tests | `server/test/` → `cd server && npm ci && npm test` |

While `API_URL` in `src/config.js` is empty the booking runs in **test mode**: no money is taken, the receipt is watermarked,
and bookings stay in the visitor's browser (localStorage `mbm-bookings`).

### How a real payment works

```
Website ──► /api/create-order ──► Razorpay order for ₹499 / ₹999 (price set by the server),
                                   booking details stored on the order. Nothing saved in MongoDB yet.
Website ──► Razorpay payment window (UPI / card / netbanking)
Website ──► /api/verify-payment ──► 1. checks the Checkout signature with the Key Secret
                                    2. fetches the order + payment from Razorpay
                                    3. payment must belong to the order, amount + currency must match the plan,
                                       status must be "captured"
                                    4. only then inserts the booking into MongoDB (status "paid")
Website ──► confirmation screen + PDF receipt
```

- Verifying the same payment again returns the same booking. A second, different payment for an already-paid booking
  is refused (HTTP 409) and logged with "ALERT" so it can be refunded; the first payment is never overwritten.
  MongoDB unique indexes on the order id and payment id guarantee one booking per order, even with simultaneous requests.
- If a payment is **authorized but not captured**, no booking is created (HTTP 202 "pending") and the visitor is told
  the booking will be confirmed on WhatsApp. Keep **auto-capture ON** in Razorpay
  (Account & Settings → Payment capture); otherwise capture such payments from the Razorpay dashboard.
- If Razorpay can't be reached, nothing is saved and the visitor sees their payment ID to contact you.
- If the visitor closes the tab right after paying, the **Razorpay webhook** (below) still creates the booking.

### Razorpay webhook (booking recovery)

`POST /api/razorpay-webhook` receives Razorpay's `payment.captured` events. It checks the `X-Razorpay-Signature`
header against the **raw request bytes** with `RAZORPAY_WEBHOOK_SECRET`, then calls the same `confirmPayment()` the
website uses (`server/lib/webhook.js`), so amount, currency, order and "captured" are re-checked with Razorpay's API.
Repeated or simultaneous deliveries, and webhooks arriving before or after the website's own check, all end in the
same single booking. Other events are acknowledged and ignored. Temporary problems answer 503 so Razorpay retries.

Setup (do it once in **Test Mode** and again later in **Live Mode** — they have separate webhooks):

1. Make a webhook secret — a long random value, **different from the Key Secret**:
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
2. Razorpay Dashboard → **Account & Settings → Webhooks → + Add New Webhook**:
   - Webhook URL: `https://api.axamp.in/api/razorpay-webhook` (or your Vercel address + `/api/razorpay-webhook`)
   - Secret: the value from step 1
   - Alert email: your email (Razorpay emails you if deliveries keep failing)
   - Active events: **payment.captured**
3. Add `RAZORPAY_WEBHOOK_SECRET` = the same value to the server's environment variables and restart / redeploy.
4. Make a test payment, then check Webhooks → your webhook → deliveries show **200**.

If `RAZORPAY_WEBHOOK_SECRET` is missing or equal to the Key Secret, the endpoint answers 500 and logs why
(Razorpay keeps retrying for up to 24 hours, so fixing the setting recovers those payments).

### Razorpay + MongoDB setup

1. **Razorpay**: sign up at razorpay.com → Test Mode → Account & Settings → API Keys → Generate Key.
   Keep the Key ID and Key Secret somewhere safe.
2. **MongoDB Atlas** (free): create a cluster → Database Access: add a user → Network Access: allow `0.0.0.0/0`
   (Vercel has no fixed IP) → Connect → Drivers → copy the `mongodb+srv://…` link.
3. **Vercel** (free): sign in with GitHub → Add New Project → import `mind-behind-money-form` →
   **Root Directory: `server`**, Framework: Other → Environment Variables (see `server/.env.example`):
   `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `MONGODB_URI`, `MONGODB_DB`, `ALLOWED_ORIGINS` → Deploy.
4. Put the Vercel address (e.g. `https://mind-behind-money-api.vercel.app`) in `API_URL` in `src/config.js` and push.
5. Test with Razorpay test payments (UPI `success@razorpay`). Bookings appear in MongoDB → `mindbehindmoney` → `bookings`.
6. Going live: finish Razorpay KYC, then in Vercel replace the two Razorpay variables with the **live** keys and redeploy.

Never put the Razorpay **Key Secret** or the **MongoDB link** in `src/`: anyone can read the website's code.
They go only into the server's Environment Variables (or a local `server/.env`, which git ignores).

### Hosting on Hostinger (axamp.in)

- **Website** → `axamp.in`: hPanel → Advanced → GIT → repo `https://github.com/RahulXTech/mind-behind-money-form.git`,
  branch **`deploy`**, directory empty (`public_html`, must be empty first) → Deploy. Add the Auto Deployment webhook
  to GitHub → Settings → Webhooks so every push updates the site. Install the free SSL.
- **Payment server** → `api.axamp.in`:
  - Business / Cloud plan: hPanel → Node.js app → import this GitHub repo, root directory `server`,
    start command `npm start` (entry `index.js`), add the environment variables, attach `api.axamp.in`.
  - Single / Premium plan (no Node.js): deploy `server` on Vercel as above, optionally add `api.axamp.in`
    under Vercel → Domains and create the CNAME it shows in Hostinger's DNS.
- Check `https://api.axamp.in/api/health` returns `{"ok":true}`, then set `API_URL` in `src/config.js` and push.

## Updating the script later

If you edit `Code.gs`, go to **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**.
That way the URL stays the same.

## Built-in protections
- Field validation (Indian 10-digit mobile for +91, email format, minimum message length)
- Hidden "honeypot" field that blocks most spam bots
- Spreadsheet formula injection is neutralised in `Code.gs`
- Script lock so simultaneous submissions don't overwrite each other
