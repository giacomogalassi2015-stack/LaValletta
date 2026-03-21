/* ============================================================
   booking.js — Ca' della Valletta
   ============================================================ */

/* ============================================================
   LETTURA CONFIG DAL DOM
   ============================================================ */
(function readRoomConfig() {
    var widget = document.getElementById('preventivo-box');
    if (!widget) return;

    var room   = widget.getAttribute('data-room');
    var name   = widget.getAttribute('data-room-name');
    var calRaw = widget.getAttribute('data-calendar-urls');

    if (room)   window.CURRENT_ROOM = room;
    if (name)   window.ROOM_NAME    = name;
    if (calRaw) {
        try   { window.CALENDAR_URLS = JSON.parse(calRaw); }
        catch { window.CALENDAR_URLS = []; }
    }
})();

/* ============================================================
   COSTANTI
   ============================================================ */
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vROmTNDLNHlbBVbuIa2H2QZMO5sLDCvX1gBe1WP_5dNXp7OOmblUiwVFZXprxgUgECRWVZSCL9AYzvo/pub?output=csv';
const proxy         = 'https://api.codetabs.com/v1/proxy?quest=';

const MIN_NIGHT_MSG = {
    it: 'Minimo 1 notte. Seleziona date diverse.',
    en: 'Minimum 1 night. Please select different dates.',
    fr: 'Minimum 1 nuit. Veuillez sélectionner des dates différentes.',
    de: 'Mindestens 1 Nacht. Bitte andere Daten wählen.',
    es: 'Mínimo 1 noche. Por favor selecciona fechas diferentes.'
};

let pricingRules = [];

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', async function () {

    try {
        const sep     = SHEET_CSV_URL.includes('?') ? '&' : '?';
        const res     = await fetch(SHEET_CSV_URL + sep + 't=' + Date.now());
        if (!res.ok) throw new Error('Errore download Google Sheets');
        pricingRules  = parseCSVToJSON(await res.text());
        pricingRules.sort((a, b) => a.mese - b.mese);
        console.log('✅ Listino prezzi:', pricingRules.length, 'mesi');
    } catch (err) {
        console.error('❌ Google Sheets:', err.message);
    }

    let blockedDates   = [];
    const calendarUrls = window.CALENDAR_URLS;

    if (calendarUrls && calendarUrls.length > 0) {
        console.log('⏳ Scarico', calendarUrls.length, 'calendari per:', window.ROOM_NAME);
        const results = await Promise.all(calendarUrls.map(fetchICalDates));
        blockedDates  = results.flat();
        console.log('🔒 Date occupate:', blockedDates.length);
    } else {
        console.warn('⚠️ Nessun calendario trovato.');
    }

    initCalendar(blockedDates);

    const guestsEl = document.getElementById('guests');
    if (guestsEl) {
        guestsEl.addEventListener('change', function () {
            const dp = document.getElementById('date-picker')._flatpickr;
            if (dp && dp.selectedDates.length === 2) {
                const s   = dp.selectedDates[0];
                const e   = dp.selectedDates[1];
                const str = dp.formatDate(s, 'd/m/Y') + ' — ' + dp.formatDate(e, 'd/m/Y');
                calculateTotal(s, e, str);
            }
        });
    }

    injectClearButton();
});

/* ============================================================
   BOTTONE X — Reset fluido
   ============================================================ */
function injectClearButton() {
    const input = document.getElementById('date-picker');
    if (!input) return;

    const wrapper          = input.parentElement;
    wrapper.style.position = 'relative';

    const btn         = document.createElement('button');
    btn.type          = 'button';
    btn.id            = 'clear-dates-btn';
    btn.setAttribute('aria-label', 'Cancella date');
    btn.innerHTML     = '✕';
    btn.style.cssText = [
        'position:absolute', 'right:10px', 'top:50%',
        'transform:translateY(-50%)', 'background:none',
        'border:none', 'cursor:pointer', 'font-size:1rem',
        'color:#aaa', 'display:none', 'z-index:5',
        'line-height:1', 'padding:4px'
    ].join(';');

    btn.addEventListener('click', resetCalendar);
    wrapper.appendChild(btn);
}

