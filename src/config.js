/* ================== CONFIG ==================
 * 1. Paste your Google Apps Script Web App URL below (see README.md).
 * 2. Optionally add your Instagram profile link to show a button after submit.
 */
export const CONFIG = {
  SCRIPT_URL: "https://script.google.com/macros/s/AKfycbyjWwYSPGqTpoYTECdkZybzZDqKIALBZFfl1twGNM1ews8mf88fVzyk3Qx-LPhUFwNWrA/exec",
  INSTAGRAM_URL: "", // e.g. "https://www.instagram.com/your_handle/"

  /* ---------- 1:1 session booking (see README → "Razorpay + MongoDB setup") ----------
   * API_URL: address of the booking server in /server once it is on Vercel,
   *   e.g. "https://mind-behind-money-api.vercel.app". The server holds the Razorpay keys and the MongoDB link,
   *   creates the order, verifies the payment and saves the booking. This is the setting for real payments.
   * RAZORPAY_KEY_ID: only for a quick look at the Razorpay window BEFORE the server exists (test key only):
   *   payments are not verified and nothing reaches MongoDB. Leave empty once API_URL is set.
   * Both empty → TEST MODE: no money is taken and the payment is simulated.
   */
  API_URL: "",
  RAZORPAY_KEY_ID: "",

  // Session plans and prices (₹). Labels are Hindi; translations live in translations.js.
  SESSION_PLANS: [
    { id: "15min", minutes: 15, amount: 499, label: "15 मिनट", desc: "एक सवाल पर फ़ोकस्ड बात", icon: "timer" },
    { id: "45min", minutes: 45, amount: 1000, label: "45 मिनट", desc: "पूरे बिज़नेस पर गहराई से बात और प्लान", icon: "hourglass-medium" },
  ],
};
