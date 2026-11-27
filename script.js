/* ================== CONFIG ==================
 * 1. Paste your Google Apps Script Web App URL below (see README.md).
 * 2. Optionally add your Instagram profile link to show a button after submit.
 */
const CONFIG = {
  SCRIPT_URL: "https://script.google.com/macros/s/AKfycbyjWwYSPGqTpoYTECdkZybzZDqKIALBZFfl1twGNM1ews8mf88fVzyk3Qx-LPhUFwNWrA/exec",
  INSTAGRAM_URL: "", // e.g. "https://www.instagram.com/your_handle/"
};
/* ============================================ */

/* ============ Hinglish translations ============
 * Key = the Hindi text exactly as it appears in index.html / below.
 * Only the text the visitor SEES changes. The option values sent to the Google Sheet stay in
 * Hindi, so the sheet stays consistent whichever language the visitor picks.
 */
const HINGLISH_RAW = {
  // Header + step titles
  "हमसे जुड़ें": "Humse Judein",
  "आपकी जानकारी": "Aapki Jaankari",
  "आपका बिज़नेस": "Aapka Business",
  "बिज़नेस डिटेल": "Business Detail",
  "मार्केटिंग": "Marketing",
  "आख़िरी स्टेप": "Aakhri Step",
  "स्टेप": "Step",
  "लिखकर बताएँ": "Likhkar batayein",

  // Step 1
  "नाम": "Naam",
  "जैसे: रोहन शर्मा": "Jaise: Rohan Sharma",
  "फ़ोन / WhatsApp नंबर": "Phone / WhatsApp Number",
  "ईमेल": "Email",
  "शहर": "Shehar",
  "जैसे: इंदौर, जयपुर, मुंबई": "Jaise: Indore, Jaipur, Mumbai",

  // Step 2
  "आपको किस चीज़ में मदद चाहिए?": "Aapko kis cheez mein madad chahiye?",
  "एक से ज़्यादा चुन सकते हैं": "Ek se zyada chun sakte hain",
  "नया बिज़नेस शुरू करना": "Naya business shuru karna",
  "मौजूदा बिज़नेस में सपोर्ट": "Maujooda business mein support",
  "बिज़नेस वीडियो या रील्स": "Business videos ya reels",
  "वन टू वन कंसल्टेंसी": "One-to-one consultancy",
  "बिज़नेस का नाम": "Business ka naam",
  "बिज़नेस का नाम लिखें": "Business ka naam likhein",
  "अभी नाम नहीं है": "Abhi naam nahi hai",
  "बिज़नेस टाइप": "Business type",
  "स्टार्टअप": "Startup",
  "एंटरप्राइज़": "Enterprise",
  "शॉप": "Shop",
  "ब्रांड": "Brand",
  "इंडस्ट्री": "Industry",
  "रियल एस्टेट": "Real Estate",
  "रेस्टोरेंट और फ़ूड": "Restaurant aur Food",
  "फ़ैशन और कपड़े": "Fashion aur Kapde",
  "ब्यूटी और सैलून": "Beauty aur Salon",
  "हेल्थ और फ़िटनेस": "Health aur Fitness",
  "एजुकेशन और कोचिंग": "Education aur Coaching",
  "ई-कॉमर्स": "E-commerce",
  "IT और सॉफ़्टवेयर": "IT aur Software",
  "मैन्युफ़ैक्चरिंग": "Manufacturing",
  "फ़ाइनेंस और इंश्योरेंस": "Finance aur Insurance",
  "ट्रैवल": "Travel",
  "ऑटोमोबाइल": "Automobile",

  // Step 3
  "बिज़नेस कितना पुराना है?": "Business kitna purana hai?",
  "अभी सिर्फ़ आइडिया है": "Abhi sirf idea hai",
  "1 साल से कम": "1 saal se kam",
  "1 से 3 साल": "1 se 3 saal",
  "3 साल से ज़्यादा": "3 saal se zyada",
  "सोशल मीडिया हैंडल है?": "Social media handle hai?",
  "हाँ है": "Haan hai",
  "नहीं है": "Nahi hai",
  "हैंडल का नाम या लिंक लिखें (जैसे @yourbrand)": "Handle ka naam ya link likhein (jaise @yourbrand)",
  "वेबसाइट": "Website",
  "मंथली रेवेन्यू": "Monthly revenue",
  "₹1 लाख से कम": "₹1 lakh se kam",
  "₹1 से 5 लाख": "₹1 se 5 lakh",
  "₹5 से 20 लाख": "₹5 se 20 lakh",
  "₹20 लाख से ज़्यादा": "₹20 lakh se zyada",

  // Step 4
  "अभी मार्केटिंग पर हर महीने कितना ख़र्च करते हैं?": "Abhi marketing par har mahine kitna kharch karte hain?",
  "कुछ नहीं": "Kuch nahi",
  "₹20 हज़ार": "₹20 hazaar",
  "₹50 हज़ार": "₹50 hazaar",
  "₹1 लाख": "₹1 lakh",
  "आगे मार्केटिंग का बजट (हर महीने)": "Aage marketing ka budget (har mahine)",
  "₹20 से 30 हज़ार": "₹20 se 30 hazaar",
  "₹30 से 50 हज़ार": "₹30 se 50 hazaar",
  "₹50 हज़ार से 1 लाख": "₹50 hazaar se 1 lakh",
  "₹1 लाख से ज़्यादा": "₹1 lakh se zyada",
  "सबसे बड़ी परेशानी क्या है?": "Sabse badi pareshani kya hai?",
  "लीड नहीं आ रही": "Leads nahi aa rahi",
  "सेल्स कम है": "Sales kam hai",
  "ब्रांडिंग कमज़ोर है": "Branding kamzor hai",
  "कंटेंट नहीं बन पा रहा": "Content nahi ban pa raha",

  // Step 5
  "अगले 3 महीने का लक्ष्य": "Agle 3 mahine ka goal",
  "छोटा जवाब लिखें — जैसे: हर महीने 100 नई लीड, दूसरी ब्रांच खोलना…":
    "Chhota jawab likhein — jaise: har mahine 100 nayi leads, doosri branch kholna…",
  "ऑप्शनल": "Optional",
  "कब से शुरू करना चाहते हैं?": "Kab se shuru karna chahte hain?",
  "तुरंत": "Turant",
  "1 महीने में": "1 mahine mein",
  "बस जानकारी ले रहे हैं": "Bas jaankari le rahe hain",
  "हमारे बारे में कहाँ से पता चला?": "Humare baare mein kahan se pata chala?",
  "किसी दोस्त से": "Kisi dost se",
  "कॉल का सही टाइम": "Call ka sahi time",
  "सुबह": "Subah",
  "दोपहर": "Dopahar",
  "शाम": "Shaam",

  // Buttons + messages
  "पीछे": "Peeche",
  "आगे बढ़ें": "Aage badhein",
  "फ़ॉर्म भेजें": "Form bhejein",
  "भेज रहे हैं…": "Bhej rahe hain…",
  "फ़ॉर्म भेजने में दिक्कत आई। कृपया इंटरनेट चेक करके दोबारा कोशिश करें।":
    "Form bhejne mein dikkat aayi. Kripya internet check karke dobara koshish karein.",
  "कृपया अपना नाम लिखें।": "Kripya apna naam likhein.",
  "नाम बहुत छोटा है।": "Naam bahut chhota hai.",
  "नाम में नंबर नहीं होने चाहिए।": "Naam mein number nahi hone chahiye.",
  "कृपया अपना फ़ोन / WhatsApp नंबर लिखें।": "Kripya apna phone / WhatsApp number likhein.",
  "कृपया सही 10 अंकों का मोबाइल नंबर लिखें।": "Kripya sahi 10 digit ka mobile number likhein.",
  "कृपया सही मोबाइल नंबर लिखें।": "Kripya sahi mobile number likhein.",
  "कृपया अपना ईमेल लिखें।": "Kripya apna email likhein.",
  "कृपया सही ईमेल लिखें (जैसे name@gmail.com)।": "Kripya sahi email likhein (jaise name@gmail.com).",

  // Success screen
  "धन्यवाद,": "Dhanyavaad,",
  "दोस्त": "dost",
  "आपकी जानकारी हमें मिल गई है। हमारी टीम जल्द ही आपसे संपर्क करेगी।":
    "Aapki jaankari humein mil gayi hai. Humari team jald hi aapse sampark karegi.",
  "Instagram पर और वीडियो देखें": "Instagram par aur videos dekhein",
  "एक और फ़ॉर्म भरें": "Ek aur form bharein",
};
/* ============ English translations (default language) ============
 * Same keys as the Hinglish list above.
 */
