/* --- booking.js (Versione DEFINITIVA con Tassa Soggiorno) --- */

// Recupera le variabili globali
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const proxy = "https://api.codetabs.com/v1/proxy?quest=";
let pricingRules = []; 

document.addEventListener('DOMContentLoaded', async function() {
    
    // 1. SCARICA IL LISTINO PREZZI (Supabase)
    try {
        const { data, error } = await client
            .from('listino_prezzi')
            .select('*')
            .order('mese', { ascending: true });
        
        if (error) throw error;
        pricingRules = data || [];
        console.log("✅ Listino scaricato:", pricingRules.length + " mesi.");
    } catch (err) {
        console.error("❌ Errore Supabase:", err.message);
    }

    // 2. SCARICA LE DATE OCCUPATE (Booking.com)
    let blockedDates = [];
    
    // Controlla se le variabili sono definite globalmente (window)
    const icalLink = window.BOOKING_ICAL;
    
    if (icalLink && icalLink.startsWith('http')) {
        console.log("⏳ Scarico calendario Booking per: " + window.ROOM_NAME);
        blockedDates = await fetchBookingDates(icalLink);
    } else {
        console.warn("⚠️ Nessun link Booking trovato. (Se sei in Home è normale)");
    }

    // 3. AVVIA IL CALENDARIO (Con prezzi e date chiuse)
    initCalendar(blockedDates);

    // Gestione cambio ospiti (Ricalcola prezzo al volo)
    const guestsSelect = document.getElementById('guests');
    if(guestsSelect) {
        guestsSelect.addEventListener('change', function() {
            const dp = document.getElementById('date-picker')._flatpickr;
            // Se ci sono date selezionate, ricalcola
            if (dp && dp.selectedDates.length === 2) {
                // Recupera le date e formatta la stringa "dal... al..." per il ricalcolo
                const dateStr = dp.input.value; 
                calculateTotal(dp.selectedDates[0], dp.selectedDates[1], dateStr);
            }
        });
    }
});

// --- FUNZIONE PER SCARICARE BOOKING ---
async function fetchBookingDates(url) {
    try {
        const response = await fetch(proxy + encodeURIComponent(url));
        const text = await response.text();
        
        // Parsing con la libreria ical.js
        const jcalData = ICAL.parse(text);
        const comp = new ICAL.Component(jcalData);
        const events = comp.getAllSubcomponents('vevent');

        const blocked = events.map(vevent => {
            const ev = new ICAL.Event(vevent);
            return {
                from: ev.startDate.toJSDate(),
                to: ev.endDate.toJSDate()
            };
        });
        console.log("🔒 Date chiuse importate:", blocked.length);
        return blocked;
    } catch (e) {
        console.error("❌ Errore lettura calendario Booking:", e);
        return [];
    }
}

// --- INIZIALIZZA CALENDARIO ---
function initCalendar(blockedDatesFromBooking) {
    const dbMonths = pricingRules.map(rule => rule.mese);
    const hasData = dbMonths.length > 0;

    flatpickr("#date-picker", {
        mode: "range",
        minDate: "today",
        dateFormat: "d/m/Y",
        locale: "it",
        disable: [
            ...blockedDatesFromBooking, // 1. Blocca le date di Booking
            function(date) {            // 2. Blocca i mesi non presenti nel listino
                const m = date.getMonth() + 1;
                if (hasData) {
                    return !dbMonths.includes(m);
                } else {
                    // Fallback se database offline: apre Maggio-Ottobre
                    return (m < 5 || m > 10);
                }
            }
        ],
        onChange: function(selectedDates, dateStr) {
            if (selectedDates.length === 2) {
                calculateTotal(selectedDates[0], selectedDates[1], dateStr);
            }
        }
    });
}