function toggleClearBtn(show) {
    const btn = document.getElementById('clear-dates-btn');
    if (btn) btn.style.display = show ? 'block' : 'none';
}

function resetCalendar() {
    const dp = window.myCalendarInstance;
    if (!dp) return;
    dp.clear();
    dp.set('maxDate', false);
    dp.set('disable', window._defaultDisable || []);
    hidePriceSummary();
    toggleClearBtn(false);
}

function hidePriceSummary() {
    const loading = document.getElementById('loading-prices');
    const summary = document.getElementById('price-summary');
    if (loading) loading.style.display = 'none';
    if (summary) summary.style.display = 'none';
}

/* ============================================================
   COSTRUISCE L'ARRAY disable (date occupate + mesi chiusi)
   ============================================================ */
function buildDefaultDisable(blockedDates) {
    const dbMonths = pricingRules.map(r => r.mese);
    const hasData  = dbMonths.length > 0;

    return [
        ...blockedDates,
        function monthRule(date) {
            const m = date.getMonth() + 1;
            return hasData ? !dbMonths.includes(m) : (m < 4 || m > 10);
        }
    ];
}

/* ============================================================
   INIZIALIZZA FLATPICKR
   ============================================================ */
function initCalendar(blockedDates) {
    const lang           = document.documentElement.lang || 'it';
    const fpLocale       = (lang === 'en') ? 'default' : lang;
    const defaultDisable = buildDefaultDisable(blockedDates);

    window._defaultDisable = defaultDisable;

    window.myCalendarInstance = flatpickr('#date-picker', {
        mode:       'range',
        minDate:    'today',
        dateFormat: 'd/m/Y',
        locale:     fpLocale,
        disable:    defaultDisable,

        onOpen: function (selectedDates) {
            if (selectedDates.length === 2) {
                resetCalendar();
            }
        },

        onChange: function (selectedDates, dateStr, instance) {

            if (selectedDates.length === 0) {
                instance.set('maxDate', false);
                instance.set('disable', defaultDisable);
                hidePriceSummary();
                toggleClearBtn(false);
                return;
            }

            if (selectedDates.length === 1) {
                toggleClearBtn(true);

                const start     = selectedDates[0].getTime();
                let nextBlocked = null;
                let closest     = Infinity;

                blockedDates.forEach(b => {
                    const bFrom = new Date(b.from).setHours(0, 0, 0, 0);
                    if (bFrom > start && bFrom < closest) {
                        closest     = bFrom;
                        nextBlocked = new Date(bFrom);
                    }
                });

                if (nextBlocked) {
                    const dbMonths = pricingRules.map(r => r.mese);
                    const hasData  = dbMonths.length > 0;

                    const tempDisable = blockedDates.map(b => {
                        const bFrom   = new Date(b.from).setHours(0, 0, 0, 0);
                        const newFrom = (bFrom === nextBlocked.getTime())
                            ? new Date(new Date(b.from).setDate(new Date(b.from).getDate() + 1))
                            : new Date(b.from);
                        return { from: newFrom, to: new Date(b.to) };
                    });

                    instance.set('maxDate', nextBlocked);
                    instance.set('disable', [
                        ...tempDisable,
                        function (date) {
                            const m = date.getMonth() + 1;
                            return hasData ? !dbMonths.includes(m) : (m < 4 || m > 10);
                        }
                    ]);
                } else {
                    instance.set('maxDate', false);
                    instance.set('disable', defaultDisable);
                }
                return;
            }

            if (selectedDates.length === 2) {
                let start = selectedDates[0];
                let end   = selectedDates[1];

                const sTime = new Date(start).setHours(0, 0, 0, 0);
                const eTime = new Date(end).setHours(0, 0, 0, 0);

                if (sTime === eTime) {
                    const nextDay = new Date(start);
                    nextDay.setDate(nextDay.getDate() + 1);

                    const nextDayTime    = nextDay.setHours(0, 0, 0, 0);
                    const nextDayBlocked = blockedDates.some(b => {
                        const bFrom = new Date(b.from).setHours(0, 0, 0, 0);
                        const bTo   = new Date(b.to).setHours(0, 0, 0, 0);
                        return nextDayTime >= bFrom && nextDayTime <= bTo;
                    });

                    if (nextDayBlocked) {
                        hidePriceSummary();
                        toggleClearBtn(false);

                        const msgEl = document.getElementById('min-night-msg');
                        if (msgEl) {
                            const curLang     = document.documentElement.lang || 'it';
                            msgEl.textContent = MIN_NIGHT_MSG[curLang] || MIN_NIGHT_MSG.it;
                            msgEl.style.display = 'block';
                            setTimeout(() => { msgEl.style.display = 'none'; }, 4000);
                        }

                        setTimeout(resetCalendar, 50);
                        return;
                    }

                    end = new Date(start);
                    end.setDate(end.getDate() + 1);
                    instance.setDate([start, end], false);
                }

                toggleClearBtn(true);

                const rangeDateStr = instance.formatDate(start, 'd/m/Y') +
                                     ' — ' +
                                     instance.formatDate(end, 'd/m/Y');

                calculateTotal(start, end, rangeDateStr);
            }
        }
    });
}

