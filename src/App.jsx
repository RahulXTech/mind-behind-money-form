import { useEffect, useRef, useState } from "react";
import { CONFIG } from "./config.js";
import { translate } from "./translations.js";
import { CALL_TIMES, COUNTRY_CODES, ChipContent, RULES, cx } from "./shared.jsx";
import Booking from "./Booking.jsx";

/* ================= Options (values are what the Google Sheet receives) ================= */
const HELP = [
  { value: "नया बिज़नेस शुरू करना", icon: "rocket-launch" },
  { value: "मौजूदा बिज़नेस में सपोर्ट", icon: "chart-line-up" },
  { value: "बिज़नेस वीडियो या रील्स", icon: "video-camera" },
  { value: "वन टू वन कंसल्टेंसी", icon: "handshake" },
];
const BUSINESS_TYPES = [
  { value: "स्टार्टअप" }, { value: "एंटरप्राइज़" }, { value: "शॉप" }, { value: "ब्रांड" },
  { value: "Other", reveal: true },
];
const INDUSTRIES = [
  { value: "रियल एस्टेट", icon: "house" },
  { value: "रेस्टोरेंट और फ़ूड", icon: "fork-knife" },
  { value: "फ़ैशन और कपड़े", icon: "dress" },
  { value: "ब्यूटी और सैलून", icon: "scissors" },
  { value: "हेल्थ और फ़िटनेस", icon: "barbell" },
  { value: "एजुकेशन और कोचिंग", icon: "graduation-cap" },
  { value: "ई-कॉमर्स", icon: "shopping-cart" },
  { value: "IT और सॉफ़्टवेयर", icon: "laptop" },
  { value: "मैन्युफ़ैक्चरिंग", icon: "factory" },
  { value: "फ़ाइनेंस और इंश्योरेंस", icon: "coins" },
  { value: "ट्रैवल", icon: "airplane-tilt" },
  { value: "ऑटोमोबाइल", icon: "car" },
  { value: "Other", icon: "pencil-simple-line", reveal: true },
];
const BUSINESS_AGES = [
  { value: "अभी सिर्फ़ आइडिया है", icon: "lightbulb" },
  { value: "1 साल से कम" }, { value: "1 से 3 साल" }, { value: "3 साल से ज़्यादा" },
];
const SOCIAL = [{ value: "हाँ है", reveal: true }, { value: "नहीं है" }];
const REVENUES = [
  { value: "₹1 लाख से कम" }, { value: "₹1 से 5 लाख" }, { value: "₹5 से 20 लाख" }, { value: "₹20 लाख से ज़्यादा" },
];
const MARKETING_SPEND = [
  { value: "कुछ नहीं" }, { value: "₹20 हज़ार" }, { value: "₹50 हज़ार" }, { value: "₹1 लाख" },
];
const MARKETING_BUDGET = [
  { value: "₹20 से 30 हज़ार" }, { value: "₹30 से 50 हज़ार" }, { value: "₹50 हज़ार से 1 लाख" }, { value: "₹1 लाख से ज़्यादा" },
];
const PROBLEMS = [
  { value: "लीड नहीं आ रही", icon: "trend-down" },
  { value: "सेल्स कम है", icon: "shopping-bag" },
  { value: "ब्रांडिंग कमज़ोर है", icon: "tag" },
  { value: "कंटेंट नहीं बन पा रहा", icon: "video-camera" },
  { value: "Other", icon: "pencil-simple-line", reveal: true },
];
const START_WHEN = [
  { value: "तुरंत", icon: "lightning" },
  { value: "1 महीने में", icon: "calendar-blank" },
  { value: "बस जानकारी ले रहे हैं", icon: "magnifying-glass" },
];
const HEARD_FROM = [
  { value: "Instagram" }, { value: "YouTube" }, { value: "किसी दोस्त से" }, { value: "Other", reveal: true },
];

// Radio fields whose "Other" / "हाँ है" option reveals a text box: [option value, text-box field]
const REVEALS = {
  businessType: ["Other", "businessTypeOther"],
  industry: ["Other", "industryOther"],
  social: ["हाँ है", "socialHandle"],
  problem: ["Other", "problemOther"],
  heardFrom: ["Other", "heardFromOther"],
};

