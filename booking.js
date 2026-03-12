// --- URL DEL FOGLIO GOOGLE PUBBLICATO IN CSV ---
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vROmTNDLNHlbBVbuIa2H2QZMO5sLDCvX1gBe1WP_5dNXp7OOmblUiwVFZXprxgUgECRWVZSCL9AYzvo/pub?output=csv"; 

const proxy = "https://api.codetabs.com/v1/proxy?quest=";
let pricingRules = []; 

// --- FUNZIONE PER CONVERTIRE IL CSV IN JSON (Oggetti Javascript) ---
function parseCSVToJSON(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const result = [];
    
    for (let i = 1; i < lines.length; i++) {
        // Usa una regex per gestire eventuali virgole nei testi, anche se qui non dovrebbero esserci
        const currentLine = lines[i].split(',');
        if (currentLine.length === headers.length) {
            const obj = {};
            for (let j = 0; j < headers.length; j++) {
                let val = currentLine[j].trim();
                // Converte le stringhe in numeri (fondamentale per i calcoli dei prezzi!)
                obj[headers[j]] = isNaN(val) || val === '' ? val : Number(val);
            }
            result.push(obj);
        }
    }
    return result;
}

document.addEventListener('DOMContentLoaded', async function() {
    
    // 1. SCARICA IL LISTINO PREZZI DA GOOGLE SHEETS
    try {
        // Aggiungiamo un parametro random per evitare che il browser metta in cache il listino vecchio
        const cacheBuster = "&t=" + new Date().getTime(); 
        const urlWithCacheBuster = SHEET_CSV_URL.includes('?') ? SHEET_CSV_URL + cacheBuster : SHEET_CSV_URL + "?t=" + new Date().getTime();
        
        const response = await fetch(urlWithCacheBuster);
        
        if (!response.ok) throw new Error("Errore nel download dal foglio Google");
        
        const csvText = await response.text();
        
        // Trasforma il testo CSV nell'array di oggetti di cui il tuo codice ha bisogno
        pricingRules = parseCSVToJSON(csvText);
        
        // Assicuriamoci che i dati siano ordinati per mese (come faceva Supabase con .order('mese'))
        pricingRules.sort((a, b) => a.mese - b.mese);
        
        console.log("✅ Listino scaricato da Google Sheets:", pricingRules.length + " mesi trovati.");
    } catch (err) {
        console.error("❌ Errore Google Sheets:", err.message);
    }

    // 2. SCARICA TUTTI I CALENDARI 
    let blockedDates = [];
    // ... IL RESTO DEL TUO CODICE RIMANE IDENTICO DA QUI IN POI ...
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

let currentLang = document.documentElement.lang || localStorage.getItem('preferredLanguage') || 'it';
    
    let fpLocale = (currentLang === 'en') ? 'default' : currentLang;

    window.myCalendarInstance = flatpickr("#date-picker", {
        mode: "range",
        minDate: "today",
        dateFormat: "d/m/Y",
        locale: fpLocale, 
        disable: [
            ...blockedDatesCombined, 
            function(date) {
                const m = date.getMonth() + 1;
                if (hasData) {
                    return !dbMonths.includes(m); 
                } else {
                    return (m < 4 || m > 10); 
                }
            }
        ],
       onChange: function(selectedDates, dateStr, instance) {
    
    // --- LOGICA NOTTE SINGOLA AL VOLO ---
    if (selectedDates.length === 1) {
        const start = selectedDates[0];
        
        // Calcola il giorno successivo come checkout provvisorio
        const nextDay = new Date(start.getTime());
        nextDay.setDate(nextDay.getDate() + 1);
        
        // Controlla se il giorno successivo è bloccato o fuori dal range
        const nextDayStr = instance.formatDate(nextDay, "Y-m-d");
        const isNextDayDisabled = instance.config.disable.some(disabledRange => {
            if (typeof disabledRange === 'object' && disabledRange.from && disabledRange.to) {
                return nextDay > new Date(disabledRange.from) && nextDay <= new Date(disabledRange.to);
            }
            if (typeof disabledRange === 'string') {
                return nextDayStr === disabledRange;
            }
            return false;
        });
        
        // Costruisci la stringa dateStr nel formato atteso da calculateTotal
        const startStr = instance.formatDate(start, "d/m/Y");
        const nextDayStrFormatted = instance.formatDate(nextDay, "d/m/Y");
        const singleNightDateStr = `${startStr} — ${nextDayStrFormatted}`;
        
        // Calcola sempre il prezzo della singola notte (check-out = giorno dopo)
        calculateTotal(start, nextDay, singleNightDateStr);
        
        // Se il giorno dopo è bloccato, forza la selezione come range completato
        if (isNextDayDisabled) {
            // Imposta il range come "chiuso" con checkout = giorno successivo
            instance.setDate([start, nextDay], false);
        }
        
        return; // Esce: il prezzo è già mostrato, aspetta eventuale secondo click
    }
    
    // --- RANGE NORMALE (2 date selezionate) ---
    if (selectedDates.length === 2) {
        const start = selectedDates[0];
        const end = selectedDates[1];
        
        const startStr = instance.formatDate(start, "d/m/Y");
        const endStr = instance.formatDate(end, "d/m/Y");
        const rangeDateStr = `${startStr} — ${endStr}`;
        
        calculateTotal(start, end, rangeDateStr);
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
            
            // Messaggio formattato uguale per entrambi i metodi
           // 1. Rileviamo la lingua attuale della pagina (di base è 'it')
            const currentLang = document.documentElement.lang || 'it';

            // 2. Dizionario delle traduzioni per il messaggio
            const translations = {
                it: {
                    greet: "Salve, vorrei prenotare la",
                    dates: "Date",
                    nights: "notti",
                    guests: "Ospiti",
                    total: "TOTALE SOGGIORNO",
                    costRoom: "Pernotti",
                    costTax: "Tassa",
                    deposit: "CAPARRA (40%)",
                    balance: "SALDO IN HOTEL",
                    waitLink: "Attendo il link per il versamento della caparra. Grazie!",
                    subject: "Richiesta Prenotazione"
                },
                en: {
                    greet: "Hello, I would like to book the",
                    dates: "Dates",
                    nights: "nights",
                    guests: "Guests",
                    total: "TOTAL STAY",
                    costRoom: "Room",
                    costTax: "Tax",
                    deposit: "DEPOSIT (40%)",
                    balance: "BALANCE AT HOTEL",
                    waitLink: "I await the link to pay the deposit. Thank you!",
                    subject: "Booking Request"
                },
                fr: {
                    greet: "Bonjour, je voudrais réserver la",
                    dates: "Dates",
                    nights: "nuits",
                    guests: "Personnes",
                    total: "TOTAL SÉJOUR",
                    costRoom: "Chambre",
                    costTax: "Taxe",
                    deposit: "ACOMPTE (40%)",
                    balance: "SOLDE À L'HÔTEL",
                    waitLink: "J'attends le lien pour payer l'acompte. Merci !",
                    subject: "Demande de réservation"
                },
                de: {
                    greet: "Hallo, ich möchte folgendes Zimmer buchen:",
                    dates: "Daten",
                    nights: "Nächte",
                    guests: "Gäste",
                    total: "GESAMTBETRAG",
                    costRoom: "Zimmer",
                    costTax: "Steuer",
                    deposit: "ANZAHLUNG (40%)",
                    balance: "RESTBETRAG IM HOTEL",
                    waitLink: "Ich warte auf den Link zur Zahlung der Anzahlung. Danke!",
                    subject: "Buchungsanfrage"
                },
                es: {
                    greet: "Hola, me gustaría reservar la",
                    dates: "Fechas",
                    nights: "noches",
                    guests: "Huéspedes",
                    total: "ESTANCIA TOTAL",
                    costRoom: "Habitación",
                    costTax: "Tasa",
                    deposit: "DEPÓSITO (40%)",
                    balance: "SALDO EN EL HOTEL",
                    waitLink: "Espero el enlace para pagar el depósito. ¡Gracias!",
                    subject: "Solicitud de reserva"
                }
            };

            // Se la lingua non esiste nel dizionario, usa l'italiano di default
            const t = translations[currentLang] ? translations[currentLang] : translations['it'];

            // 3. Creiamo il messaggio tradotto
            let message = `${t.greet} *${rName}*.\n\n` +
                          `📅 *${t.dates}:* ${dateString} (${nights} ${t.nights})\n` +
                          `👤 *${t.guests}:* ${guests}\n\n` +
                          `💶 *${t.total}:* € ${grandTotal}\n` +
                          `(${t.costRoom}: €${roomCost} + ${t.costTax}: €${cityTax})\n` +
                          `--------------------------------\n` +
                          `🔒 *${t.deposit}:* € ${deposit}\n` +
                          `🏨 *${t.balance}:* € ${balanceDue}\n` +
                          `--------------------------------\n` +
                          `${t.waitLink}`;
            
            if (contactMethod === 'whatsapp') {
                // Logica WhatsApp
                window.open(`https://wa.me/393489617894?text=${encodeURIComponent(message)}`, '_blank');
            } else {
                // Logica Mail
                const subject = `${t.subject}: ${rName} - ${dateString}`;
                const mailtoUrl = `mailto:info@cadellavalletta.it?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
                window.location.href = mailtoUrl;
            }
        };
    }
}