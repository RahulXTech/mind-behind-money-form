# Mind Behind Money — Connect Form

A branded contact page for business people coming from the Instagram reels. Each submission
(Name, Mobile, Email, Opinion) is saved as a new row in a Google Sheet.

```
index.html                  the page
style.css                   brand styling (cream / teal / gold, Poppins)
script.js                   validation + sending to Google Sheet  ← set SCRIPT_URL here
assets/logo.png, favicon    your logo
google-apps-script/Code.gs  paste this into Google Apps Script
```

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

Open `script.js` and paste the URL:

```js
const CONFIG = {
  SCRIPT_URL: "https://script.google.com/macros/s/AKfy.../exec",
  INSTAGRAM_URL: "https://www.instagram.com/your_handle/", // optional, shows a button after submit
};
```

Until `SCRIPT_URL` is set, the form runs in **demo mode**: it shows the success screen but saves nothing.

## Step 3: Put it online (free)

Pick one:
- **Netlify Drop**: go to <https://app.netlify.com/drop> and drag this whole folder in. You get a live link instantly.
- **GitHub Pages**: push the folder to a repo and enable Pages.
- **Hostinger / any hosting**: upload all files to `public_html`.

Then put the link in your **Instagram bio** or **Add link** on the profile, and mention it in your reels/captions
("Business idea? Link in bio 👆").

## Updating the script later

If you edit `Code.gs`, go to **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**.
That way the URL stays the same.

## Built-in protections
- Field validation (Indian 10-digit mobile for +91, email format, minimum message length)
- Hidden "honeypot" field that blocks most spam bots
- Spreadsheet formula injection is neutralised in `Code.gs`
- Script lock so simultaneous submissions don't overwrite each other