const ENGLISH_RAW = {
  // Header + step titles
  "हमसे जुड़ें": "Connect With Us",
  "आपकी जानकारी": "Your Details",
  "आपका बिज़नेस": "Your Business",
  "बिज़नेस डिटेल": "Business Details",
  "मार्केटिंग": "Marketing",
  "आख़िरी स्टेप": "Last Step",
  "स्टेप": "Step",
  "लिखकर बताएँ": "Please specify",

  // Step 1
  "नाम": "Name",
  "जैसे: रोहन शर्मा": "e.g. Rohan Sharma",
  "फ़ोन / WhatsApp नंबर": "Phone / WhatsApp Number",
  "ईमेल": "Email",
  "शहर": "City",
  "जैसे: इंदौर, जयपुर, मुंबई": "e.g. Indore, Jaipur, Mumbai",

  // Step 2
  "आपको किस चीज़ में मदद चाहिए?": "What do you need help with?",
  "एक से ज़्यादा चुन सकते हैं": "You can choose more than one",
  "नया बिज़नेस शुरू करना": "Starting a new business",
  "मौजूदा बिज़नेस में सपोर्ट": "Support for an existing business",
  "बिज़नेस वीडियो या रील्स": "Business videos or reels",
  "वन टू वन कंसल्टेंसी": "One-to-one consultancy",
  "बिज़नेस का नाम": "Business name",
  "बिज़नेस का नाम लिखें": "Enter your business name",
  "अभी नाम नहीं है": "No name yet",
  "बिज़नेस टाइप": "Business type",
  "स्टार्टअप": "Startup",
  "एंटरप्राइज़": "Enterprise",
  "शॉप": "Shop",
  "ब्रांड": "Brand",
  "इंडस्ट्री": "Industry",
  "रियल एस्टेट": "Real Estate",
  "रेस्टोरेंट और फ़ूड": "Restaurant & Food",
  "फ़ैशन और कपड़े": "Fashion & Clothing",
  "ब्यूटी और सैलून": "Beauty & Salon",
  "हेल्थ और फ़िटनेस": "Health & Fitness",
  "एजुकेशन और कोचिंग": "Education & Coaching",
  "ई-कॉमर्स": "E-commerce",
  "IT और सॉफ़्टवेयर": "IT & Software",
  "मैन्युफ़ैक्चरिंग": "Manufacturing",
  "फ़ाइनेंस और इंश्योरेंस": "Finance & Insurance",
  "ट्रैवल": "Travel",
  "ऑटोमोबाइल": "Automobile",

  // Step 3
  "बिज़नेस कितना पुराना है?": "How old is your business?",
  "अभी सिर्फ़ आइडिया है": "Just an idea for now",
  "1 साल से कम": "Less than 1 year",
  "1 से 3 साल": "1 to 3 years",
  "3 साल से ज़्यादा": "More than 3 years",
  "सोशल मीडिया हैंडल है?": "Do you have a social media handle?",
  "हाँ है": "Yes",
  "नहीं है": "No",
  "हैंडल का नाम या लिंक लिखें (जैसे @yourbrand)": "Enter your handle or link (e.g. @yourbrand)",
  "वेबसाइट": "Website",
  "मंथली रेवेन्यू": "Monthly revenue",
  "₹1 लाख से कम": "Under ₹1 lakh",
  "₹1 से 5 लाख": "₹1 to 5 lakh",
  "₹5 से 20 लाख": "₹5 to 20 lakh",
  "₹20 लाख से ज़्यादा": "Over ₹20 lakh",

  // Step 4
  "अभी मार्केटिंग पर हर महीने कितना ख़र्च करते हैं?": "How much do you spend on marketing each month right now?",
  "कुछ नहीं": "Nothing",
  "₹20 हज़ार": "₹20K",
  "₹50 हज़ार": "₹50K",
  "₹1 लाख": "₹1 lakh",
  "आगे मार्केटिंग का बजट (हर महीने)": "Planned marketing budget (per month)",
  "₹20 से 30 हज़ार": "₹20K to 30K",
  "₹30 से 50 हज़ार": "₹30K to 50K",
  "₹50 हज़ार से 1 लाख": "₹50K to 1 lakh",
  "₹1 लाख से ज़्यादा": "Over ₹1 lakh",
  "सबसे बड़ी परेशानी क्या है?": "What is your biggest challenge?",
  "लीड नहीं आ रही": "Not getting leads",
  "सेल्स कम है": "Low sales",
  "ब्रांडिंग कमज़ोर है": "Weak branding",
  "कंटेंट नहीं बन पा रहा": "Can't create content",

  // Step 5
  "अगले 3 महीने का लक्ष्य": "Your goal for the next 3 months",
  "छोटा जवाब लिखें — जैसे: हर महीने 100 नई लीड, दूसरी ब्रांच खोलना…":
    "Keep it short — e.g. 100 new leads a month, opening a second branch…",
  "ऑप्शनल": "Optional",
  "कब से शुरू करना चाहते हैं?": "When do you want to start?",
  "तुरंत": "Right away",
  "1 महीने में": "Within 1 month",
  "बस जानकारी ले रहे हैं": "Just exploring",
  "हमारे बारे में कहाँ से पता चला?": "How did you hear about us?",
  "किसी दोस्त से": "From a friend",
  "कॉल का सही टाइम": "Best time to call",
  "सुबह": "Morning",
  "दोपहर": "Afternoon",
  "शाम": "Evening",

  // Buttons + messages
  "पीछे": "Back",
  "आगे बढ़ें": "Next",
  "फ़ॉर्म भेजें": "Submit",
  "भेज रहे हैं…": "Sending…",
  "फ़ॉर्म भेजने में दिक्कत आई। कृपया इंटरनेट चेक करके दोबारा कोशिश करें।":
    "Something went wrong while sending the form. Please check your internet and try again.",
  "कृपया अपना नाम लिखें।": "Please enter your name.",
  "नाम बहुत छोटा है।": "Name is too short.",
  "नाम में नंबर नहीं होने चाहिए।": "Name should not contain numbers.",
  "कृपया अपना फ़ोन / WhatsApp नंबर लिखें।": "Please enter your phone / WhatsApp number.",
  "कृपया सही 10 अंकों का मोबाइल नंबर लिखें।": "Please enter a valid 10-digit mobile number.",
  "कृपया सही मोबाइल नंबर लिखें।": "Please enter a valid mobile number.",
  "कृपया अपना ईमेल लिखें।": "Please enter your email.",
  "कृपया सही ईमेल लिखें (जैसे name@gmail.com)।": "Please enter a valid email (e.g. name@gmail.com).",

  // Success screen
  "धन्यवाद,": "Thank you,",
  "दोस्त": "friend",
  "आपकी जानकारी हमें मिल गई है। हमारी टीम जल्द ही आपसे संपर्क करेगी।":
    "We've received your details. Our team will get in touch with you soon.",
  "Instagram पर और वीडियो देखें": "Watch more videos on Instagram",
  "एक और फ़ॉर्म भरें": "Fill another form",
};

