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
   SUPABASE CONFIG
   ============================================================ */
if (!window.SUPABASE_URL) {
    window.SUPABASE_URL = 'https://qtvmrpzkvqsgzxlddsif.supabase.co';
    window.SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0dm1ycHprdnFzZ3p4bGRkc2lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExODY2NzQsImV4cCI6MjA4Njc2MjY3NH0.IjzW0dhRaRp5R2uFw5JLj9ZeqYlK9dYHyU9EAcfB1v4';
}

/* ============================================================
   COSTANTI
   ============================================================ */
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vROmTNDLNHlbBVbuIa2H2QZMO5sLDCvX1gBe1WP_5dNXp7OOmblUiwVFZXprxgUgECRWVZSCL9AYzvo/pub?output=csv';
const proxy         = 'https://api.codetabs.com/v1/proxy?quest=';

/* Testo minimo 1 notte per lingua */
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

    /* 1. Listino prezzi da Google Sheets */
    try {
        const sep         = SHEET_CSV_URL.includes('?') ? '&' : '?';
        const res         = await fetch(SHEET_CSV_URL + sep + 't=' + Date.now());
        if (!res.ok) throw new Error('Errore download Google Sheets');
        pricingRules = parseCSVToJSON(await res.text());
        pricingRules.sort((a, b) => a.mese - b.mese);
        console.log('✅ Listino prezzi:', pricingRules.length, 'mesi');
    } catch (err) {
        console.error('❌ Google Sheets:', err.message);
    }

    /* 2. Scarica i calendari della camera corrente */
    let blockedDates = [];
    const calendarUrls = window.CALENDAR_URLS;

    if (calendarUrls && calendarUrls.length > 0) {
        console.log('⏳ Scarico', calendarUrls.length, 'calendari per:', window.ROOM_NAME);
        const results = await Promise.all(calendarUrls.map(fetchICalDates));
        blockedDates  = results.flat();
        console.log('🔒 Date occupate:', blockedDates.length);
    } else {
        console.warn('⚠️ Nessun calendario trovato.');
    }

    /* 3. Avvia calendario */
    initCalendar(blockedDates);

    /* 4. Cambio ospiti → ricalcola se date già selezionate */
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

    /* 5. Bottone X di reset */
    injectClearButton();
});

/* ============================================================
   BOTTONE X — Reset fluido
   ============================================================ */
