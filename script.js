document.addEventListener('DOMContentLoaded', () => {

    /* --- 1. INIZIALIZZAZIONE ANIMAZIONI (AOS) --- */
   
    if (typeof AOS !== 'undefined') {
        AOS.init({
            once: true, 
            offset: 100,
            duration: 800
        });
    }

    /* --- 2. GESTIONE NAVBAR (Logica Scroll) --- */
    const navbar = document.getElementById('navbar');

    function handleScroll() {
        if (!navbar) return; 
        
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }

    window.addEventListener('scroll', handleScroll);
    
    handleScroll();


    /* --- 3. MENU MOBILE --- */
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    const body = document.body;

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
        
            navLinks.classList.toggle('active');
            
            const icon = hamburger.querySelector('i');
            if (icon) {
                if (navLinks.classList.contains('active')) {
                    icon.classList.remove('fa-bars');
                    icon.classList.add('fa-times');
                    body.style.overflow = 'hidden'; 
                } else {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                    body.style.overflow = 'auto'; 
                }
            }
        });

        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                body.style.overflow = 'auto';
                
                const icon = hamburger.querySelector('i');
                if(icon) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            });
        });
    }


    /* --- 4. SLIDER HOME PAGE  --- */
    const homeSliders = document.querySelectorAll('.slider-container');

    homeSliders.forEach(slider => {
        const slides = slider.querySelectorAll('.slide');
        const nextBtn = slider.querySelector('.next-btn');
        const prevBtn = slider.querySelector('.prev-btn');
        let currentSlideIdx = 0; 

        if (slides.length === 0) return;

        function showSlide(index) {
            
            slides.forEach(slide => slide.classList.remove('active'));
            
            if (index >= slides.length) currentSlideIdx = 0;
            else if (index < 0) currentSlideIdx = slides.length - 1;
            else currentSlideIdx = index;
            
            slides[currentSlideIdx].classList.add('active');
        }

        if(nextBtn) {
            nextBtn.addEventListener('click', (e) => {
                e.preventDefault(); 
                showSlide(currentSlideIdx + 1);
            });
        }
        if(prevBtn) {
            prevBtn.addEventListener('click', (e) => {
                e.preventDefault();
                showSlide(currentSlideIdx - 1);
            });
        }
    });


    /* --- 5. SLIDER DETTAGLIO CAMERA (Automatico 5s) --- */
    const roomSlides = document.querySelectorAll(".room-slide");
    
    if (roomSlides.length > 0) {
        let roomSlideIndex = 0;
        let roomInterval;

        function showRoomSlides(n) {
            if (n >= roomSlides.length) { roomSlideIndex = 0 }
            if (n < 0) { roomSlideIndex = roomSlides.length - 1 }

            roomSlides.forEach(slide => slide.classList.remove("active"));
            roomSlides[roomSlideIndex].classList.add("active");
        }

        function nextRoomSlide() {
            showRoomSlides(roomSlideIndex += 1);
        }

        window.changeRoomSlide = function(n) {
            clearInterval(roomInterval); 
            roomInterval = setInterval(nextRoomSlide, 5000); 
            showRoomSlides(roomSlideIndex += n);
        };

        showRoomSlides(roomSlideIndex);
        roomInterval = setInterval(nextRoomSlide, 5000);
    }

});

/* ============================================================
   LAZY LOADING GOOGLE MAPS — Intersection Observer
   Intercetta tutti i contenitori .map-lazy-wrapper.
   L'iframe viene iniettato nel DOM solo quando l'elemento
   entra nel viewport con un margine di 200px di anticipo.
   Questo elimina il caricamento di ~500KB di risorse Google Maps
   durante il critical path della pagina.
   ============================================================ */
(function () {
    'use strict';

    // Seleziona tutti i contenitori lazy della mappa (1 per pagina index)
    const mapWrappers = document.querySelectorAll('.map-lazy-wrapper');

    // Se non ci sono mappe lazy nella pagina corrente, esci subito
    if (!mapWrappers.length) return;

    // Verifica supporto Intersection Observer (tutti i browser moderni + IE edge)
    if (!('IntersectionObserver' in window)) {
        // Fallback per browser molto vecchi: carica subito tutti gli iframe
        mapWrappers.forEach(loadMap);
        return;
    }

    const mapObserver = new IntersectionObserver(function (entries, observer) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                loadMap(entry.target);
                // Una volta caricata, smette di osservare questo elemento
                observer.unobserve(entry.target);
            }
        });
    }, {
        // rootMargin: inizia il caricamento quando il contenitore è
        // a 200px dal bordo inferiore del viewport — l'utente non
        // percepirà nessun ritardo nello scroll normale
        rootMargin: '0px 0px 200px 0px',
        threshold: 0
    });

    mapWrappers.forEach(function (wrapper) {
        mapObserver.observe(wrapper);
    });

    /**
     * Inietta l'iframe nel contenitore e rimuove il placeholder.
     * @param {HTMLElement} wrapper - Il div .map-lazy-wrapper
     */
    function loadMap(wrapper) {
        var src   = wrapper.getAttribute('data-src');
        var title = wrapper.getAttribute('data-title') || 'Google Maps';

        if (!src) return;

        // Crea l'iframe con gli stessi attributi dell'originale
        var iframe = document.createElement('iframe');
        iframe.src                 = src;
        iframe.title               = title;
        iframe.allowFullscreen     = true;
        iframe.loading             = 'lazy';       // doppio livello di lazy nativo
        iframe.referrerPolicy      = 'no-referrer-when-downgrade';
        iframe.setAttribute('style',
            'position: absolute; top: 0; left: 0; ' +
            'width: 100%; height: 100%; border: 0;');

        // Rimuove il placeholder prima di inserire l'iframe
        var placeholder = wrapper.querySelector('.map-placeholder');
        if (placeholder) {
            placeholder.remove();
        }

        wrapper.appendChild(iframe);

        // Pulisce gli attributi data- non più necessari
        wrapper.removeAttribute('data-src');
        wrapper.removeAttribute('data-title');
    }

}());

/* --- INIZIALIZZAZIONE TUTTE LE FUNZIONI --- */
document.addEventListener("DOMContentLoaded", function() {
    
    // 1. Inizializza Animazioni AOS
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 1000,
            once: true
        });
    }

    // 2. Logica Mappa Lazy (Intersection Observer)
    const mapWrapper = document.querySelector('.map-lazy-wrapper');
    if (mapWrapper) {
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const src = mapWrapper.getAttribute('data-src');
                    const title = mapWrapper.getAttribute('data-title');
                    const iframe = document.createElement('iframe');
                    iframe.src = src;
                    iframe.title = title;
                    iframe.style.position = "absolute";
                    iframe.style.inset = "0";
                    iframe.style.width = "100%";
                    iframe.style.height = "100%";
                    iframe.style.border = "0";
                    iframe.setAttribute("allowfullscreen", "");
                    iframe.setAttribute("loading", "lazy");
                    const placeholder = mapWrapper.querySelector('.map-placeholder');
                    if (placeholder) placeholder.remove();
                    mapWrapper.appendChild(iframe);
                    observer.unobserve(mapWrapper);
                }
            });
        }, { rootMargin: "200px" });
        observer.observe(mapWrapper);
    }
});