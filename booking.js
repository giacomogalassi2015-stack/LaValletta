// Recupera le variabili globali 
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const proxy = "https://api.codetabs.com/v1/proxy?quest=";
let pricingRules = []; 

document.addEventListener('DOMContentLoaded', async function() {
    
    // 1. SCARICA IL LISTINO PREZZI 
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

    // 2. SCARICA TUTTI I CALENDARI 
    let blockedDates = [];
    const calendarUrls = window.CALENDAR_URLS; 
    
    if (calendarUrls && calendarUrls.length > 0) {
        console.log(`⏳ Scarico ${calendarUrls.length} calendari per: ` + window.ROOM_NAME);
        
        const promises = calendarUrls.map(url => fetchICalDates(url));
        const results = await Promise.all(promises);
        
        blockedDates = results.flat();
        console.log("🔒 Totale date chiuse unite:", blockedDates.length);
    } else {
        console.warn("⚠️ Nessun link calendario trovato (Normale se sei in Home).");
    }

    // 3. AVVIA IL CALENDARIO 
    initCalendar(blockedDates);

    // 4. GESTIONE CAMBIO OSPITI 
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

// --- FUNZIONE UNICA PER SCARICARE UN ICAL ---
async function fetchICalDates(url) {
    if (!url) return [];
    try {
      
        const cacheBuster = "&t=" + new Date().getTime();
        const response = await fetch(proxy + encodeURIComponent(url) + cacheBuster);
        
        if (!response.ok) throw new Error("Network response was not ok");
        
        const text = await response.text();
        
        const jcalData = ICAL.parse(text);
        const comp = new ICAL.Component(jcalData);
        const events = comp.getAllSubcomponents('vevent');

        const dates = events.map(vevent => {
            const ev = new ICAL.Event(vevent);
            let startDate = ev.startDate.toJSDate();
            let endDate = ev.endDate.toJSDate();

            endDate.setDate(endDate.getDate() - 1);

            return {
                from: startDate,
                to: endDate
            };
        });

        return dates;
    } catch (e) {
        console.error("❌ Errore lettura calendario:", url, e);
        return [];
    }
}

// --- INIZIALIZZA CALENDARIO ---
function initCalendar(blockedDatesCombined) {
    const dbMonths = pricingRules.map(rule => rule.mese);
    const hasData = dbMonths.length > 0;

    flatpickr("#date-picker", {
        mode: "range",
        minDate: "today",
        dateFormat: "d/m/Y",
        locale: "it",
        disable: [
            ...blockedDatesCombined, // Date occupate 
            function(date) {
                const m = date.getMonth() + 1;
                if (hasData) {
                    return !dbMonths.includes(m); // Blocca mesi non nel listino
                } else {
                    return (m < 4 || m > 10); // Fallback (apre Aprile-Ottobre)
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

// --- CALCOLO PREZZI  ---
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
    
    let totalRoomCost = 0; // Costo puro della camera (senza tassa)
    let nightlyDetails = []; 

    // 1. Ciclo giorno per giorno
    let tempDate = new Date(currentDate.getTime());
    while (tempDate < endDateTime) {
        const month = tempDate.getMonth() + 1; 
        const dayOfWeek = tempDate.getDay(); 
        
        let dailyPrice = 165; // Prezzo base fallback

        const rule = pricingRules.find(r => r.mese == month);
        
        if (rule) {
            dailyPrice = (typeof CURRENT_ROOM !== 'undefined' && CURRENT_ROOM === 'king') ? rule.prezzo_king : rule.prezzo_deluxe;
            
            // Extra Weekend (Venerdì=5, Sabato=6)
            if ((dayOfWeek === 5 || dayOfWeek === 6) && rule.extra_weekend) {
                dailyPrice += rule.extra_weekend;
            }
            
            // Sconto Singola
            if (isSingleGuest && rule.sconto_singolo) {
                dailyPrice -= dailyPrice * (rule.sconto_singolo / 100);
            }
        }
        
        totalRoomCost += dailyPrice;
        nightlyDetails.push({ date: new Date(tempDate), price: dailyPrice });
        
        tempDate.setDate(tempDate.getDate() + 1);
    }

    // Supplemento Singola Notte (se applicabile)
    if (totalNights === 1) {
        const rule = pricingRules.find(r => r.mese == (startDate.getMonth() + 1));
        if(rule && rule.maggiorazione_singola) {
            let surcharge = totalRoomCost * (rule.maggiorazione_singola / 100);
            totalRoomCost += surcharge;
            nightlyDetails[0].price += surcharge; 
        }
    }

    totalRoomCost = Math.round(totalRoomCost);

    // 2. Calcolo Tassa Soggiorno (max 3 notti)
    const nightsForTax = totalNights > 3 ? 3 : totalNights;
    const cityTax = 3.00 * guests * nightsForTax;

    // 3. Totale "Visivo" (Pernotti + Tassa) - Questo è quello che paga il cliente in totale
    const grandTotal = totalRoomCost + cityTax;

    // 4. Caparra (40% del solo Pernotto)
    const deposit = Math.round(totalRoomCost * 0.40);

    // 5. Saldo in struttura (Totale - Caparra)
    const balanceDue = grandTotal - deposit;

    // Aggiorna l'interfaccia grafica
    updateUI(grandTotal, totalRoomCost, cityTax, deposit, balanceDue, totalNights, dateString, guests, nightlyDetails);
}

// --- AGGIORNAMENTO GRAFICA  ---
function updateUI(grandTotal, roomCost, cityTax, deposit, balanceDue, nights, dateString, guests, nightlyDetails) {
    
    // Nascondi caricamento e mostra risultati
    document.getElementById('loading-prices').style.display = 'none';
    document.getElementById('price-summary').style.display = 'block';

    // 1. Popola la lista delle notti (Scrollable)
    const detailsContainer = document.getElementById('nightly-details-list');
    if (detailsContainer) {
        detailsContainer.innerHTML = '';
        nightlyDetails.forEach((n) => {
            const dateFmt = n.date.toLocaleDateString('it-IT', {day:'numeric', month:'short'});
            const row = document.createElement('div');
            row.className = 'nightly-row';
            row.innerHTML = `<span class="night-label">${dateFmt}</span><span class="night-price">€ ${Math.round(n.price)}</span>`;
            detailsContainer.appendChild(row);
        });
    }

    // 2. Popola i valori numerici nel Widget
    document.getElementById('total-nights').innerText = nights;
    
    // Tassa
    const cityTaxEl = document.getElementById('city-tax-display');
    if(cityTaxEl) cityTaxEl.innerText = '€ ' + cityTax.toLocaleString('it-IT', {minimumFractionDigits: 2});
    
    // Gran Totale (in alto)
    const grandTotalEl = document.getElementById('grand-total-display');
    if(grandTotalEl) grandTotalEl.innerText = '€ ' + grandTotal.toLocaleString('it-IT', {minimumFractionDigits: 2});
    
    // Caparra (Card Oro)
    const depositEl = document.getElementById('deposit-amount');
    if(depositEl) depositEl.innerText = '€ ' + deposit.toLocaleString('it-IT', {minimumFractionDigits: 2});
    
    // Saldo (Card Blu)
    const balanceEl = document.getElementById('balance-due');
    if(balanceEl) balanceEl.innerText = '€ ' + balanceDue.toLocaleString('it-IT', {minimumFractionDigits: 2});

    // 3. Aggiorna il bottone "Richiedi"
    const btn = document.getElementById('btn-request');
    if (btn) {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.onclick = function(e) {
            e.preventDefault();
            const contactMethod = document.getElementById('contact-method').value;
            const rName = (typeof ROOM_NAME !== 'undefined') ? ROOM_NAME : "Camera";
            
            // Messaggio WhatsApp formattato
            let message = `Salve, vorrei prenotare la *${rName}*.\n\n` + 
                          `📅 *Date:* ${dateString} (${nights} notti)\n` + 
                          `👤 *Ospiti:* ${guests}\n\n` + 
                          `💶 *TOTALE SOGGIORNO:* € ${grandTotal}\n` + 
                          `(Pernotti: €${roomCost} + Tassa: €${cityTax})\n` + 
                          `--------------------------------\n` + 
                          `🔒 *CAPARRA (40%):* € ${deposit}\n` + 
                          `🏨 *SALDO IN HOTEL:* € ${balanceDue}\n` + 
                          `--------------------------------\n` + 
                          `Attendo il link per il versamento della caparra. Grazie!`;
            
            if (contactMethod === 'whatsapp') {
                window.open(`https://wa.me/393489617894?text=${encodeURIComponent(message)}`, '_blank');
            } else {
                const subject = `Richiesta Prenotazione: ${rName}`;
                window.location.href = `mailto:info@cadellavalletta.it?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
            }
        };
    }
}