/* ============================================================
   CSV → JSON
   ============================================================ */
function parseCSVToJSON(csvText) {
    const lines   = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const result  = [];

    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        if (cols.length !== headers.length) continue;
        const obj  = {};
        headers.forEach((h, j) => {
            const v = cols[j].trim();
            obj[h]  = (!isNaN(v) && v !== '') ? Number(v) : v;
        });
        result.push(obj);
    }
    return result;
}

/* ============================================================
   SCARICA UN SINGOLO ICAL
   ============================================================ */
async function fetchICalDates(url) {
    if (!url) return [];
    try {
        const res      = await fetch(proxy + encodeURIComponent(url) + '&t=' + Date.now());
        if (!res.ok) throw new Error('Network error');
        const jcalData = ICAL.parse(await res.text());
        const comp     = new ICAL.Component(jcalData);

        return comp.getAllSubcomponents('vevent').map(vevent => {
            const ev  = new ICAL.Event(vevent);
            const end = ev.endDate.toJSDate();
            end.setDate(end.getDate() - 1);
            return { from: ev.startDate.toJSDate(), to: end };
        });
    } catch (e) {
        console.error('❌ iCal error:', url, e);
        return [];
    }
}

/* ============================================================
   CALCOLO PREZZI
   ============================================================ */
function calculateTotal(startDate, endDate, dateString) {
    const loading = document.getElementById('loading-prices');
    const summary = document.getElementById('price-summary');
    if (loading) loading.style.display = 'block';
    if (summary) summary.style.display = 'none';

    const s = new Date(startDate); s.setHours(0, 0, 0, 0);
    const e = new Date(endDate);   e.setHours(0, 0, 0, 0);

    const totalNights = Math.ceil(Math.abs(e - s) / 86400000);

    if (totalNights === 0) {
        if (loading) loading.style.display = 'none';
        return;
    }

    const guests        = parseInt(document.getElementById('guests').value);
    const isSingleGuest = (guests === 1);
    let totalRoomCost   = 0;
    let nightlyDetails  = [];
    let cur             = new Date(s);

    while (cur < e) {
        const month     = cur.getMonth() + 1;
        const dayOfWeek = cur.getDay();
        const rule      = pricingRules.find(r => r.mese === month);
        let price       = 165;

        if (rule) {
            price = (window.CURRENT_ROOM === 'king') ? rule.prezzo_king : rule.prezzo_deluxe;
            if ((dayOfWeek === 5 || dayOfWeek === 6) && rule.extra_weekend) price += rule.extra_weekend;
            if (isSingleGuest && rule.sconto_singolo) price -= price * (rule.sconto_singolo / 100);
        }

        totalRoomCost += price;
        nightlyDetails.push({ date: new Date(cur), price });
        cur.setDate(cur.getDate() + 1);
    }

    if (totalNights === 1) {
        const rule = pricingRules.find(r => r.mese === (startDate.getMonth() + 1));
        if (rule && rule.maggiorazione_singola) {
            const surcharge          = totalRoomCost * (rule.maggiorazione_singola / 100);
            totalRoomCost           += surcharge;
            nightlyDetails[0].price += surcharge;
        }
    }

    totalRoomCost = Math.round(totalRoomCost);

    const nightsForTax = Math.min(totalNights, 3);
    const cityTax      = 3 * guests * nightsForTax;
    const grandTotal   = totalRoomCost + cityTax;
    const deposit      = Math.round(totalRoomCost * 0.40);
    const balanceDue   = grandTotal - deposit;

    updateUI(grandTotal, totalRoomCost, cityTax, deposit, balanceDue,
             totalNights, dateString, guests, nightlyDetails);
}

