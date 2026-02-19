document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Recupera la lingua salvata o usa l'Italiano come default
    let currentLang = localStorage.getItem('preferredLanguage') || 'it';
    
    // 2. Applica subito la lingua salvata
    applyLanguage(currentLang);

    // 3. Gestisci il cambio lingua dal menu
    const langSelector = document.getElementById('language-selector');
    
    if (langSelector) {
       
        langSelector.value = currentLang;

        langSelector.addEventListener('change', (e) => {
            const newLang = e.target.value;
            
            localStorage.setItem('preferredLanguage', newLang);
            
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
}