const INITIAL_VALUES = {
  name: "", countryCode: "+91", mobile: "", email: "", city: "",
  help: [], businessName: "", noBusinessName: false,
  businessType: "", businessTypeOther: "", industry: "", industryOther: "",
  businessAge: "", social: "", socialHandle: "", website: "", revenue: "",
  marketingSpend: "", marketingBudget: "", problem: "", problemOther: "",
  goal: "", startWhen: "", heardFrom: "", heardFromOther: "", callTime: "",
};

const STEP_COUNT = 5;
const LANG_KEY = "mbm-lang";
const HTML_LANG = { en: "en", hi: "hi", hinglish: "hi-Latn" };
const ERROR_MSG = "फ़ॉर्म भेजने में दिक्कत आई। कृपया इंटरनेट चेक करके दोबारा कोशिश करें।";
const isConfigured = CONFIG.SCRIPT_URL.startsWith("https://script.google.com/");

const RULE_ORDER = ["name", "mobile", "email"];

function savedLang() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (Object.hasOwn(HTML_LANG, saved || "")) return saved;
  } catch (_) {}
  return "en";
}

/* ================= Small building blocks ================= */
// Text box shown under a question when "Other" / "हाँ है" is picked; focuses itself when it appears
function Reveal({ show, name, value, onChange, placeholder, maxLength }) {
  const inputRef = useRef(null);
  const wasShown = useRef(show);
  useEffect(() => {
    if (show && !wasShown.current) inputRef.current.focus();
    wasShown.current = show;
  }, [show]);
  return (
    <div className="control plain reveal" hidden={!show}>
      <input ref={inputRef} type="text" name={name} placeholder={placeholder} maxLength={maxLength}
        value={value} onChange={(e) => onChange(name, e.target.value)} />
    </div>
  );
}