/* ============================================================
   HELPER — Crea blocco label + testo + bottone copia
   ============================================================ */
function buildCopyField(labelText, content, btnLabel, copiedLabel, isTextarea) {
    const wrap         = document.createElement('div');
    wrap.style.cssText = 'margin-bottom:1rem;';

    const lbl         = document.createElement('div');
    lbl.textContent   = labelText;
    lbl.style.cssText = 'font-size:.75rem;letter-spacing:.08em;text-transform:uppercase;color:#7a6a5a;margin-bottom:.4rem;font-family:sans-serif;';

    const textEl = isTextarea ? document.createElement('textarea') : document.createElement('div');
    textEl.textContent = content;
    const baseTextStyle = [
        'background:#120f0a', 'border:1px solid #2e2520',
        'border-radius:4px', 'padding:.7rem .8rem',
        'font-size:.82rem', 'color:#c8b89a', 'line-height:1.6',
        'width:100%', 'box-sizing:border-box', 'font-family:Georgia,serif'
    ];
    if (isTextarea) {
        textEl.readOnly      = true;
        textEl.rows          = 10;
        textEl.style.cssText = [...baseTextStyle, 'resize:vertical', 'display:block'].join(';');
    } else {
        textEl.style.cssText = [...baseTextStyle, 'display:block', 'white-space:pre-wrap', 'word-break:break-word'].join(';');
    }

    const copyBtn         = document.createElement('button');
    copyBtn.type          = 'button';
    copyBtn.textContent   = btnLabel;
    copyBtn.style.cssText = [
        'margin-top:.5rem', 'padding:.45rem .9rem',
        'background:#2e2520', 'border:1px solid #3a3028',
        'border-radius:4px', 'color:#c8b89a',
        'cursor:pointer', 'font-family:sans-serif',
        'font-size:.8rem', 'transition:background .2s'
    ].join(';');
    copyBtn.addEventListener('mouseover', () => { copyBtn.style.background = '#3a3028'; });
    copyBtn.addEventListener('mouseout',  () => { copyBtn.style.background = '#2e2520'; });
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(content).then(() => {
            copyBtn.textContent = copiedLabel;
            setTimeout(() => { copyBtn.textContent = btnLabel; }, 2000);
        }).catch(() => {
            /* Fallback execCommand per browser datati */
            const ta          = document.createElement('textarea');
            ta.value          = content;
            ta.style.position = 'fixed';
            ta.style.opacity  = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            copyBtn.textContent = copiedLabel;
            setTimeout(() => { copyBtn.textContent = btnLabel; }, 2000);
        });
    });

    wrap.appendChild(lbl);
    wrap.appendChild(textEl);
    wrap.appendChild(copyBtn);
    return wrap;
}

