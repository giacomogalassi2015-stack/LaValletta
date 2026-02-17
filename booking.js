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
function calculateTotal(startDate, endDate, dateString) {
    const loading = document.getElementById('loading-prices');
    const summary = document.getElementById('price-summary');
    if(loading) loading.style.display = 'block';
    if(summary) summary.style.display = 'none';

    let currentDate = new Date(startDate.getTime());
    currentDate.setHours(0,0,0,0);
    let endDateTime = new Date(endDate.getTime());
    endDateTime.setHours(0,0,0,0);
    
    const diffTime = Math.abs(endDateTime - currentDate);
    const totalNights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (totalNights === 0) return;

    const guests = parseInt(document.getElementById('guests').value);
    const isSingleGuest = (guests === 1);
    
    let totalRoomCost = 0; // Solo pernotto
    let nightlyDetails = []; 

    // 1. Calcolo Pernotti
    let tempDate = new Date(currentDate.getTime());
    while (tempDate < endDateTime) {
        const month = tempDate.getMonth() + 1;
        const dayOfWeek = tempDate.getDay();
        let dailyPrice = 165; 

        const rule = pricingRules.find(r => r.mese == month);
        if (rule) {
            dailyPrice = (typeof CURRENT_ROOM !== 'undefined' && CURRENT_ROOM === 'king') ? rule.prezzo_king : rule.prezzo_deluxe;
            if ((dayOfWeek === 5 || dayOfWeek === 6) && rule.extra_weekend) dailyPrice += rule.extra_weekend;
            if (isSingleGuest && rule.sconto_singolo) dailyPrice -= dailyPrice * (rule.sconto_singolo / 100);
        }
        
        totalRoomCost += dailyPrice;
        nightlyDetails.push({ date: new Date(tempDate), price: dailyPrice });
        tempDate.setDate(tempDate.getDate() + 1);
    }

    if (totalNights === 1) {
        const rule = pricingRules.find(r => r.mese == (startDate.getMonth() + 1));
        if(rule && rule.maggiorazione_singola) {
            let surcharge = totalRoomCost * (rule.maggiorazione_singola / 100);
            totalRoomCost += surcharge;
            nightlyDetails[0].price += surcharge;
        }
    }
    totalRoomCost = Math.round(totalRoomCost);

    // 2. Calcolo Tassa
    const nightsForTax = totalNights > 3 ? 3 : totalNights;
    const cityTax = 3.00 * guests * nightsForTax;

    // 3. Totale "Visivo" (Pernotti + Tassa)
    const grandTotal = totalRoomCost + cityTax;

    // 4. Caparra (20% del solo Pernotto)
    const deposit = Math.round(totalRoomCost * 0.20);

    // 5. Saldo
    const balanceDue = grandTotal - deposit;

    updateUI(grandTotal, totalRoomCost, cityTax, deposit, balanceDue, totalNights, dateString, guests, nightlyDetails);
}

function updateUI(grandTotal, roomCost, cityTax, deposit, balanceDue, nights, dateString, guests, nightlyDetails) {
    document.getElementById('loading-prices').style.display = 'none';
    document.getElementById('price-summary').style.display = 'block';

    // Lista Notti
    const detailsContainer = document.getElementById('nightly-details-list');
    detailsContainer.innerHTML = '';
    nightlyDetails.forEach((n) => {
        const dateFmt = n.date.toLocaleDateString('it-IT', {day:'numeric', month:'short'});
        const row = document.createElement('div');
        row.className = 'nightly-row';
        row.innerHTML = `<span class="night-label">${dateFmt}</span><span class="night-price">€ ${Math.round(n.price)}</span>`;
        detailsContainer.appendChild(row);
    });

    // Popolamento Valori
    document.getElementById('total-nights').innerText = nights;
    document.getElementById('city-tax-display').innerText = '€ ' + cityTax.toLocaleString('it-IT', {minimumFractionDigits: 2});
    document.getElementById('grand-total-display').innerText = '€ ' + grandTotal.toLocaleString('it-IT', {minimumFractionDigits: 2});
    
    document.getElementById('deposit-amount').innerText = '€ ' + deposit.toLocaleString('it-IT', {minimumFractionDigits: 2});
    document.getElementById('balance-due').innerText = '€ ' + balanceDue.toLocaleString('it-IT', {minimumFractionDigits: 2});

    // Bottone
    const btn = document.getElementById('btn-request');
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    
    newBtn.onclick = function(e) {
        e.preventDefault();
        const rName = (typeof ROOM_NAME !== 'undefined') ? ROOM_NAME : "Camera";
        let message = `Salve, vorrei prenotare la *${rName}*.\n\n` + 
                      `📅 *Date:* ${dateString} (${nights} notti)\n` + 
                      `👤 *Ospiti:* ${guests}\n\n` + 
                      `💶 *Totale Soggiorno:* € ${grandTotal}\n` + 
                      `(Pernotti €${roomCost} + Tassa €${cityTax})\n` + 
                      `--------------------------------\n` + 
                      `🔒 *CAPARRA (20%):* € ${deposit}\n` + 
                      `🏨 *SALDO IN HOTEL:* € ${balanceDue}\n` + 
                      `--------------------------------\n` + 
                      `Attendo link per la caparra. Grazie!`;
        window.open(`https://wa.me/393489617894?text=${encodeURIComponent(message)}`, '_blank');
    };
}