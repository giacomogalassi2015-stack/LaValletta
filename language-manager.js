document.addEventListener('DOMContentLoaded', () => {
    
    const path = window.location.pathname;
    let savedLang = localStorage.getItem('preferredLanguage');
    let currentLang = 'it';

    // 1. REINDIRIZZAMENTO AUTOMATICO DALLA HOME ITALIANA
    // Se l'utente visita la root (/) o index.html, ma aveva già salvato un'altra lingua, lo spostiamo!
    if (path === '/' || path.endsWith('/') || path.endsWith('index.html')) {
        if (savedLang && savedLang !== 'it') {
            window.location.replace('index-' + savedLang + '.html');
            return; // Ferma l'esecuzione e fa il redirect
        }
        currentLang = 'it';
    } 
    // 2. SE SIAMO SULLE HOME TRADOTTE, COMANDA L'URL
    else if (path.includes('index-en.html')) currentLang = 'en';
    else if (path.includes('index-fr.html')) currentLang = 'fr';
    else if (path.includes('index-de.html')) currentLang = 'de';
    else if (path.includes('index-es.html')) currentLang = 'es';
    
    // 3. SE SIAMO SULLE ALTRE PAGINE (Camere, FAQ), COMANDA LA MEMORIA
    else {
        currentLang = savedLang || 'it';
    }

    // Salviamo la lingua scelta in modo definitivo
    localStorage.setItem('preferredLanguage', currentLang);

    // Applichiamo la traduzione e aggiorniamo i link del menu
    applyLanguage(currentLang);
    updateDynamicLinks(currentLang);

    // 4. GESTIONE DELLA TENDINA DELLE LINGUE
    const langSelector = document.getElementById('language-selector');
    if (langSelector) {
        langSelector.value = currentLang;

        // Questo trucco serve a eliminare vecchi script "invisibili" rimasti nell'HTML
        const newSelector = langSelector.cloneNode(true);
        langSelector.parentNode.replaceChild(newSelector, langSelector);

        newSelector.addEventListener('change', (e) => {
            const newLang = e.target.value;
            localStorage.setItem('preferredLanguage', newLang);
            
            // Se siamo su una pagina Index, reindirizzo fisicamente all'index corretto
            if (window.location.pathname.includes('index') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
                if (newLang === 'it') window.location.href = 'index.html';
                else window.location.href = `index-${newLang}.html`;
            } else {
                // Sulle pagine unificate (Camere, FAQ) applico la lingua dinamicamente senza ricaricare
                applyLanguage(newLang);
                updateDynamicLinks(newLang); // Aggiorno al volo i link nel menu!
            }
        });
    }
});

// FUNZIONE MAGICA: Cambia gli "href" del menu in base alla lingua attiva!
function updateDynamicLinks(lang) {
    document.querySelectorAll('a').forEach(link => {
        let href = link.getAttribute('href');
        
        // Se il link punta a index.html (es. "Home" o "Experience")
        if (href && (href.startsWith('index.html') || href.startsWith('index-'))) {
            // Mantiene intatti gli #ancoraggi (es. #territorio)
            let hashIndex = href.indexOf('#');
            let hash = hashIndex !== -1 ? href.substring(hashIndex) : '';
            
            if (lang === 'it') {
                link.setAttribute('href', 'index.html' + hash);
            } else {
                link.setAttribute('href', `index-${lang}.html` + hash);
            }
        }
    });
}

// FUNZIONE DI TRADUZIONE DEI TESTI
function applyLanguage(lang) {
    if (!window.translations || !window.translations[lang]) return;
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
    
    // Aggiorna anche il calendario se è presente nella pagina
    if (window.myCalendarInstance) {
        let newFpLocale = (lang === 'it') ? 'default' : lang;
        window.myCalendarInstance.set('locale', newFpLocale);
    }
}