/* ============================================================
   HELPER — Modal di supporto post-mailto
   Appare sempre dopo il click su email: se il client si è
   aperto l'utente chiude il modal; se non si è aperto trova
   testo pronto da copiare e WhatsApp come alternativa.
   Nessuna apertura forzata di servizi terzi.
   Nessuno storage nel browser.
   ============================================================ */
function showEmailFallbackModal(subject, body, waMsg, lang) {

    const modalLabels = {
        it: {
            title:     'Il tuo programma email non si è aperto?',
            hint:      'Sembra che non ci sia un\'app email collegata a questo browser. Copia il messaggio qui sotto e invialo a:',
            bodyLabel: 'Testo del messaggio:',
            copyBody:  'Copia messaggio',
            copied:    'Copiato!',
            whatsapp:  'Scrivici su WhatsApp',
            close:     'Chiudi — il mio client si è aperto'
        },
        en: {
            title:     'Did your email app not open?',
            hint:      'It looks like no email app is linked to this browser. Copy the message below and send it to:',
            bodyLabel: 'Message:',
            copyBody:  'Copy message',
            copied:    'Copied!',
            whatsapp:  'Contact us on WhatsApp',
            close:     'Close — my email app opened'
        },
        fr: {
            title:     'Votre messagerie ne s\'est pas ouverte ?',
            hint:      'Il semble qu\'aucune application email ne soit associée à ce navigateur. Copiez le message ci-dessous et envoyez-le à :',
            bodyLabel: 'Message :',
            copyBody:  'Copier le message',
            copied:    'Copié !',
            whatsapp:  'Nous écrire sur WhatsApp',
            close:     'Fermer — ma messagerie s\'est ouverte'
        },
        de: {
            title:     'Hat sich Ihr E-Mail-Programm nicht geöffnet?',
            hint:      'Es scheint, dass in diesem Browser kein E-Mail-Programm eingerichtet ist. Kopieren Sie die Nachricht und senden Sie sie an:',
            bodyLabel: 'Nachricht:',
            copyBody:  'Nachricht kopieren',
            copied:    'Kopiert!',
            whatsapp:  'Per WhatsApp schreiben',
            close:     'Schliessen — mein Programm hat sich geöffnet'
        },
        es: {
            title:     '¿No se abrió su aplicación de correo?',
            hint:      'Parece que no hay ninguna app de correo vinculada a este navegador. Copie el mensaje y envíelo a:',
            bodyLabel: 'Mensaje:',
            copyBody:  'Copiar mensaje',
            copied:    'Copiado!',
            whatsapp:  'Escribirnos por WhatsApp',
            close:     'Cerrar — mi correo se abrió'
        }
    };
    const lbl = modalLabels[lang] || modalLabels.it;

    /* Rimuovi eventuale modal precedente */
    const old = document.getElementById('cdv-email-modal');
    if (old) old.remove();

    /* Inietta keyframe una volta sola */
    if (!document.getElementById('cdv-modal-style')) {
        const style       = document.createElement('style');
        style.id          = 'cdv-modal-style';
        style.textContent = '@keyframes cdvFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}';
        document.head.appendChild(style);
    }

    /* Overlay */
    const overlay         = document.createElement('div');
    overlay.id            = 'cdv-email-modal';
    overlay.style.cssText = [
        'position:fixed', 'top:0', 'left:0', 'width:100%', 'height:100%',
        'background:rgba(10,8,5,0.82)', 'z-index:9999',
        'display:flex', 'align-items:center', 'justify-content:center',
        'padding:1rem', 'box-sizing:border-box',
        'backdrop-filter:blur(3px)', '-webkit-backdrop-filter:blur(3px)'
    ].join(';');

    /* Card */
    const card         = document.createElement('div');
    card.style.cssText = [
        'background:#1a1510', 'border:1px solid #3a3028',
        'border-radius:6px', 'padding:2rem',
        'max-width:540px', 'width:100%',
        'max-height:88vh', 'overflow-y:auto',
        'font-family:Georgia,serif', 'color:#e8ddd0',
        'position:relative', 'box-shadow:0 24px 64px rgba(0,0,0,0.7)',
        'animation:cdvFadeIn .22s ease'
    ].join(';');

    /* Bottone chiudi — etichetta contestuale */
    const closeBtn         = document.createElement('button');
    closeBtn.type          = 'button';
    closeBtn.setAttribute('aria-label', lbl.close);
    closeBtn.innerHTML     = '&#10005;';
    closeBtn.style.cssText = [
        'position:absolute', 'top:1rem', 'right:1rem',
        'background:none', 'border:none', 'color:#7a6a5a',
        'font-size:1.1rem', 'cursor:pointer', 'line-height:1',
        'padding:4px 6px', 'border-radius:3px'
    ].join(';');
    closeBtn.addEventListener('click', () => overlay.remove());

    /* Titolo */
    const title         = document.createElement('h3');
    title.textContent   = lbl.title;
    title.style.cssText = 'margin:0 0 .8rem;font-size:1.1rem;font-weight:normal;letter-spacing:.04em;color:#c8b89a;';

    /* Hint */
    const hint         = document.createElement('p');
    hint.textContent   = lbl.hint;
    hint.style.cssText = 'margin:0 0 1.4rem;font-size:.83rem;color:#7a6a5a;line-height:1.6;font-family:sans-serif;';

    /* Indirizzo email visibile */
    const emailNote         = document.createElement('p');
    emailNote.textContent   = 'info@cadellavalletta.it';
    emailNote.style.cssText = 'margin:0 0 1.2rem;font-size:.88rem;color:#c8b89a;font-family:Georgia,serif;letter-spacing:.02em;';

    /* Campo messaggio copiabile */
    const bodyWrap = buildCopyField(lbl.bodyLabel, body, lbl.copyBody, lbl.copied, true);

    /* Bottone WhatsApp */
    const waBtn         = document.createElement('button');
    waBtn.type          = 'button';
    waBtn.textContent   = lbl.whatsapp;
    waBtn.style.cssText = [
        'display:block', 'width:100%', 'margin-top:1.2rem',
        'padding:.75rem 1rem', 'border-radius:4px',
        'background:#25523b', 'color:#e8ddd0',
        'border:none', 'cursor:pointer', 'font-family:sans-serif',
        'font-size:.9rem', 'letter-spacing:.03em',
        'transition:background .2s'
    ].join(';');
    waBtn.addEventListener('mouseover', () => { waBtn.style.background = '#1e6644'; });
    waBtn.addEventListener('mouseout',  () => { waBtn.style.background = '#25523b'; });
    waBtn.addEventListener('click', () => {
        window.open('https://wa.me/393489617894?text=' + encodeURIComponent(waMsg), '_blank');
    });

    /* Link di chiusura testuale in fondo */
    const closeLink         = document.createElement('p');
    closeLink.textContent   = lbl.close;
    closeLink.style.cssText = [
        'text-align:center', 'margin-top:1rem',
        'font-size:.78rem', 'color:#4a3e34',
        'cursor:pointer', 'font-family:sans-serif',
        'text-decoration:underline'
    ].join(';');
    closeLink.addEventListener('click', () => overlay.remove());

    card.appendChild(closeBtn);
    card.appendChild(title);
    card.appendChild(hint);
    card.appendChild(emailNote);
    card.appendChild(bodyWrap);
    card.appendChild(waBtn);
    card.appendChild(closeLink);
    overlay.appendChild(card);

    /* Chiudi cliccando fuori dalla card */
    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) overlay.remove();
    });

    document.body.appendChild(overlay);
}

