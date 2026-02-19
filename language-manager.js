document.addEventListener('DOMContentLoaded', () => {
    
    let currentLang = localStorage.getItem('preferredLanguage') || 'it';
    
    applyLanguage(currentLang);

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
    if (window.myCalendarInstance) {
        let newFpLocale = (lang === 'en') ? 'default' : lang;
        window.myCalendarInstance.set('locale', newFpLocale);
    }
}