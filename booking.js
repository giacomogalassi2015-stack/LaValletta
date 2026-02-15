/* --- booking.js (Versione Blindata) --- */

// Recupera le variabili globali definite nell'HTML
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let pricingRules = []; 

document.addEventListener('DOMContentLoaded', async function() {
    
    // 1. TENTA IL DOWNLOAD (Ma non bloccare tutto se fallisce)
    try {
        const { data, error } = await client
            .from('listino_prezzi')
            .select('*')
            .order('mese', { ascending: true });
        
        if (error) throw error;
        
        if (data && data.length > 0) {
            pricingRules = data;
            console.log("✅ Listino scaricato:", pricingRules.length + " regole.");
        } else {
            console.warn("⚠️ Tabella vuota o nessun dato.");
        }

    } catch (err) {
        console.error("❌ Errore connessione Supabase:", err.message);
        console.log("⚠️ Attivo modalità offline (Prezzi standard + Apertura Maggio-Ottobre).");
    } finally {
        // 2. AVVIA IL CALENDARIO (Sempre, anche se c'è stato errore)
        initCalendar();
    }

    // Gestione cambio ospiti
    const guestsSelect = document.getElementById('guests');
    if(guestsSelect) {
        guestsSelect.addEventListener('change', function() {
            const datePicker = document.getElementById('date-picker')._flatpickr;
            if (datePicker && datePicker.selectedDates.length === 2) {
                calculateTotal(datePicker.selectedDates[0], datePicker.selectedDates[1], datePicker.input.value);
            }
        });
    }
});

// 3. INIZIALIZZA CALENDARIO
function initCalendar() {
    // Se pricingRules è vuoto (errore connessione), usiamo fallback manuale
    // Fallback: Apri mesi 5,6,7,8,9,10 (Maggio-Ottobre)
    const dbMonths = pricingRules.map(rule => rule.mese);
    const hasData = dbMonths.length > 0;

    flatpickr("#date-picker", {
        mode: "range",
        minDate: "today",
        dateFormat: "d/m/Y",
        locale: "it",
        disable: [
            function(date) {
                const m = date.getMonth() + 1; // JS 0-11 -> Supabase 1-12
                
                if (hasData) {
                    // SE ABBIAMO I DATI: Usa le regole del database
                    return !dbMonths.includes(m);
                } else {
                    // SE SIAMO OFFLINE: Chiudi tutto tranne Maggio(5)-Ottobre(10)
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

// 4. LOGICA DI CALCOLO
function calculateTotal(startDate, endDate, dateString) {
    document.getElementById('loading-prices').style.display = 'block';
    document.getElementById('price-summary').style.display = 'none';
    
    let total = 0;
    let nights = 0;
    let currentDate = new Date(startDate);
    
    const diffTime = Math.abs(endDate - startDate);
    const totalNights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (totalNights === 0) return;

    const isSingleNight = (totalNights === 1);
    const guestsElement = document.getElementById('guests');
    const guests = guestsElement ? parseInt(guestsElement.value) : 2;
    const isSingleGuest = (guests === 1);

    let appliedSurchargePercent = 0; 

    while (currentDate < endDate) {
        const month = currentDate.getMonth() + 1; 
        const dayOfWeek = currentDate.getDay(); 
        
        // PREZZO BASE DI RISERVA (Se DB offline)
        let dailyPrice = 160; 

        // Cerca nel DB (se disponibile)
        const rule = pricingRules.find(r => r.mese == month);
        
        if (rule) {
            // DATABASE ONLINE
            dailyPrice = (typeof CURRENT_ROOM !== 'undefined' && CURRENT_ROOM === 'king') ? rule.prezzo_king : rule.prezzo_deluxe;
            
            // Weekend
            const extra = rule.extra_weekend !== null ? rule.extra_weekend : 20;
            if (dayOfWeek === 5 || dayOfWeek === 6) dailyPrice += extra;

            // Sconto Single
            if (isSingleGuest && rule.sconto_singolo) {
                dailyPrice -= dailyPrice * (rule.sconto_singolo / 100);
            }

            // Maggiorazione Notte Singola
            if (isSingleNight && rule.maggiorazione_singola) {
                appliedSurchargePercent = rule.maggiorazione_singola;
            }
        } else {
            // DATABASE OFFLINE O MESE NON TROVATO
            // Applichiamo logiche base standard
            if (dayOfWeek === 5 || dayOfWeek === 6) dailyPrice += 20; // Extra weekend standard
            if (isSingleGuest) dailyPrice -= dailyPrice * 0.05; // Sconto 5% standard
            if (isSingleNight) appliedSurchargePercent = 30; // Maggiorazione 30% standard
        }

        total += dailyPrice;
        nights++;
        currentDate.setDate(currentDate.getDate() + 1);
    }

    if (isSingleNight && appliedSurchargePercent > 0) {
        total += total * (appliedSurchargePercent / 100);
    }

    updateUI(Math.round(total), nights, dateString);
}

function updateUI(total, nights, dateString) {
    document.getElementById('loading-prices').style.display = 'none';
    document.getElementById('price-summary').style.display = 'block';
    
    document.getElementById('total-nights').innerText = nights;
    document.getElementById('total-price').innerText = '€ ' + total;
    document.getElementById('avg-price').innerText = '€ ' + Math.round(total / nights);

    const btn = document.getElementById('btn-request');
    if(btn) {
        btn.classList.remove('disabled');
        btn.innerHTML = `Richiedi Preventivo <i class="fas fa-paper-plane"></i>`;
        
        // Rimuovi vecchi event listener clonando il nodo
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.onclick = function(e) {
            e.preventDefault();
            const guests = document.getElementById('guests').value;
            const method = document.getElementById('contact-method').value;
            
            // Verifica che ROOM_NAME sia definito
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