/* ================= App ================= */
export default function App() {
  const [lang, setLang] = useState(savedLang);
  const [values, setValues] = useState(INITIAL_VALUES);
  const [errors, setErrors] = useState({}); // field -> Hindi message ("" = valid); absent = not checked yet
  const [ariaInvalid, setAriaInvalid] = useState({}); // like the original, kept after "fill another form"
  const [nav, setNav] = useState({ current: 0, dir: 1, tick: 0, focus: null });
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, msg: "" });
  const [done, setDone] = useState(null); // { first } once submitted
  const [view, setView] = useState("form"); // "form" | "booking" (1:1 session)
  const [bookingDone, setBookingDone] = useState(false);

  const cardRef = useRef(null);
  const honeypotRef = useRef(null);
  const rainRef = useRef(null);
  const fieldRefs = { name: useRef(null), mobile: useRef(null), email: useRef(null) };
  const titleRefs = [useRef(null), useRef(null), useRef(null), useRef(null), useRef(null)];

  const t = (s) => translate(lang, s);
  const { current } = nav;
  const last = current === STEP_COUNT - 1;

  // ---------- Language ----------
  useEffect(() => {
    try { localStorage.setItem(LANG_KEY, lang); } catch (_) {}
    document.documentElement.lang = HTML_LANG[lang];
  }, [lang]);

  // ---------- After moving between steps: scroll card into view, move focus ----------
  useEffect(() => {
    if (!nav.focus) return;
    const card = cardRef.current;
    if (card.getBoundingClientRect().top < 0) card.scrollIntoView({ behavior: "smooth", block: "start" });
    if (nav.focus === "name") fieldRefs.name.current.focus();
    else titleRefs[nav.current].current.focus({ preventScroll: true });
  }, [nav.tick]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const card = cardRef.current;
    if (done && card.getBoundingClientRect().top < 0) card.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [done]);

  function goTo(i, dir, focus = "title") {
    setNav((n) => ({ current: i, dir, tick: n.tick + 1, focus }));
    setAlert((a) => ({ ...a, show: false }));
  }

  // ---------- Values ----------
  const set = (name, value) => setValues((v) => ({ ...v, [name]: value }));

  function validate(name, vals = values) {
    const msg = RULES[name](vals[name].trim(), vals.countryCode);
    setErrors((e) => ({ ...e, [name]: msg }));
    setAriaInvalid((a) => ({ ...a, [name]: msg ? "true" : "false" }));
    return !msg;
  }

  function validateStep(i) {
    if (i !== 0) return true;
    const bad = RULE_ORDER.filter((n) => !validate(n));
    if (bad.length) fieldRefs[bad[0]].current.focus();
    return bad.length === 0;
  }

  // Props for the three validated inputs (name, mobile, email)
  function validated(name, clean = (x) => x) {
    return {
      ref: fieldRefs[name],
      value: values[name],
      "aria-invalid": ariaInvalid[name],
      onChange: (e) => {
        const next = { ...values, [name]: clean(e.target.value) };
        setValues(next);
        if (errors[name]) validate(name, next);
      },
      onBlur: (e) => e.target.value && validate(name),
    };
  }
  const controlClass = (name, ...extra) =>
    cx("control", ...extra, name in errors && (errors[name] ? "invalid" : "valid"));

  // Radio chips are optional: clicking a selected one again un-selects it
  function radio(name, opt) {
    return {
      type: "radio",
      name,
      value: opt.value,
      "data-reveal": opt.reveal ? "" : undefined,
      checked: values[name] === opt.value,
      onChange: () => set(name, opt.value),
      onClick: () => values[name] === opt.value && set(name, ""),
    };
  }

  function RadioField({ name, labelId, label, extra, options, chipsClass = "chips", reveal }) {
    return (
      <div className="field" role="group" aria-labelledby={labelId}>
        <p className="label" id={labelId}>{extra ? t(label) + " " : t(label)}{extra}</p>
        <div className={chipsClass}>
          {options.map((opt) => (
            <label className="chip" key={opt.value}>
              <input {...radio(name, opt)} />
              <ChipContent icon={opt.icon} text={t(opt.value)} />
            </label>
          ))}
        </div>
        {reveal && (
          <Reveal show={values[name] === REVEALS[name][0]} name={REVEALS[name][1]} value={values[REVEALS[name][1]]}
            onChange={set} placeholder={t(reveal.placeholder)} maxLength={reveal.maxLength} />
        )}
      </div>
    );
  }

  // ---------- Collect values (same keys and formats the Google Sheet script expects) ----------
  function pick(name) {
    const v = values[name];
    if (!v) return "";
    const rev = REVEALS[name];
    if (!rev || v !== rev[0]) return v;
    const extra = values[rev[1]].trim();
    if (v === "Other") return extra ? `Other: ${extra}` : "Other";
    return extra || v; // e.g. social handle
  }

  function collect() {
    return {
      name: values.name.trim(),
      mobile: `${values.countryCode} ${values.mobile.replace(/\D/g, "")}`,
      email: values.email.trim().toLowerCase(),
      city: values.city.trim(),
      help: HELP.map((o) => o.value).filter((v) => values.help.includes(v)).join(", "),
      businessName: values.noBusinessName ? "अभी नाम नहीं है" : values.businessName.trim(),
      businessType: pick("businessType"),
      industry: pick("industry"),
      businessAge: pick("businessAge"),
      social: pick("social"),
      website: values.website.trim(),
      revenue: pick("revenue"),
      marketingSpend: pick("marketingSpend"),
      marketingBudget: pick("marketingBudget"),
      problem: pick("problem"),
      goal: values.goal.trim(),
      startWhen: pick("startWhen"),
      heardFrom: pick("heardFrom"),
      callTime: pick("callTime"),
      source: document.referrer || "direct",
      userAgent: navigator.userAgent,
    };
  }

  // ---------- Submit / Next ----------
  async function onSubmit(e) {
    e.preventDefault();
    setAlert((a) => ({ ...a, show: false }));

    if (!validateStep(current)) return;
    if (current < STEP_COUNT - 1) return goTo(current + 1, 1);

    // Bot caught by honeypot: pretend success, send nothing
    if (honeypotRef.current.value) return showSuccess(collect());

    const data = collect();
    setLoading(true);
    try {
      if (!isConfigured) {
        console.warn("[Mind Behind Money] SCRIPT_URL is not set in src/config.js — demo mode, nothing was saved.", data);
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
      setAlert({ show: true, msg: ERROR_MSG });
    } finally {
      setLoading(false);
    }
  }

  function showSuccess(data) {
    setDone({ first: data.name.split(/\s+/)[0] });
    coinRain();
  }

  // ---------- 1:1 session booking ----------
  function openBooking() {
    setBookingDone(false);
    setView("booking");
    const card = cardRef.current;
    if (card.getBoundingClientRect().top < 0) card.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function closeBooking() {
    setView("form");
    setBookingDone(false);
    const card = cardRef.current;
    if (card.getBoundingClientRect().top < 0) card.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  const sessionCta = (
    <button type="button" className="session-cta" onClick={openBooking}>
      <i className="ph ph-video-camera" aria-hidden="true"></i>
      <span>
        <strong>{t("1:1 सेशन चाहिए?")}</strong>
        <small>{t("15 मिनट ₹499 · 45 मिनट ₹1,000")}</small>
      </span>
      <i className="ph ph-arrow-right" aria-hidden="true"></i>
    </button>
  );

  function fillAgain() {
    setValues(INITIAL_VALUES);
    setErrors({});
    setAlert({ show: false, msg: "" });
    honeypotRef.current.value = "";
    setDone(null);
    goTo(0, -1, "name");
  }

  // ---------- Celebration ----------
  function coinRain() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rain = rainRef.current;
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

  const stepClass = (i) => cx("step", i === current && "active", i === current && nav.dir < 0 && "back-anim");
  const stepTitle = (i, icon, text) => (
    <h4 className="step-title" tabIndex={-1} ref={titleRefs[i]}><i className={`ph ph-${icon}`} aria-hidden="true"></i>{" " + t(text)}</h4>
  );
  const other = { placeholder: "लिखकर बताएँ", maxLength: 80 };

  return (
    <>
      {/* Decorative background */}
      <div className="bg" aria-hidden="true">
        <div className="glow"></div>
        <div className="float bubble b1">
          <svg viewBox="0 0 64 64"><rect x="14" y="34" width="8" height="14" rx="2" fill="#7FB3AE"/><rect x="27" y="26" width="8" height="22" rx="2" fill="#2A7470"/><rect x="40" y="18" width="8" height="30" rx="2" fill="#2A7470"/><path d="M12 30 L26 20 L34 25 L50 12" stroke="#E3A93A" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <div className="float bubble b2">
          <svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="17" fill="#E3A93A" stroke="#B9801E" strokeWidth="3"/><text x="32" y="40" textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="800" fontSize="22" fill="#1E2530">₹</text></svg>
        </div>
        <div className="float bubble b3">
          <svg viewBox="0 0 64 64"><path d="M32 12a14 14 0 0 0-8 25.5V43h16v-5.5A14 14 0 0 0 32 12z" fill="#E3A93A"/><rect x="25" y="46" width="14" height="4" rx="2" fill="#1E2530"/><rect x="27" y="52" width="10" height="3.5" rx="1.75" fill="#1E2530"/></svg>
        </div>
        <div className="float coins c1"><i></i><i></i><i></i><i></i></div>
        <div className="float coins c2"><i></i><i></i><i></i></div>
      </div>

      <main className="wrap">
        {/* Left: brand story */}
        <section className="hero">
          <div className="brand-row">
            <div className="logo-ring">
              <img src="assets/logo.png" alt="Mind Behind Money logo" width="180" height="180" />
            </div>
            <div className="brand-text">
              <p className="eyebrow">Money <span>·</span> Mindset <span>·</span> Business</p>
              <h1 className="brand">
                <span className="brand-top">Mind Behind</span>
                <span className="brand-bottom">Money</span>
              </h1>
              <p className="tagline">Paise ke peeche ki soch</p>
            </div>
          </div>

          <h2 className="pitch">अपने बिज़नेस को <br className="hide-sm" /><span className="hl">अगले लेवल</span> पर ले जाएँ</h2>

          <ul className="stats">
            <li><strong>22K+</strong><span>फ़ॉलोअर्स</span></li>
            <li><strong>4.3M</strong><span>व्यूज़ / 30 दिन</span></li>
          </ul>
        </section>

        {/* Right: form card */}
        <section className="card" id="card" aria-labelledby="form-title" ref={cardRef}>
          <div className="card-head" id="cardHead" hidden={view === "booking" ? bookingDone : !!done}>
            <h3 id="form-title">{t(view === "booking" ? "1:1 सेशन बुक करें" : "हमसे जुड़ें")}</h3>
            <div className="lang-toggle" role="group" aria-label="भाषा / Language">
              {[["en", "English"], ["hi", "हिंदी"], ["hinglish", "Hinglish"]].map(([code, label]) => (
                <button key={code} type="button" data-lang={code} aria-pressed={String(lang === code)}
                  onClick={() => code !== lang && setLang(code)}>{label}</button>
              ))}
            </div>
          </div>

          <form id="connectForm" noValidate onSubmit={onSubmit} hidden={!!done || view === "booking"}>
            {/* Progress */}
            <div className="progress" aria-live="polite">
              <span className="step-count" id="stepCount">{`${t("स्टेप")} ${current + 1} / ${STEP_COUNT}`}</span>
              <div className="bar"><i id="barFill" style={{ width: `${((current + 1) / STEP_COUNT) * 100}%` }}></i></div>
            </div>

            {/* Honeypot (hidden from humans, catches bots) */}
            <input type="text" name="website_url" className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" ref={honeypotRef} />

            {/* ================= STEP 1 ================= */}
            <div className={stepClass(0)} data-title="आपकी जानकारी">
              {stepTitle(0, "hand-waving", "आपकी जानकारी")}

              <div className="field">
                <label htmlFor="name">{t("नाम") + " "}<span className="req">*</span></label>
                <div className={controlClass("name")}>
                  <svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zm0 2c-4.4 0-8 2.2-8 5v2h16v-2c0-2.8-3.6-5-8-5z"/></svg>
                  <input id="name" name="name" type="text" placeholder={t("जैसे: रोहन शर्मा")} autoComplete="name" maxLength={80} required {...validated("name")} />
                </div>
                <small className="err" data-for="name">{t(errors.name || "")}</small>
              </div>

              <div className="field">
                <label htmlFor="mobile">{t("फ़ोन / WhatsApp नंबर") + " "}<span className="req">*</span></label>
                <div className={controlClass("mobile", "phone")}>
                  <svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg>
                  <select id="countryCode" name="countryCode" aria-label="Country code" value={values.countryCode}
                    onChange={(e) => {
                      const next = { ...values, countryCode: e.target.value };
                      setValues(next);
                      if (next.mobile) validate("mobile", next);
                    }}>
                    {COUNTRY_CODES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
                  </select>
                  <input id="mobile" name="mobile" type="tel" inputMode="numeric" placeholder="98765 43210" autoComplete="tel-national" maxLength={15} required
                    {...validated("mobile", (x) => x.replace(/[^\d\s]/g, ""))} />
                </div>
                <small className="err" data-for="mobile">{t(errors.mobile || "")}</small>
              </div>

              <div className="field">
                <label htmlFor="email">{t("ईमेल") + " "}<span className="req">*</span></label>
                <div className={controlClass("email")}>
                  <svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm9 7.2L4.4 7H4v.6l8 5.4 8-5.4V7h-.4z"/></svg>
                  <input id="email" name="email" type="email" placeholder="you@company.com" autoComplete="email" maxLength={120} required {...validated("email")} />
                </div>
                <small className="err" data-for="email">{t(errors.email || "")}</small>
              </div>

              <div className="field">
                <label htmlFor="city">{t("शहर")}</label>
                <div className="control">
                  <svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 14.5 9 2.5 2.5 0 0 1 12 11.5z"/></svg>
                  <input id="city" name="city" type="text" placeholder={t("जैसे: इंदौर, जयपुर, मुंबई")} autoComplete="address-level2" maxLength={60}
                    value={values.city} onChange={(e) => set("city", e.target.value)} />
                </div>
              </div>
            </div>

            {/* ================= STEP 2 ================= */}
            <div className={stepClass(1)} data-title="आपका बिज़नेस">
              {stepTitle(1, "briefcase", "आपका बिज़नेस")}

              <div className="field" role="group" aria-labelledby="lbl-help">
                <p className="label" id="lbl-help">{t("आपको किस चीज़ में मदद चाहिए?") + " "}<span className="hint">{t("एक से ज़्यादा चुन सकते हैं")}</span></p>
                <div className="chips cards">
                  {HELP.map((opt) => (
                    <label className="chip" key={opt.value}>
                      <input type="checkbox" name="help" value={opt.value} checked={values.help.includes(opt.value)}
                        onChange={(e) => set("help", e.target.checked ? [...values.help, opt.value] : values.help.filter((v) => v !== opt.value))} />
                      <ChipContent icon={opt.icon} text={t(opt.value)} />
                    </label>
                  ))}
                </div>
              </div>

              <div className="field">
                <label htmlFor="businessName">{t("बिज़नेस का नाम") + " "}<span className="opt">{t("ऑप्शनल")}</span></label>
                <div className={cx("control plain", values.noBusinessName && "disabled")}>
                  <input id="businessName" name="businessName" type="text" placeholder={t("बिज़नेस का नाम लिखें")} maxLength={100}
                    disabled={values.noBusinessName} value={values.businessName} onChange={(e) => set("businessName", e.target.value)} />
                </div>
                <div className="chips small">
                  <label className="chip">
                    <input type="checkbox" name="noBusinessName" id="noBusinessName" value="अभी नाम नहीं है" checked={values.noBusinessName}
                      onChange={(e) => setValues((v) => ({ ...v, noBusinessName: e.target.checked, businessName: e.target.checked ? "" : v.businessName }))} />
                    <span>{t("अभी नाम नहीं है")}</span>
                  </label>
                </div>
              </div>

              {RadioField({ name: "businessType", labelId: "lbl-type", label: "बिज़नेस टाइप", options: BUSINESS_TYPES, reveal: other })}
              {RadioField({ name: "industry", labelId: "lbl-industry", label: "इंडस्ट्री", options: INDUSTRIES, reveal: other })}
            </div>

            {/* ================= STEP 3 ================= */}
            <div className={stepClass(2)} data-title="बिज़नेस डिटेल">
              {stepTitle(2, "chart-bar", "बिज़नेस डिटेल")}

              {RadioField({ name: "businessAge", labelId: "lbl-age", label: "बिज़नेस कितना पुराना है?", options: BUSINESS_AGES })}
              {RadioField({ name: "social", labelId: "lbl-social", label: "सोशल मीडिया हैंडल है?", options: SOCIAL,
                reveal: { placeholder: "हैंडल का नाम या लिंक लिखें (जैसे @yourbrand)", maxLength: 150 } })}

              <div className="field">
                <label htmlFor="website">{t("वेबसाइट") + " "}<span className="opt">{t("ऑप्शनल")}</span></label>
                <div className="control">
                  <svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm6.9 6h-3a15.7 15.7 0 0 0-1.4-3.6A8 8 0 0 1 18.9 8zM12 4a14 14 0 0 1 1.9 4h-3.8A14 14 0 0 1 12 4zM4.3 14a7.7 7.7 0 0 1 0-4h3.4a16.5 16.5 0 0 0 0 4zm.8 2h3a15.7 15.7 0 0 0 1.4 3.6A8 8 0 0 1 5.1 16zm3-8h-3a8 8 0 0 1 4.4-3.6A15.7 15.7 0 0 0 8.1 8zM12 20a14 14 0 0 1-1.9-4h3.8A14 14 0 0 1 12 20zm2.3-6H9.7a14.7 14.7 0 0 1 0-4h4.6a14.7 14.7 0 0 1 0 4zm.2 5.6a15.7 15.7 0 0 0 1.4-3.6h3a8 8 0 0 1-4.4 3.6zm1.8-5.6a16.5 16.5 0 0 0 0-4h3.4a7.7 7.7 0 0 1 0 4z"/></svg>
                  <input id="website" name="website" type="text" inputMode="url" placeholder="www.yourbusiness.com" maxLength={150}
                    value={values.website} onChange={(e) => set("website", e.target.value)} />
                </div>
              </div>

              {RadioField({ name: "revenue", labelId: "lbl-revenue", label: "मंथली रेवेन्यू", options: REVENUES,
                extra: <span className="opt">{t("ऑप्शनल")}</span> })}
            </div>

            {/* ================= STEP 4 ================= */}
            <div className={stepClass(3)} data-title="मार्केटिंग">
              {stepTitle(3, "megaphone", "मार्केटिंग")}

              {RadioField({ name: "marketingSpend", labelId: "lbl-spend", label: "अभी मार्केटिंग पर हर महीने कितना ख़र्च करते हैं?", options: MARKETING_SPEND })}
              {RadioField({ name: "marketingBudget", labelId: "lbl-budget", label: "आगे मार्केटिंग का बजट (हर महीने)", options: MARKETING_BUDGET })}
              {RadioField({ name: "problem", labelId: "lbl-problem", label: "सबसे बड़ी परेशानी क्या है?", options: PROBLEMS,
                reveal: { placeholder: "लिखकर बताएँ", maxLength: 150 } })}
            </div>

            {/* ================= STEP 5 ================= */}
            <div className={stepClass(4)} data-title="आख़िरी स्टेप">
              {stepTitle(4, "target", "आख़िरी स्टेप")}

              <div className="field">
                <label htmlFor="goal">{t("अगले 3 महीने का लक्ष्य")}</label>
                <div className="control area">
                  <textarea id="goal" name="goal" rows={3} maxLength={300} placeholder={t("छोटा जवाब लिखें — जैसे: हर महीने 100 नई लीड, दूसरी ब्रांच खोलना…")}
                    value={values.goal} onChange={(e) => set("goal", e.target.value)}></textarea>
                </div>
                <div className="meta"><span></span><small className="count"><span id="charCount">{values.goal.length}</span>/300</small></div>
              </div>

              {RadioField({ name: "startWhen", labelId: "lbl-start", label: "कब से शुरू करना चाहते हैं?", options: START_WHEN })}
              {RadioField({ name: "heardFrom", labelId: "lbl-heard", label: "हमारे बारे में कहाँ से पता चला?", options: HEARD_FROM, reveal: other })}
              {RadioField({ name: "callTime", labelId: "lbl-call", label: "कॉल का सही टाइम", options: CALL_TIMES, chipsClass: "chips cards three" })}
            </div>

            {/* Navigation */}
            <div className="nav">
              <button type="button" className="back" id="backBtn" hidden={current === 0} disabled={loading}
                onClick={() => current > 0 && goTo(current - 1, -1)}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H7m5 6-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {t("पीछे")}
              </button>
              <button type="submit" className={cx("submit", last && "final", loading && "loading")} id="submitBtn" disabled={loading}>
                <span className="label-txt">{t(loading ? "भेज रहे हैं…" : last ? "फ़ॉर्म भेजें" : "आगे बढ़ें")}</span>
                <svg className="arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h12m-5-6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span className="spinner" aria-hidden="true"></span>
              </button>
            </div>

            <p className={cx("form-alert", alert.show && "show")} id="formAlert" role="alert">{alert.msg && t(alert.msg)}</p>
            {sessionCta}
          </form>

          {view === "booking" && (
            <Booking t={t} lang={lang} onBack={closeBooking}
              prefill={{ name: values.name, countryCode: values.countryCode, mobile: values.mobile, email: values.email }}
              onConfirmed={() => { setBookingDone(true); coinRain(); }} />
          )}

          {/* Success state */}
          <div className="success" id="success" hidden={!done || view === "booking"}>
            <div className="success-icon">
              <svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24"/><path d="M15 27l7 7 15-16"/></svg>
            </div>
            <h3>{t("धन्यवाद,") + " "}<span id="successName">{done?.first || t("दोस्त")}</span>! <i className="ph ph-hands-clapping" aria-hidden="true"></i></h3>
            <p id="successMsg">{t("आपकी जानकारी हमें मिल गई है। हमारी टीम जल्द ही आपसे संपर्क करेगी।")}</p>
            {sessionCta}
            <a className="insta" id="instaLink" href={CONFIG.INSTAGRAM_URL || "#"} target="_blank" rel="noopener" hidden={!CONFIG.INSTAGRAM_URL}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm5 5.5A4.5 4.5 0 1 0 16.5 12 4.5 4.5 0 0 0 12 7.5zm0 2A2.5 2.5 0 1 1 9.5 12 2.5 2.5 0 0 1 12 9.5zM17.5 5.5a1 1 0 1 0 1 1 1 1 0 0 0-1-1z"/></svg>
              {t("Instagram पर और वीडियो देखें")}
            </a>
            <button type="button" className="ghost" id="againBtn" onClick={fillAgain}>{t("एक और फ़ॉर्म भरें")}</button>
          </div>
        </section>
      </main>

      <footer className="foot">© <span id="year">{new Date().getFullYear()}</span> Mind Behind Money</footer>

      <div className="coin-rain" id="coinRain" aria-hidden="true" ref={rainRef}></div>
    </>
  );
}
