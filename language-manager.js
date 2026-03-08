document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Determina la lingua partendo dall'URL
    const path = window.location.pathname;
    let currentLang = 'it'; // lingua di base

    if (path.includes('-en')) {
        currentLang = 'en';
    } else if (path.includes('-fr')) {
        currentLang = 'fr';
    } else if (path.includes('-de')) {
        currentLang = 'de';
    } else if (path.includes('-es')) {
        currentLang = 'es';
    } else {
        // Se non c'è una lingua nell'URL (es. sei su index.html o faq.html),
        // allora controlliamo il localStorage o il tag <html>
        currentLang = localStorage.getItem('preferredLanguage') || document.documentElement.lang || 'it';
    }

    // 2. Salva la lingua corretta in memoria per quando si cambia pagina
    localStorage.setItem('preferredLanguage', currentLang);
    
    // 3. Applica la lingua
    applyLanguage(currentLang);

    // 4. Imposta la tendina e gestisci i cambiamenti manuali
    const langSelector = document.getElementById('language-selector');
    
    if (langSelector) {
        langSelector.value = currentLang;

        langSelector.addEventListener('change', (e) => {
            const newLang = e.target.value;
            
            // Aggiorna la memoria con la nuova scelta dell'utente
            localStorage.setItem('preferredLanguage', newLang);
            
            // Applica la nuova lingua al volo (utile per faq.html)
            applyLanguage(newLang);
        });
    }
});

function applyLanguage(lang) {
    if (!window.translations || !window.translations[lang]) {
        console.warn(`Traduzioni non trovate per: ${lang}`);
        return;
    }

    const t = window.translations[lang];

    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        
        if (t[key]) {
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.placeholder = t[key];
            } else {
                element.innerHTML = t[key]; 
            }
        }
    });

    document.documentElement.lang = lang;
    if (window.myCalendarInstance) {
        let newFpLocale = (lang === 'it') ? 'default' : lang;
        window.myCalendarInstance.set('locale', newFpLocale);
    }
}