function injectClearButton() {
    const input = document.getElementById('date-picker');
    if (!input) return;

    const wrapper = input.parentElement;
    wrapper.style.position = 'relative';

    const btn        = document.createElement('button');
    btn.type         = 'button';
    btn.id           = 'clear-dates-btn';
    btn.setAttribute('aria-label', 'Cancella date');
    btn.innerHTML    = '✕';
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

    /* Salva il riferimento globale per il reset */
    window._defaultDisable = defaultDisable;

    window.myCalendarInstance = flatpickr('#date-picker', {
        mode:       'range',
        minDate:    'today',
        dateFormat: 'd/m/Y',
        locale:     fpLocale,
        disable:    defaultDisable,

        /* Se l'utente riapre il picker con una selezione già completa → reset */
        onOpen: function (selectedDates) {
            if (selectedDates.length === 2) {
                resetCalendar();
            }
        },

        onChange: function (selectedDates, dateStr, instance) {

            /* Nessuna data */
            if (selectedDates.length === 0) {
                instance.set('maxDate', false);
                instance.set('disable', defaultDisable);
                hidePriceSummary();
                toggleClearBtn(false);
                return;
            }

            /* ── CHECK-IN scelto ──────────────────────────────────
               Calcola il "muro": la prima data occupata successiva
               diventa il maxDate, così l'utente non può sforare
               su prenotazioni altrui.
            ─────────────────────────────────────────────────────── */
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
                    /* Consente di cliccare il primo giorno occupato come check-out */
                    const dbMonths = pricingRules.map(r => r.mese);
                    const hasData  = dbMonths.length > 0;

                    const tempDisable = blockedDates.map(b => {
                        const bFrom = new Date(b.from).setHours(0, 0, 0, 0);
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

            /* ── CHECK-IN + CHECK-OUT selezionati ─────────────────
               BUG FIX: doppio click sulla stessa data → 0 notti.
               Soluzione: sposta automaticamente il check-out al
               giorno successivo (1 notte). Se quel giorno è
               bloccato, avvisa e resetta.
            ─────────────────────────────────────────────────────── */
            if (selectedDates.length === 2) {
                let start = selectedDates[0];
                let end   = selectedDates[1];

                const sTime = new Date(start).setHours(0, 0, 0, 0);
                const eTime = new Date(end).setHours(0, 0, 0, 0);

                if (sTime === eTime) {
                    /* Stesso giorno: proviamo con il giorno dopo */
                    const nextDay = new Date(start);
                    nextDay.setDate(nextDay.getDate() + 1);

                    /* Verifica se il giorno dopo è bloccato */
                    const nextDayTime  = nextDay.setHours(0, 0, 0, 0);
                    const nextDayBlocked = blockedDates.some(b => {
                        const bFrom = new Date(b.from).setHours(0, 0, 0, 0);
                        const bTo   = new Date(b.to).setHours(0, 0, 0, 0);
                        return nextDayTime >= bFrom && nextDayTime <= bTo;
                    });

                    if (nextDayBlocked) {
                        /* Impossibile: giorno dopo occupato → avvisa e resetta */
                        hidePriceSummary();
                        toggleClearBtn(false);

                        const msgEl = document.getElementById('min-night-msg');
                        if (msgEl) {
                            const curLang = document.documentElement.lang || 'it';
                            msgEl.textContent = MIN_NIGHT_MSG[curLang] || MIN_NIGHT_MSG.it;
                            msgEl.style.display = 'block';
                            setTimeout(() => { msgEl.style.display = 'none'; }, 4000);
                        }

                        /* Reset dopo un tick per non interferire con flatpickr */
                        setTimeout(resetCalendar, 50);
                        return;
                    }

                    /* Check-out spostato al giorno dopo: imposta il range e ricalcola */
                    end = new Date(start);
                    end.setDate(end.getDate() + 1);

                    /* Aggiorna flatpickr senza innescare un nuovo onChange ricorsivo */
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
        const obj = {};
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
        const res = await fetch(proxy + encodeURIComponent(url) + '&t=' + Date.now());
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

    /* Guardia extra: non dovrebbe mai essere 0 dopo il fix sopra */
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
        let price       = 165; /* fallback */

        if (rule) {
            price = (window.CURRENT_ROOM === 'king') ? rule.prezzo_king : rule.prezzo_deluxe;
            if ((dayOfWeek === 5 || dayOfWeek === 6) && rule.extra_weekend) price += rule.extra_weekend;
            if (isSingleGuest && rule.sconto_singolo) price -= price * (rule.sconto_singolo / 100);
        }

        totalRoomCost += price;
        nightlyDetails.push({ date: new Date(cur), price });
        cur.setDate(cur.getDate() + 1);
    }

    /* Supplemento singola notte */
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
   AGGIORNAMENTO UI
   ============================================================ */
function updateUI(grandTotal, roomCost, cityTax, deposit, balanceDue,
                  nights, dateString, guests, nightlyDetails) {

    const loading = document.getElementById('loading-prices');
    const summary = document.getElementById('price-summary');
    if (loading) loading.style.display = 'none';
    if (summary) summary.style.display = 'block';

    /* Lista notti scorrevole */
    const container = document.getElementById('nightly-details-list');
    if (container) {
        container.innerHTML = '';
        nightlyDetails.forEach(n => {
            const label = n.date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
            const row   = document.createElement('div');
            row.className   = 'nightly-row';
            row.innerHTML   = `<span class="night-label">${label}</span>` +
                              `<span class="night-price">€ ${Math.round(n.price)}</span>`;
            container.appendChild(row);
        });
    }

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
    const fmt = n => '€ ' + n.toLocaleString('it-IT', { minimumFractionDigits: 2 });

    set('total-nights',       nights);
    set('city-tax-display',   fmt(cityTax));
    set('grand-total-display', fmt(grandTotal));
    set('deposit-amount',     fmt(deposit));
    set('balance-due',        fmt(balanceDue));

    /* Bottone richiesta */
    const btn = document.getElementById('btn-request');
    if (!btn) return;

    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    newBtn.onclick = function (e) {
        e.preventDefault();

        const lang    = document.documentElement.lang || 'it';
        const contact = document.getElementById('contact-method').value;
        const rName   = window.ROOM_NAME || 'Camera';

        const translations = {
            it: { greet:'Salve, vorrei prenotare la', dates:'Date', nights:'notti', guests:'Ospiti', total:'TOTALE SOGGIORNO', costRoom:'Pernotti', costTax:'Tassa', deposit:'CAPARRA (40%)', balance:'SALDO IN HOTEL', wait:'Attendo il link per il versamento della caparra. Grazie!', subject:'Richiesta Prenotazione' },
            en: { greet:'Hello, I would like to book the', dates:'Dates', nights:'nights', guests:'Guests', total:'TOTAL STAY', costRoom:'Room', costTax:'Tax', deposit:'DEPOSIT (40%)', balance:'BALANCE AT HOTEL', wait:'I await the link to pay the deposit. Thank you!', subject:'Booking Request' },
            fr: { greet:'Bonjour, je voudrais réserver la', dates:'Dates', nights:'nuits', guests:'Personnes', total:'TOTAL SÉJOUR', costRoom:'Chambre', costTax:'Taxe', deposit:'ACOMPTE (40%)', balance:'SOLDE À L\'HÔTEL', wait:'J\'attends le lien pour payer l\'acompte. Merci !', subject:'Demande de réservation' },
            de: { greet:'Hallo, ich möchte folgendes Zimmer buchen:', dates:'Daten', nights:'Nächte', guests:'Gäste', total:'GESAMTBETRAG', costRoom:'Zimmer', costTax:'Steuer', deposit:'ANZAHLUNG (40%)', balance:'RESTBETRAG IM HOTEL', wait:'Ich warte auf den Link zur Zahlung der Anzahlung. Danke!', subject:'Buchungsanfrage' },
            es: { greet:'Hola, me gustaría reservar la', dates:'Fechas', nights:'noches', guests:'Huéspedes', total:'ESTANCIA TOTAL', costRoom:'Habitación', costTax:'Tasa', deposit:'DEPÓSITO (40%)', balance:'SALDO EN EL HOTEL', wait:'Espero el enlace para pagar el depósito. ¡Gracias!', subject:'Solicitud de reserva' }
        };

        const t   = translations[lang] || translations.it;
        const msg = `${t.greet} *${rName}*.\n\n`                              +
                    `📅 *${t.dates}:* ${dateString} (${nights} ${t.nights})\n` +
                    `👤 *${t.guests}:* ${guests}\n\n`                           +
                    `💶 *${t.total}:* € ${grandTotal}\n`                        +
                    `(${t.costRoom}: €${roomCost} + ${t.costTax}: €${cityTax})\n` +
                    `--------------------------------\n`                         +
                    `🔒 *${t.deposit}:* € ${deposit}\n`                         +
                    `🏨 *${t.balance}:* € ${balanceDue}\n`                      +
                    `--------------------------------\n`                         +
                    `${t.wait}`;

        if (contact === 'whatsapp') {
            window.open(`https://wa.me/393489617894?text=${encodeURIComponent(msg)}`, '_blank');
        } else {
            window.location.href =
                `mailto:info@cadellavalletta.it` +
                `?subject=${encodeURIComponent(t.subject + ': ' + rName + ' - ' + dateString)}` +
                `&body=${encodeURIComponent(msg)}`;
        }
    };
}