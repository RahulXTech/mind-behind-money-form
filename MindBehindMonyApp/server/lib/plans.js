// The server decides the price, never the browser (so nobody can change ₹499 to ₹1).
// Keep in sync with SESSION_PLANS in src/config.js.
export const PLANS = {
  "15min": { minutes: 15, amount: 499 },
  "45min": { minutes: 45, amount: 999 },
};
export const SLOTS = ["सुबह", "दोपहर", "शाम"];
