document.addEventListener('DOMContentLoaded', () => {

    // --- UTILITY: Riconosce se la pagina corrente è una "home fisica" ---
    const path = window.location.pathname;
    const filename = path.split('/').pop() || 'index.html';
    
    // Le home fisiche sono file tipo index.html, index-en.html, index-fr.html, ecc.
    const isPhysicalHomePage = /^index(-[a-z]{2})?\.html$/i.test(filename);

    // --- 1. Determina la lingua partendo dall'URL ---
    let currentLang = 'it';

    const langMatch = filename.match(/index-([a-z]{2})\.html$/i);
    if (langMatch) {
        // Siamo su una home fisica con lingua (es. index-en.html → 'en')
        currentLang = langMatch[1];
    } else if (path.includes('-en')) {
        currentLang = 'en';
    } else if (path.includes('-fr')) {
        currentLang = 'fr';
    } else if (path.includes('-de')) {
        currentLang = 'de';
    } else if (path.includes('-es')) {
        currentLang = 'es';
    } else {
        // Pagina senza lingua nell'URL (es. faq.html): usa localStorage o html lang
        currentLang = localStorage.getItem('preferredLanguage')
                   || document.documentElement.lang
                   || 'it';
    }

    // --- 2. Salva in localStorage ---
    localStorage.setItem('preferredLanguage', currentLang);

    // --- 3. Applica la lingua ai testi ---
    applyLanguage(currentLang);

    // --- FIX 1: Aggiorna i link "Home" nel menu in base alla lingua attiva ---
    updateHomeLinks(currentLang);

    // --- 4. Gestisci il selettore lingua ---
    const langSelector = document.getElementById('language-selector');

    if (langSelector) {
        langSelector.value = currentLang;

        langSelector.addEventListener('change', (e) => {
            const newLang = e.target.value;
            localStorage.setItem('preferredLanguage', newLang);

            // --- FIX 2: Comportamento diverso in base al tipo di pagina ---
            if (isPhysicalHomePage) {
                // Siamo su una home fisica → redirect al file corretto
                const newFile = (newLang === 'it') ? 'index.html' : `index-${newLang}.html`;
                window.location.href = window.location.href.replace(filename, newFile);
            } else {
                // Pagina dinamica (faq.html, camera-king.html, ecc.) → traduzione al volo
                applyLanguage(newLang);
                updateHomeLinks(newLang); // aggiorna anche i link Home dopo il cambio lingua
            }
        });
    }
});

/**
 * Aggiorna tutti i link che puntano a una home fisica (index*.html)
 * Corretto per supportare le ancore (es: index.html#territorio)
 */
function updateHomeLinks(lang) {
    const homeFile = (lang === 'it') ? 'index.html' : `index-${lang}.html`;

    document.querySelectorAll('a[href]').forEach(link => {
        const href = link.getAttribute('href');
        
        // Controllo di sicurezza se l'href non esiste
        if (!href) return;

        // RIMOSSO IL $ DALLA REGEX: ora matcha anche index.html#territorio
        if (/index(-[a-z]{2})?\.html/i.test(href)) {
            const newHref = href.replace(/index(-[a-z]{2})?\.html/i, homeFile);
            link.setAttribute('href', newHref);
        } else if (href === '.' || href === './') {
            link.setAttribute('href', homeFile);
        }
    });
}

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
        const newFpLocale = (lang === 'it') ? 'default' : lang;
        window.myCalendarInstance.set('locale', newFpLocale);
    }
}