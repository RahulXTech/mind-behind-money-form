/* ============ 1:1 session booking ============
 * Choose plan → details → pay → booking saved (localStorage now, MongoDB later) → PDF receipt.
 */
import { useEffect, useRef, useState } from "react";
import { CONFIG } from "./config.js";
import { CALL_TIMES, COUNTRY_CODES, ChipContent, RULES, cx } from "./shared.jsx";
import { isTestMode, pay, randomId } from "./payment.js";
import { createServerOrder, saveLocal, verifyServerPayment } from "./bookingStore.js";
import { downloadBlob, makeReceiptPdf } from "./receiptPdf.js";

const PLANS = CONFIG.SESSION_PLANS;
const ORDER = ["plan", "name", "mobile", "email", "date", "slot"];

const inr = (n) => "₹" + n.toLocaleString("en-IN");
const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return isoDate(d); };

const CHECKS = {
  ...RULES,
  plan: (v) => (v ? "" : "कृपया सेशन चुनें।"),
  date: (v) => (!v ? "कृपया तारीख चुनें।" : v < addDays(1) || v > addDays(60) ? "कृपया आज के बाद की तारीख चुनें।" : ""),
  slot: (v) => (v ? "" : "कृपया टाइम चुनें।"),
};

export default function Booking({ t, lang, prefill, onBack, onConfirmed }) {
  const [v, setV] = useState({
    plan: "", name: prefill.name || "", countryCode: prefill.countryCode || "+91", mobile: prefill.mobile || "",
    email: prefill.email || "", date: "", slot: "", topic: "",
  });
  const [errors, setErrors] = useState({});
  const [paying, setPaying] = useState(false);
  const [alert, setAlert] = useState("");
  const [booking, setBooking] = useState(null);

  const titleRef = useRef(null);
  const refs = { plan: useRef(null), name: useRef(null), mobile: useRef(null), email: useRef(null), date: useRef(null), slot: useRef(null) };
  const plan = PLANS.find((p) => p.id === v.plan);
  const testMode = isTestMode();

  useEffect(() => { titleRef.current.focus({ preventScroll: true }); }, []);

  // ---------- Values + validation ----------
  const check = (name, vals) => CHECKS[name](typeof vals[name] === "string" ? vals[name].trim() : vals[name], vals.countryCode);

  function update(name, value) {
    const next = { ...v, [name]: value };
    setV(next);
    if (errors[name]) setErrors((e) => ({ ...e, [name]: check(name, next) }));
    if (name === "countryCode" && next.mobile) setErrors((e) => ({ ...e, mobile: check("mobile", next) }));
  }
  const validate = (name) => setErrors((e) => ({ ...e, [name]: check(name, v) }));
  const controlClass = (name, ...extra) => cx("control", ...extra, name in errors && (errors[name] ? "invalid" : "valid"));
  const err = (name) => <small className="err">{t(errors[name] || "")}</small>;
  const fmtDate = (iso) =>
    new Date(iso + "T00:00:00").toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric" });

  // ---------- Pay ----------
  async function onSubmit(e) {
    e.preventDefault();
    setAlert("");
    const found = Object.fromEntries(ORDER.map((n) => [n, check(n, v)]));
    setErrors(found);
    const firstBad = ORDER.find((n) => found[n]);
    if (firstBad) {
      const el = refs[firstBad].current;
      (el.querySelector?.("input") || el).focus();
      return;
    }

    const details = {
      plan: plan.id,
      name: v.name.trim(),
      mobile: `${v.countryCode} ${v.mobile.replace(/\D/g, "")}`,
      email: v.email.trim().toLowerCase(),
      preferredDate: v.date,
      timeSlot: v.slot,
      topic: v.topic.trim(),
      language: lang,
    };
    const checkout = {
      amount: plan.amount,
      description: `1:1 Session · ${plan.minutes} min`,
      prefill: { name: details.name, email: details.email, contact: details.mobile.replace(/\s/g, "") },
      notes: { plan: plan.id, date: v.date, slot: v.slot },
    };
    let paymentId = "";
    setPaying(true);
    try {
      let record;
      if (CONFIG.API_URL) {
        // Real flow: server creates the order (price decided there) → Razorpay → server verifies + saves to MongoDB
        const order = await createServerOrder(details);
        const payment = await pay({ ...checkout, amount: order.amount, orderId: order.orderId, keyId: order.keyId,
          notes: { ...checkout.notes, bookingId: order.bookingId } });
        paymentId = payment.paymentId;
        record = await verifyServerPayment({
          razorpay_order_id: payment.orderId,
          razorpay_payment_id: payment.paymentId,
          razorpay_signature: payment.signature,
        });
      } else {
        // Test mode (or key-only preview): nothing is verified, the booking stays in this browser
        const payment = await pay(checkout);
        const now = new Date();
        record = {
          id: `MBM-${isoDate(now).replace(/-/g, "")}-${randomId(4)}`,
          createdAt: now.toISOString(),
          minutes: plan.minutes,
          amount: plan.amount,
          currency: "INR",
          ...details,
          payment: { status: "paid", ...payment, paidAt: now.toISOString() },
        };
      }
      saveLocal(record);
      setBooking(record);
      onConfirmed();
      downloadReceipt(record);
    } catch (error) {
      console.error(error);
      setAlert(error.code === "cancelled"
        ? t("पेमेंट रद्द हो गया। जब तैयार हों, दोबारा कोशिश करें।")
        : error.code === "pending" && paymentId
          ? t("पेमेंट मिल गया है, कन्फ़र्मेशन बाकी है। हम जल्द ही WhatsApp पर बुकिंग कन्फ़र्म करेंगे। पेमेंट ID:") + " " + paymentId
        : error.code === "verify" && paymentId
          ? t("पेमेंट हो गया है पर कन्फ़र्म नहीं हो पाया। कृपया यह पेमेंट ID भेजकर हमसे संपर्क करें:") + " " + paymentId
          : t("पेमेंट नहीं हो पाया। कृपया दोबारा कोशिश करें।"));
    } finally {
      setPaying(false);
    }
  }

  // ---------- Receipt ----------
  async function downloadReceipt(b = booking) {
    const p = PLANS.find((x) => x.id === b.plan);
    const paidOn = new Date(b.payment.paidAt).toLocaleString(lang === "hi" ? "hi-IN" : "en-IN", { dateStyle: "medium", timeStyle: "short" });
    try {
      const blob = await makeReceiptPdf({
        testMode: b.payment.provider === "test",
        labels: {
          title: t("बुकिंग रसीद"), bookingId: t("बुकिंग ID"), issuedOn: t("जारी करने की तारीख"), total: t("कुल"),
          paid: t("पेड"), footer: t("यह कंप्यूटर से बनी रसीद है, इस पर हस्ताक्षर की ज़रूरत नहीं है।"),
          testWatermark: t("टेस्ट मोड — यह असली पेमेंट नहीं है"),
        },
        values: { id: b.id, issuedOn: fmtDate(b.createdAt.slice(0, 10)), amount: inr(b.amount) },
        sections: [
          { title: t("सेशन डिटेल"), rows: [
            [t("सेशन"), `${t("1:1 सेशन")} · ${t(p.label)}`],
            [t("तारीख"), fmtDate(b.preferredDate)],
            [t("टाइम"), t(b.timeSlot)],
            [t("विषय"), b.topic],
          ] },
          { title: t("ग्राहक"), rows: [[t("नाम"), b.name], [t("फ़ोन"), b.mobile], [t("ईमेल"), b.email]] },
          { title: t("पेमेंट"), rows: [
            [t("अमाउंट"), inr(b.amount)],
            [t("पेमेंट का तरीका"), b.payment.provider === "test" ? t("टेस्ट पेमेंट") : "Razorpay"],
            [t("पेमेंट ID"), b.payment.paymentId],
            [t("पेमेंट की तारीख"), paidOn],
          ] },
        ],
      });
      downloadBlob(blob, `MindBehindMoney-Receipt-${b.id}.pdf`);
    } catch (error) {
      console.error("[Mind Behind Money] Could not create the receipt PDF:", error);
    }
  }

  // ---------- Confirmed ----------
  if (booking) {
    const p = PLANS.find((x) => x.id === booking.plan);
    const rows = [
      ["बुकिंग ID", booking.id],
      ["सेशन", `${t("1:1 सेशन")} · ${t(p.label)}`],
      ["तारीख", fmtDate(booking.preferredDate)],
      ["टाइम", t(booking.timeSlot)],
      ["अमाउंट", inr(booking.amount)],
      ["पेमेंट ID", booking.payment.paymentId],
    ];
    return (
      <div className="success booked" id="bookingSuccess">
        <div className="success-icon">
          <svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24"/><path d="M15 27l7 7 15-16"/></svg>
        </div>
        <h3>{t("बुकिंग कन्फ़र्म!") + " "}<i className="ph ph-confetti" aria-hidden="true"></i></h3>
        <p>{t("पेमेंट मिल गया है। सेशन का टाइम हम WhatsApp पर कन्फ़र्म करेंगे।")}</p>
        <dl className="booking-summary">
          {rows.map(([label, value]) => (
            <div key={label}><dt>{t(label)}</dt><dd>{value}</dd></div>
          ))}
        </dl>
        {booking.payment.provider === "test" && <p className="pay-note test">{t("टेस्ट मोड: यह असली पेमेंट नहीं था।")}</p>}
        <button type="button" className="submit final receipt-btn" onClick={() => downloadReceipt()}>
          <i className="ph ph-file-pdf" aria-hidden="true"></i>
          <span className="label-txt">{t("रसीद डाउनलोड करें (PDF)")}</span>
        </button>
        <button type="button" className="ghost" onClick={onBack}>{t("फ़ॉर्म पर वापस जाएँ")}</button>
      </div>
    );
  }

  // ---------- Booking form ----------
  const payLabel = plan ? t("{amount} पे करें").replace("{amount}", inr(plan.amount)) : t("पेमेंट करें");

  return (
    <form id="bookingForm" noValidate onSubmit={onSubmit}>
      <div className="step active">
        <h4 className="step-title" tabIndex={-1} ref={titleRef}><i className="ph ph-calendar-check" aria-hidden="true"></i>{" " + t("सेशन डिटेल")}</h4>

        <div className="field" role="radiogroup" aria-labelledby="lbl-plan" ref={refs.plan}>
          <p className="label" id="lbl-plan">{t("सेशन चुनें") + " "}<span className="req">*</span></p>
          <div className="chips cards plans">
            {PLANS.map((p) => (
              <label className="chip" key={p.id}>
                <input type="radio" name="plan" value={p.id} checked={v.plan === p.id} onChange={() => update("plan", p.id)} />
                <span>
                  <b aria-hidden="true"><i className={`ph ph-${p.icon}`}></i></b>
                  {t(p.label)}
                  <strong className="price">{inr(p.amount)}</strong>
                  <small>{t(p.desc)}</small>
                </span>
              </label>
            ))}
          </div>
          {err("plan")}
        </div>

        <div className="field">
          <label htmlFor="b-name">{t("नाम") + " "}<span className="req">*</span></label>
          <div className={controlClass("name")}>
            <svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zm0 2c-4.4 0-8 2.2-8 5v2h16v-2c0-2.8-3.6-5-8-5z"/></svg>
            <input id="b-name" type="text" placeholder={t("जैसे: रोहन शर्मा")} autoComplete="name" maxLength={80} ref={refs.name}
              value={v.name} aria-invalid={errors.name ? "true" : undefined}
              onChange={(e) => update("name", e.target.value)} onBlur={(e) => e.target.value && validate("name")} />
          </div>
          {err("name")}
        </div>

        <div className="field">
          <label htmlFor="b-mobile">{t("फ़ोन / WhatsApp नंबर") + " "}<span className="req">*</span></label>
          <div className={controlClass("mobile", "phone")}>
            <svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg>
            <select aria-label="Country code" value={v.countryCode} onChange={(e) => update("countryCode", e.target.value)}>
              {COUNTRY_CODES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
            </select>
            <input id="b-mobile" type="tel" inputMode="numeric" placeholder="98765 43210" autoComplete="tel-national" maxLength={15} ref={refs.mobile}
              value={v.mobile} aria-invalid={errors.mobile ? "true" : undefined}
              onChange={(e) => update("mobile", e.target.value.replace(/[^\d\s]/g, ""))} onBlur={(e) => e.target.value && validate("mobile")} />
          </div>
          {err("mobile")}
        </div>

        <div className="field">
          <label htmlFor="b-email">{t("ईमेल") + " "}<span className="req">*</span></label>
          <div className={controlClass("email")}>
            <svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm9 7.2L4.4 7H4v.6l8 5.4 8-5.4V7h-.4z"/></svg>
            <input id="b-email" type="email" placeholder="you@company.com" autoComplete="email" maxLength={120} ref={refs.email}
              value={v.email} aria-invalid={errors.email ? "true" : undefined}
              onChange={(e) => update("email", e.target.value)} onBlur={(e) => e.target.value && validate("email")} />
          </div>
          {err("email")}
        </div>

        <div className="field">
          <label htmlFor="b-date">{t("सेशन की तारीख") + " "}<span className="req">*</span></label>
          <div className={controlClass("date")}>
            <svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h2v2h6V2h2v2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2zm-2 8v10h14V10z"/></svg>
            <input id="b-date" type="date" min={addDays(1)} max={addDays(60)} ref={refs.date}
              value={v.date} aria-invalid={errors.date ? "true" : undefined}
              onChange={(e) => update("date", e.target.value)} />
          </div>
          {err("date")}
        </div>

        <div className="field" role="radiogroup" aria-labelledby="lbl-slot" ref={refs.slot}>
          <p className="label" id="lbl-slot">{t("सेशन का टाइम") + " "}<span className="req">*</span></p>
          <div className="chips cards three">
            {CALL_TIMES.map((opt) => (
              <label className="chip" key={opt.value}>
                <input type="radio" name="slot" value={opt.value} checked={v.slot === opt.value} onChange={() => update("slot", opt.value)} />
                <ChipContent icon={opt.icon} text={t(opt.value)} />
              </label>
            ))}
          </div>
          {err("slot")}
        </div>

        <div className="field">
          <label htmlFor="b-topic">{t("किस बारे में बात करनी है?") + " "}<span className="opt">{t("ऑप्शनल")}</span></label>
          <div className="control area">
            <textarea id="b-topic" rows={3} maxLength={300} placeholder={t("छोटा जवाब लिखें — जैसे: नए प्रोडक्ट की प्राइसिंग, Instagram से लीड…")}
              value={v.topic} onChange={(e) => update("topic", e.target.value)}></textarea>
          </div>
          <div className="meta"><span></span><small className="count">{v.topic.length}/300</small></div>
        </div>
      </div>

      <div className="nav">
        <button type="button" className="back" disabled={paying} onClick={onBack}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H7m5 6-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {t("पीछे")}
        </button>
        <button type="submit" className={cx("submit final", paying && "loading")} id="payBtn" disabled={paying}>
          <span className="label-txt">{paying ? t("पेमेंट हो रहा है…") : payLabel}</span>
          <svg className="arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h12m-5-6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span className="spinner" aria-hidden="true"></span>
        </button>
      </div>

      <p className={cx("form-alert", alert && "show")} role="alert">{alert}</p>
      <p className={cx("pay-note", testMode && "test")}>
        <i className={`ph ph-${testMode ? "flask" : "lock-simple"}`} aria-hidden="true"></i>
        {" " + t(testMode ? "टेस्ट मोड: अभी कोई असली पेमेंट नहीं कटेगा।" : "पेमेंट के बाद आपकी रसीद (PDF) तुरंत डाउनलोड होगी।")}
      </p>
    </form>
  );
}