// Normalise so Hindi letters with a nukta (ज़, फ़ …) match however the editor saved them
const nfc = (s) => s.normalize("NFC");
const normalise = (raw) => Object.fromEntries(Object.entries(raw).map(([k, v]) => [nfc(k), v]));
const TRANSLATIONS = { en: normalise(ENGLISH_RAW), hinglish: normalise(HINGLISH_RAW) };
const HINGLISH = TRANSLATIONS.hinglish; // every translatable Hindi string is a key here
/* ============================================ */

(() => {
  const form = document.getElementById("connectForm");
  const card = document.getElementById("card");
  const cardHead = document.getElementById("cardHead");
  const steps = [...form.querySelectorAll(".step")];
  const submitBtn = document.getElementById("submitBtn");
  const backBtn = document.getElementById("backBtn");
  const alertBox = document.getElementById("formAlert");
  const success = document.getElementById("success");
  const goal = document.getElementById("goal");
  const charCount = document.getElementById("charCount");
  const mobile = document.getElementById("mobile");
  const countryCode = document.getElementById("countryCode");
  const businessName = document.getElementById("businessName");
  const noBusinessName = document.getElementById("noBusinessName");

  let current = 0;

  // ---------- Language: English (default) / हिंदी / Hinglish ----------
  const LANG_KEY = "mbm-lang";
  const HTML_LANG = { en: "en", hi: "hi", hinglish: "hi-Latn" };
  let lang = "en";
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (Object.hasOwn(HTML_LANG, saved || "")) lang = saved;
  } catch (_) {}

  const t = (s) => (lang !== "hi" && TRANSLATIONS[lang][nfc(s)]) || s;

  // Text that JS writes itself is refreshed separately, so the walker skips it
  const DYNAMIC = "#stepCount, .label-txt, .err, #formAlert, #successName, .lang-toggle";

  function translateStatic() {
    const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.parentElement.closest(DYNAMIC)) continue;
      if (node.hiText === undefined) {
        const key = nfc(node.nodeValue.trim());
        node.hiText = key && HINGLISH[key] ? node.nodeValue : null; // remember the Hindi original
      }
      if (node.hiText === null) continue;
      const hi = node.hiText.trim();
      node.nodeValue = lang === "hi" ? node.hiText : node.hiText.replace(hi, () => t(hi));
    }
    card.querySelectorAll("[placeholder]").forEach((el) => {
      if (el.dataset.phHi === undefined) el.dataset.phHi = el.placeholder;
      el.placeholder = t(el.dataset.phHi);
    });
  }

  function setLang(next) {
    lang = next;
    try { localStorage.setItem(LANG_KEY, lang); } catch (_) {}
    document.documentElement.lang = HTML_LANG[lang];
    document.querySelectorAll(".lang-toggle button").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.lang === lang))
    );
    translateStatic();
    updateNav();
    form.querySelectorAll(".err, #formAlert").forEach((el) => {
      if (el.dataset.msg) el.textContent = t(el.dataset.msg);
    });
    const sn = document.getElementById("successName");
    if (sn.dataset.fallback === "1") sn.textContent = t("दोस्त");
  }

  document.querySelectorAll(".lang-toggle button").forEach((b) =>
    b.addEventListener("click", () => b.dataset.lang !== lang && setLang(b.dataset.lang))
  );

  document.getElementById("year").textContent = new Date().getFullYear();

  const insta = document.getElementById("instaLink");
  if (CONFIG.INSTAGRAM_URL) {
    insta.href = CONFIG.INSTAGRAM_URL;
    insta.hidden = false;
  }

  const isConfigured = CONFIG.SCRIPT_URL.startsWith("https://script.google.com/");

  // ---------- Validation (only step 1 has required fields) ----------
  const rules = {
    name: (v) => {
      if (!v) return "कृपया अपना नाम लिखें।";
      if (v.length < 2) return "नाम बहुत छोटा है।";
      if (/\d/.test(v)) return "नाम में नंबर नहीं होने चाहिए।";
      return "";
    },
    mobile: (v) => {
      const digits = v.replace(/\D/g, "");
      if (!digits) return "कृपया अपना फ़ोन / WhatsApp नंबर लिखें।";
      if (countryCode.value === "+91") {
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

  function validateField(name, show = true) {
    const el = form.elements[name];
    const err = rules[name](el.value.trim());
    if (show) {
      const control = el.closest(".control");
      const errEl = form.querySelector(`.err[data-for="${name}"]`);
      errEl.dataset.msg = err;
      errEl.textContent = t(err);
      control.classList.toggle("invalid", !!err);
      control.classList.toggle("valid", !err);
      el.setAttribute("aria-invalid", err ? "true" : "false");
    }
    return !err;
  }

  function validateStep(i) {
    const names = Object.keys(rules).filter((n) => steps[i].contains(form.elements[n]));
    const ok = names.map((n) => validateField(n)).every(Boolean);
    if (!ok) {
      const firstBad = steps[i].querySelector(".control.invalid input");
      firstBad && firstBad.focus();
    }
    return ok;
  }

  Object.keys(rules).forEach((name) => {
    const el = form.elements[name];
    el.addEventListener("blur", () => el.value && validateField(name));
    el.addEventListener("input", () => {
      if (el.closest(".control").classList.contains("invalid")) validateField(name);
    });
  });
  countryCode.addEventListener("change", () => mobile.value && validateField("mobile"));
  mobile.addEventListener("input", () => {
    mobile.value = mobile.value.replace(/[^\d\s]/g, "");
  });
  goal.addEventListener("input", () => (charCount.textContent = goal.value.length));

  // ---------- Chips: "Other" / "हाँ है" reveal a text box ----------
  form.querySelectorAll(".field").forEach((field) => {
    const reveal = field.querySelector(".reveal");
    if (!reveal) return;
    field.addEventListener("change", () => {
      const show = !!field.querySelector("input[data-reveal]:checked");
      const wasHidden = reveal.hidden;
      reveal.hidden = !show;
      if (show && wasHidden) reveal.querySelector("input").focus();
    });
  });

  // Radio chips are optional: clicking a selected one again un-selects it
  form.querySelectorAll('.chip input[type="radio"]').forEach((radio) => {
    radio.addEventListener("click", () => {
      if (radio.dataset.was === "1") {
        radio.checked = false;
        radio.dataset.was = "0";
        radio.dispatchEvent(new Event("change", { bubbles: true }));
      } else {
        form.querySelectorAll(`input[name="${radio.name}"]`).forEach((r) => (r.dataset.was = "0"));
        radio.dataset.was = "1";
      }
    });
  });

  // "अभी नाम नहीं है" disables the business-name box
  noBusinessName.addEventListener("change", () => {
    businessName.disabled = noBusinessName.checked;
    businessName.closest(".control").classList.toggle("disabled", noBusinessName.checked);
    if (noBusinessName.checked) businessName.value = "";
  });

  // ---------- Steps ----------
  function showStep(i, direction = 1) {
    steps[current].classList.remove("active", "back-anim");
    current = i;
    const step = steps[current];
    step.classList.toggle("back-anim", direction < 0);
    step.classList.add("active");

    updateNav();
    alertBox.classList.remove("show");

    if (card.getBoundingClientRect().top < 0) card.scrollIntoView({ behavior: "smooth", block: "start" });
    step.querySelector(".step-title").focus({ preventScroll: true });
  }

  function updateNav() {
    const last = current === steps.length - 1;
    document.getElementById("stepCount").textContent = `${t("स्टेप")} ${current + 1} / ${steps.length}`;
    document.getElementById("barFill").style.width = `${((current + 1) / steps.length) * 100}%`;
    backBtn.hidden = current === 0;
    submitBtn.classList.toggle("final", last);
    if (!submitBtn.classList.contains("loading")) {
      submitBtn.querySelector(".label-txt").textContent = t(last ? "फ़ॉर्म भेजें" : "आगे बढ़ें");
    }
  }

  backBtn.addEventListener("click", () => current > 0 && showStep(current - 1, -1));

  // ---------- Collect values ----------
  const pick = (name) => {
    const checked = [...form.querySelectorAll(`input[name="${name}"]:checked`)];
    return checked
      .map((input) => {
        if (!input.hasAttribute("data-reveal")) return input.value;
        const extra = input.closest(".field").querySelector(".reveal input").value.trim();
        if (input.value === "Other") return extra ? `Other: ${extra}` : "Other";
        return extra || input.value; // e.g. social handle
      })
      .join(", ");
  };

  function collect() {
    const val = (n) => (form.elements[n].value || "").trim();
    return {
      name: val("name"),
      mobile: `${countryCode.value} ${mobile.value.replace(/\D/g, "")}`,
      email: val("email").toLowerCase(),
      city: val("city"),
      help: pick("help"),
      businessName: noBusinessName.checked ? "अभी नाम नहीं है" : val("businessName"),
      businessType: pick("businessType"),
      industry: pick("industry"),
      businessAge: pick("businessAge"),
      social: pick("social"),
      website: val("website"),
      revenue: pick("revenue"),
      marketingSpend: pick("marketingSpend"),
      marketingBudget: pick("marketingBudget"),
      problem: pick("problem"),
      goal: val("goal"),
      startWhen: pick("startWhen"),
      heardFrom: pick("heardFrom"),
      callTime: pick("callTime"),
      source: document.referrer || "direct",
      userAgent: navigator.userAgent,
    };
  }

  // ---------- Submit / Next ----------
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    alertBox.classList.remove("show");

    if (!validateStep(current)) return;
    if (current < steps.length - 1) return showStep(current + 1, 1);

    // Bot caught by honeypot: pretend success, send nothing
    if (form.elements.website_url.value) return showSuccess(collect());

    const data = collect();
    setLoading(true);
    try {
      if (!isConfigured) {
        console.warn("[Mind Behind Money] SCRIPT_URL is not set in script.js — demo mode, nothing was saved.", data);
        await new Promise((r) => setTimeout(r, 900));
      } else {
        const res = await fetch(CONFIG.SCRIPT_URL, {
          method: "POST",
          body: new URLSearchParams(data), // simple request: no CORS preflight
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.result !== "success") throw new Error(json.error || `Request failed (${res.status})`);
      }
      showSuccess(data);
    } catch (err) {
      console.error(err);
      alertBox.dataset.msg = "फ़ॉर्म भेजने में दिक्कत आई। कृपया इंटरनेट चेक करके दोबारा कोशिश करें।";
      alertBox.textContent = t(alertBox.dataset.msg);
      alertBox.classList.add("show");
    } finally {
      setLoading(false);
    }
  });

  function setLoading(on) {
    submitBtn.classList.toggle("loading", on);
    submitBtn.disabled = on;
    backBtn.disabled = on;
    submitBtn.querySelector(".label-txt").textContent = t(on ? "भेज रहे हैं…" : "फ़ॉर्म भेजें");
  }

  function showSuccess(data) {
    const first = data.name.split(/\s+/)[0];
    const sn = document.getElementById("successName");
    sn.dataset.fallback = first ? "0" : "1";
    sn.textContent = first || t("दोस्त");
    form.hidden = true;
    cardHead.hidden = true;
    success.hidden = false;
    if (card.getBoundingClientRect().top < 0) card.scrollIntoView({ behavior: "smooth", block: "start" });
    coinRain();
  }

  document.getElementById("againBtn").addEventListener("click", () => {
    form.reset();
    charCount.textContent = "0";
    businessName.disabled = false;
    form.querySelectorAll(".control").forEach((c) => c.classList.remove("valid", "invalid", "disabled"));
    form.querySelectorAll(".err, #formAlert").forEach((e) => {
      e.textContent = "";
      delete e.dataset.msg;
    });
    form.querySelectorAll(".reveal").forEach((r) => (r.hidden = true));
    form.querySelectorAll('.chip input[type="radio"]').forEach((r) => (r.dataset.was = "0"));
    success.hidden = true;
    cardHead.hidden = false;
    form.hidden = false;
    showStep(0, -1);
    form.elements.name.focus();
  });

  // ---------- Celebration ----------
  function coinRain() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rain = document.getElementById("coinRain");
    for (let i = 0; i < 28; i++) {
      const c = document.createElement("span");
      c.className = "coin";
      c.textContent = "₹";
      c.style.left = Math.random() * 100 + "vw";
      c.style.animationDuration = 1.8 + Math.random() * 1.6 + "s";
      c.style.animationDelay = Math.random() * 0.8 + "s";
      const s = 22 + Math.random() * 16;
      c.style.width = c.style.height = s + "px";
      c.style.fontSize = s * 0.5 + "px";
      rain.appendChild(c);
      setTimeout(() => c.remove(), 4500);
    }
  }

  setLang(lang); // apply the saved choice (Hindi by default)
})();
