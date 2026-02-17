/* --- booking.js (Versione DEFINITIVA: Prezzi Supabase + Calendario Booking) --- */

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
            if (dp && dp.selectedDates.length === 2) {
                calculateTotal(dp.selectedDates[0], dp.selectedDates[1], dp.input.value);
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
    
    let total = 0;
    let nights = 0;
    let currentDate = new Date(startDate);
    
    const diffTime = Math.abs(endDate - startDate);
    const totalNights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (totalNights === 0) return;

    const guests = parseInt(document.getElementById('guests').value);
    const isSingleGuest = (guests === 1);
    const isSingleNight = (totalNights === 1);
    let surchargePercent = 0;

    while (currentDate < endDate) {
        const month = currentDate.getMonth() + 1; 
        const dayOfWeek = currentDate.getDay(); 
        
        let dailyPrice = 160; // Prezzo base fallback

        const rule = pricingRules.find(r => r.mese == month);
        
        if (rule) {
            // Usa il nome della camera definito nell'HTML (CURRENT_ROOM)
            dailyPrice = (typeof CURRENT_ROOM !== 'undefined' && CURRENT_ROOM === 'king') ? rule.prezzo_king : rule.prezzo_deluxe;
            
            // Extra Weekend
            if (dayOfWeek === 5 || dayOfWeek === 6) dailyPrice += (rule.extra_weekend ?? 20);

            // Sconto Single
            if (isSingleGuest && rule.sconto_singolo) {
                dailyPrice -= dailyPrice * (rule.sconto_singolo / 100);
            }

            // Maggiorazione Notte Singola
            if (isSingleNight) surchargePercent = rule.maggiorazione_singola || 0;
        } else {
            // Logica Fallback
            if (dayOfWeek === 5 || dayOfWeek === 6) dailyPrice += 20;
            if (isSingleGuest) dailyPrice *= 0.95; 
            if (isSingleNight) surchargePercent = 30;
        }

        total += dailyPrice;
        nights++;
        currentDate.setDate(currentDate.getDate() + 1);
    }

    if (isSingleNight && surchargePercent > 0) {
        total += total * (surchargePercent / 100);
    }

    updateUI(Math.round(total), nights, dateString, guests);
}

// --- AGGIORNAMENTO INTERFACCIA ---
function updateUI(total, nights, dateString, guests) {
    const loading = document.getElementById('loading-prices');
    const summary = document.getElementById('price-summary');
    
    if(loading) loading.style.display = 'none';
    if(summary) summary.style.display = 'block';
    
    document.getElementById('total-nights').innerText = nights;
    document.getElementById('total-price').innerText = '€ ' + total;
    document.getElementById('avg-price').innerText = '€ ' + Math.round(total / nights);

    const btn = document.getElementById('btn-request');
    if(btn) {
        // Clona il bottone per rimuovere vecchi listener
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.onclick = function(e) {
            e.preventDefault();
            const method = document.getElementById('contact-method').value;
            
            // Recupera nome camera definito nell'HTML
            const rName = (typeof ROOM_NAME !== 'undefined') ? ROOM_NAME : "Camera";

            let message = `Ciao Ca' della Valletta! 👋\nVorrei un preventivo per la *${rName}*.\n\n📅 Date: ${dateString}\n🌙 Notti: ${nights}\n👤 Ospiti: ${guests}\n💰 Preventivo Web: €${total}\n\n`;
            
            if (method === 'whatsapp') {
                message += `Preferisco risposta qui su WhatsApp.`;
                window.open(`https://wa.me/393489617894?text=${encodeURIComponent(message)}`, '_blank');
            } else {
                message += `Preferisco risposta via Email.`;
                const subject = `Richiesta Preventivo: ${rName}`;
                window.location.href = `mailto:info@cadellavalletta.it?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
            }
        };
    }
}