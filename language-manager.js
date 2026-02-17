document.addEventListener('DOMContentLoaded', () => {
    const selector = document.getElementById('language-selector');
    
    // 1. Controlla se c'è una lingua salvata, altrimenti usa IT
    let currentLang = localStorage.getItem('site_lang') || 'it';
    
    // 2. Imposta il selettore e aggiorna la pagina
    if (selector) {
        selector.value = currentLang;
        changeLanguage(currentLang);

        // 3. Ascolta il cambio del menu a tendina
        selector.addEventListener('change', (e) => {
            currentLang = e.target.value;
            localStorage.setItem('site_lang', currentLang); // Salva la scelta
            changeLanguage(currentLang);
        });
    }

    function changeLanguage(lang) {
        // Cerca tutti gli elementi con l'attributo data-i18n
        const elements = document.querySelectorAll('[data-i18n]');
        
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (translations[lang] && translations[lang][key]) {
                // Usa innerHTML per permettere tag come <br> nel testo
                el.innerHTML = translations[lang][key];
            }
        });
        
        // Aggiorna l'attributo "lang" dell'HTML per la SEO
        document.documentElement.lang = lang;
    }
});