/* ============================================================
   AGGIORNAMENTO UI
   ============================================================ */
function updateUI(grandTotal, roomCost, cityTax, deposit, balanceDue,
                  nights, dateString, guests, nightlyDetails) {

    const loading = document.getElementById('loading-prices');
    const summary = document.getElementById('price-summary');
    if (loading) loading.style.display = 'none';
    if (summary) summary.style.width = '100%';
    if (summary) summary.style.display = 'block';

    /* Lista notti scorrevole */
    const container = document.getElementById('nightly-details-list');
    if (container) {
        container.innerHTML = '';
        nightlyDetails.forEach(n => {
            const label       = n.date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
            const row         = document.createElement('div');
            row.className     = 'nightly-row';
            row.innerHTML     = '<span class="night-label">' + label + '</span>' +
                                '<span class="night-price">€ ' + Math.round(n.price) + '</span>';
            container.appendChild(row);
        });
    }

    /* Fix testi lunghi (es. tedesco) nelle pay-card */
    document.querySelectorAll('.pay-title, .pay-sub, .pay-amount').forEach(el => {
        el.style.wordBreak  = 'break-word';
        el.style.whiteSpace = 'normal';
        el.style.fontSize   = 'clamp(0.7rem, 2.5vw, 1rem)';
    });

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
    const fmt = n => '€ ' + n.toLocaleString('it-IT', { minimumFractionDigits: 2 });

    set('total-nights',        nights);
    set('city-tax-display',    fmt(cityTax));
    set('grand-total-display', fmt(grandTotal));
    set('deposit-amount',      fmt(deposit));
    set('balance-due',         fmt(balanceDue));

    /* ── Bottone richiesta ────────────────────────────────── */
    const btn = document.getElementById('btn-request');
    if (!btn) return;

    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    newBtn.onclick = function (e) {
        e.preventDefault();

        const lang = document.documentElement.lang || 'it';

        /* Blocca se mancano le date */
        const dp = window.myCalendarInstance;
        if (!dp || dp.selectedDates.length < 2) {
            const errId = 'cdv-no-date-err';
            let errEl   = document.getElementById(errId);
            if (!errEl) {
                errEl             = document.createElement('p');
                errEl.id          = errId;
                errEl.style.cssText = 'color:#c8623a;font-size:.82rem;margin:.4rem 0 0;font-family:sans-serif;';
                newBtn.parentNode.insertBefore(errEl, newBtn.nextSibling);
            }
            const noDateMsg = {
                it: 'Seleziona prima le date del soggiorno.',
                en: 'Please select your stay dates first.',
                fr: 'Veuillez d\'abord sélectionner vos dates.',
                de: 'Bitte zuerst Reisedaten auswählen.',
                es: 'Por favor selecciona primero las fechas.'
            };
            errEl.textContent   = noDateMsg[lang] || noDateMsg.it;
            errEl.style.display = 'block';
            setTimeout(() => { errEl.style.display = 'none'; }, 3000);
            return;
        }

        const contact = document.getElementById('contact-method').value;
        const rName   = window.ROOM_NAME || 'Camera';

        const translations = {
            it: { greet: 'Salve, vorrei prenotare la', dates: 'Date', nights: 'notti', guests: 'Ospiti', total: 'TOTALE SOGGIORNO', costRoom: 'Pernotti', costTax: 'Tassa', deposit: 'CAPARRA (40%)', balance: 'SALDO IN HOTEL', wait: 'Attendo il link per il versamento della caparra. Grazie!', subject: 'Richiesta Prenotazione' },
            en: { greet: 'Hello, I would like to book the', dates: 'Dates', nights: 'nights', guests: 'Guests', total: 'TOTAL STAY', costRoom: 'Room', costTax: 'Tax', deposit: 'DEPOSIT (40%)', balance: 'BALANCE AT HOTEL', wait: 'I await the link to pay the deposit. Thank you!', subject: 'Booking Request' },
            fr: { greet: 'Bonjour, je voudrais réserver la', dates: 'Dates', nights: 'nuits', guests: 'Personnes', total: 'TOTAL SÉJOUR', costRoom: 'Chambre', costTax: 'Taxe', deposit: 'ACOMPTE (40%)', balance: 'SOLDE À L\'HÔTEL', wait: 'J\'attends le lien pour payer l\'acompte. Merci !', subject: 'Demande de réservation' },
            de: { greet: 'Hallo, ich möchte folgendes Zimmer buchen:', dates: 'Daten', nights: 'Nächte', guests: 'Gäste', total: 'GESAMTBETRAG', costRoom: 'Zimmer', costTax: 'Steuer', deposit: 'ANZAHLUNG (40%)', balance: 'RESTBETRAG IM HOTEL', wait: 'Ich warte auf den Link zur Zahlung der Anzahlung. Danke!', subject: 'Buchungsanfrage' },
            es: { greet: 'Hola, me gustaría reservar la', dates: 'Fechas', nights: 'noches', guests: 'Huéspedes', total: 'ESTANCIA TOTAL', costRoom: 'Habitación', costTax: 'Tasa', deposit: 'DEPÓSITO (40%)', balance: 'SALDO EN EL HOTEL', wait: 'Espero el enlace para pagar el depósito. ¡Gracias!', subject: 'Solicitud de reserva' }
        };

        const t = translations[lang] || translations.it;

        /* Subject arricchito con camera, date e totale */
        const subject = t.subject + ': ' + rName + ' | ' + dateString + ' | EUR ' + grandTotal;

        /* Corpo messaggio — testo piano per email */
        const msg =
            t.greet + ' ' + rName + '.\n\n' +
            t.dates + ': ' + dateString + ' (' + nights + ' ' + t.nights + ')\n' +
            t.guests + ': ' + guests + '\n\n' +
            t.total + ': EUR ' + grandTotal + '\n' +
            '(' + t.costRoom + ': EUR ' + roomCost + ' + ' + t.costTax + ': EUR ' + cityTax + ')\n' +
            '--------------------------------\n' +
            t.deposit + ': EUR ' + deposit + '\n' +
            t.balance + ': EUR ' + balanceDue + '\n' +
            '--------------------------------\n' +
            t.wait;

        /* Messaggio WhatsApp — bold markup */
        const waMsg =
            t.greet + ' *' + rName + '*.\n\n' +
            t.dates + ': ' + dateString + ' (' + nights + ' ' + t.nights + ')\n' +
            t.guests + ': ' + guests + '\n\n' +
            t.total + ': EUR ' + grandTotal + '\n' +
            '(' + t.costRoom + ': EUR ' + roomCost + ' + ' + t.costTax + ': EUR ' + cityTax + ')\n' +
            '--------------------------------\n' +
            t.deposit + ': EUR ' + deposit + '\n' +
            t.balance + ': EUR ' + balanceDue + '\n' +
            '--------------------------------\n' +
            t.wait;

        /* Feedback visivo sul bottone */
        const btnFeedback = {
            it: 'Invio in corso...',
            en: 'Sending...',
            fr: 'Envoi en cours...',
            de: 'Wird gesendet...',
            es: 'Enviando...'
        };
        const origLabel    = newBtn.textContent;
        newBtn.textContent = btnFeedback[lang] || btnFeedback.it;
        newBtn.disabled    = true;
        setTimeout(() => {
            newBtn.textContent = origLabel;
            newBtn.disabled    = false;
        }, 2000);

        /* ── Routing ───────────────────────────────────────── */

        if (contact === 'whatsapp') {
            window.open('https://wa.me/393489617894?text=' + encodeURIComponent(waMsg), '_blank');
            return;
        }

        /* EMAIL
           1. Lancia mailto standard: il browser usa qualunque client
              l'utente ha configurato, senza forzare servizi terzi.
           2. Dopo 500ms apre il modal di supporto: se il client
              si è aperto l'utente chiude il modal con un click;
              se non si è aperto trova testo pronto e WhatsApp.
           Nessun dato trasmesso a terze parti. Nessuno storage.
        */
        window.location.href =
            'mailto:info@cadellavalletta.it' +
            '?subject=' + encodeURIComponent(subject) +
            '&body='    + encodeURIComponent(msg);

        setTimeout(function () {
            showEmailFallbackModal(subject, msg, waMsg, lang);
        }, 500);
    };
}