// --- CALCOLO PREZZI ---
function calculateTotal(startDate, endDate, dateString) {
    const loading = document.getElementById('loading-prices');
    const summary = document.getElementById('price-summary');
    
    if(loading) loading.style.display = 'block';
    if(summary) summary.style.display = 'none';
    
    let totalRoomPrice = 0;
    let nights = 0;
    
    let currentDate = new Date(startDate.getTime());
    currentDate.setHours(0,0,0,0);
    let endDateTime = new Date(endDate.getTime());
    endDateTime.setHours(0,0,0,0);
    
    const diffTime = Math.abs(endDateTime - currentDate);
    const totalNights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (totalNights === 0) return;

    const guests = parseInt(document.getElementById('guests').value);
    const isSingleGuest = (guests === 1);
    const isSingleNight = (totalNights === 1);
    let surchargePercent = 0;

    // --- LOGICA PREZZO GIORNALIERO ---
    while (currentDate < endDateTime) {
        const month = currentDate.getMonth() + 1; 
        const dayOfWeek = currentDate.getDay(); 
        
        let dailyPrice = 160; 

        const rule = pricingRules.find(r => r.mese == month);
        
        if (rule) {
            dailyPrice = (typeof CURRENT_ROOM !== 'undefined' && CURRENT_ROOM === 'king') ? rule.prezzo_king : rule.prezzo_deluxe;
            if (dayOfWeek === 5 || dayOfWeek === 6) dailyPrice += (rule.extra_weekend ?? 20);
            if (isSingleGuest && rule.sconto_singolo) dailyPrice -= dailyPrice * (rule.sconto_singolo / 100);
            if (isSingleNight) surchargePercent = rule.maggiorazione_singola || 0;
        } else {
            if (dayOfWeek === 5 || dayOfWeek === 6) dailyPrice += 20;
            if (isSingleGuest) dailyPrice *= 0.95; 
            if (isSingleNight) surchargePercent = 30;
        }

        totalRoomPrice += dailyPrice;
        nights++;
        currentDate.setDate(currentDate.getDate() + 1);
    }

    if (isSingleNight && surchargePercent > 0) {
        totalRoomPrice += totalRoomPrice * (surchargePercent / 100);
    }

    totalRoomPrice = Math.round(totalRoomPrice);

    // --- CALCOLO TASSA SOGGIORNO ---
    const nightsForTax = nights > 3 ? 3 : nights;
    const cityTax = 3 * guests * nightsForTax;

    // --- CALCOLO CAPARRA (20%) ---
    const deposit = Math.round(totalRoomPrice * 0.20);

    updateUI(totalRoomPrice, cityTax, deposit, nights, dateString, guests);
}

// --- AGGIORNAMENTO INTERFACCIA ---
function updateUI(roomPrice, cityTax, deposit, nights, dateString, guests) {
    const loading = document.getElementById('loading-prices');
    const summary = document.getElementById('price-summary');
    
    if(loading) loading.style.display = 'none';
    if(summary) summary.style.display = 'block';
    
    // Calcolo del saldo rimanente (Totale - Caparra)
    const balanceRoom = roomPrice - deposit;

    // Popolamento Dati HTML
    document.getElementById('total-nights').innerText = nights;
    document.getElementById('avg-price').innerText = '€ ' + Math.round(roomPrice / nights);
    
    document.getElementById('total-price').innerText = '€ ' + roomPrice; 
    document.getElementById('deposit-amount').innerText = '€ ' + deposit; // Caparra
    
    // Nuovi campi "Saldo" e "Tassa"
    const balanceEl = document.getElementById('balance-due');
    if(balanceEl) balanceEl.innerText = '€ ' + balanceRoom;
    
    document.getElementById('city-tax').innerText = '€ ' + cityTax;

    // Configurazione Bottone
    const btn = document.getElementById('btn-request');
    if(btn) {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.onclick = function(e) {
            e.preventDefault();
            const method = document.getElementById('contact-method').value;
            const rName = (typeof ROOM_NAME !== 'undefined') ? ROOM_NAME : "Camera";

            // Messaggio strutturato per WhatsApp/Email
            let message = `Salve, vorrei prenotare la *${rName}*.\n\n` +
                          `📅 *Date:* ${dateString} (${nights} notti)\n` +
                          `👤 *Ospiti:* ${guests}\n\n` +
                          `💶 *TOTALE CAMERA:* € ${roomPrice}\n` +
                          `--------------------------------\n` +
                          `🔒 *DA VERSARE ORA (Caparra 20%):* € ${deposit}\n` +
                          `--------------------------------\n` +
                          `🏨 *SALDO IN STRUTTURA:* € ${balanceRoom}\n` +
                          `🏛️ *TASSA SOGGIORNO:* € ${cityTax}\n\n` +
                          `Attendo il link per il versamento della caparra. Grazie!`;
            
            if (method === 'whatsapp') {
                window.open(`https://wa.me/393489617894?text=${encodeURIComponent(message)}`, '_blank');
            } else {
                const subject = `Richiesta Prenotazione: ${rName}`;
                window.location.href = `mailto:info@cadellavalletta.it?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
            }
        };
    }
}