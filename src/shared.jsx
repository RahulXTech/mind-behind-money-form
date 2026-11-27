/* Pieces used by both the connect form (App.jsx) and the 1:1 session booking (Booking.jsx). */

export const COUNTRY_CODES = [
  ["+91", "🇮🇳 +91"],
  ["+971", "🇦🇪 +971"],
  ["+1", "🇺🇸 +1"],
  ["+44", "🇬🇧 +44"],
  ["+65", "🇸🇬 +65"],
  ["+61", "🇦🇺 +61"],
  ["+977", "🇳🇵 +977"],
  ["+880", "🇧🇩 +880"],
];

export const CALL_TIMES = [
  { value: "सुबह", icon: "sun-horizon" },
  { value: "दोपहर", icon: "sun" },
  { value: "शाम", icon: "moon" },
];

// ---------- Validation (messages are Hindi; translations.js has the other languages) ----------
export const RULES = {
  name: (v) => {
    if (!v) return "कृपया अपना नाम लिखें।";
    if (v.length < 2) return "नाम बहुत छोटा है।";
    if (/\d/.test(v)) return "नाम में नंबर नहीं होने चाहिए।";
    return "";
  },
  mobile: (v, countryCode) => {
    const digits = v.replace(/\D/g, "");
    if (!digits) return "कृपया अपना फ़ोन / WhatsApp नंबर लिखें।";
    if (countryCode === "+91") {
      if (!/^[6-9]\d{9}$/.test(digits)) return "कृपया सही 10 अंकों का मोबाइल नंबर लिखें।";
    } else if (digits.length < 6 || digits.length > 14) {
      return "कृपया सही मोबाइल नंबर लिखें।";
    }
    return "";
  },
  email: (v) => {
    if (!v) return "कृपया अपना ईमेल लिखें।";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "कृपया सही ईमेल लिखें (जैसे name@gmail.com)।";
    return "";
  },
};

export const cx = (...names) => names.filter(Boolean).join(" ");

export function ChipContent({ icon, text }) {
  return (
    <span>
      {icon && <b aria-hidden="true"><i className={`ph ph-${icon}`}></i></b>}
      {text}
    </span>
  );
}
