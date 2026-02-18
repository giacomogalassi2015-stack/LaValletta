/* ============================================================
   LANGUAGE-MANAGER.JS - GESTIONE LINGUA & MEMORIA
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Recupera la lingua salvata o usa l'Italiano come default
    let currentLang = localStorage.getItem('preferredLanguage') || 'it';
    
    // 2. Applica subito la lingua salvata
    applyLanguage(currentLang);

    // 3. Gestisci il cambio lingua dal menu
    const langSelector = document.getElementById('language-selector');
    
    if (langSelector) {
        // Imposta il selettore sulla lingua corrente (es. se sono in EN, mostra EN)
        langSelector.value = currentLang;

        // Quando l'utente cambia lingua...
        langSelector.addEventListener('change', (e) => {
            const newLang = e.target.value;
            
            // ...salva la scelta nel browser (Local Storage)...
            localStorage.setItem('preferredLanguage', newLang);
            
            // ...e applica la traduzione immediatamente
            applyLanguage(newLang);
        });
    }
});

// Funzione che traduce la pagina
function applyLanguage(lang) {
    // Controlla se abbiamo le traduzioni per questa lingua
    if (!window.translations || !window.translations[lang]) {
        console.warn(`Traduzioni non trovate per: ${lang}`);
        return;
    }

    const t = window.translations[lang];

    // Cerca tutti gli elementi con l'attributo data-i18n
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        
        if (t[key]) {
            // Gestione diversa per Input/Placeholder e Testo normale
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.placeholder = t[key];
            } else {
                element.innerHTML = t[key]; // innerHTML permette di usare grassetti ecc.
            }
        }
    });

    // Aggiorna anche l'attributo lang dell'HTML (utile per Google)
    document.documentElement.lang = lang;
}