/* ============================================================
   SCRIPT.JS - CA' DELLA VALLETTA
   Codice unificato per Navbar, Mappe, Slider, Lingue e Booking
   ============================================================ */

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

    /* --- 4. SLIDER HOME PAGE --- */
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

    /* --- 5. SLIDER DETTAGLIO CAMERA (Manuale e Senza onclick) --- */
    const roomSlider = document.getElementById('roomSlider');
    if (roomSlider) {
        const roomSlides = roomSlider.querySelectorAll('.room-slide');
        const prevBtn = roomSlider.querySelector('.slider-arrow.prev');
        const nextBtn = roomSlider.querySelector('.slider-arrow.next');
        let currentRoomSlide = 0;

        function updateRoomSlide(newIndex) {
            if (roomSlides.length === 0) return;
            roomSlides.forEach(slide => slide.classList.remove('active'));
            currentRoomSlide = (newIndex + roomSlides.length) % roomSlides.length;
            roomSlides[currentRoomSlide].classList.add('active');
        }

        // Ascoltatori bottoni (funzioneranno per tutte le lingue)
        if (prevBtn) prevBtn.addEventListener('click', (e) => { e.preventDefault(); updateRoomSlide(currentRoomSlide - 1); });
        if (nextBtn) nextBtn.addEventListener('click', (e) => { e.preventDefault(); updateRoomSlide(currentRoomSlide + 1); });
    }

    /* --- 6. LAZY LOADING GOOGLE MAPS --- */
    const mapWrappers = document.querySelectorAll('.map-lazy-wrapper');
    if (mapWrappers.length > 0) {
        if (!('IntersectionObserver' in window)) {
            mapWrappers.forEach(loadMap);
        } else {
            const mapObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        loadMap(entry.target);
                        observer.unobserve(entry.target);
                    }
                });
            }, { rootMargin: '0px 0px 200px 0px', threshold: 0 });

            mapWrappers.forEach(wrapper => mapObserver.observe(wrapper));
        }

        function loadMap(wrapper) {
            const src = wrapper.getAttribute('data-src');
            const title = wrapper.getAttribute('data-title') || 'Google Maps';
            if (!src) return;

            const iframe = document.createElement('iframe');
            iframe.src = src;
            iframe.title = title;
            iframe.allowFullscreen = true;
            iframe.loading = 'lazy';
            iframe.referrerPolicy = 'no-referrer-when-downgrade';
            iframe.setAttribute('style', 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;');

            const placeholder = wrapper.querySelector('.map-placeholder');
            if (placeholder) placeholder.remove();

            wrapper.appendChild(iframe);
            wrapper.removeAttribute('data-src');
            wrapper.removeAttribute('data-title');
        }
    }

    /* --- 7. LANGUAGE SELECTOR --- */
    const PAGE_URLS = {
        'index': {
            it: '/ITA/index-ita.html',
            en: '/',
            fr: '/FR/index-fr.html',
            de: '/DE/index-de.html',
            es: '/ES/index-es.html'
        },
        'camera-king': {
            it: '/ITA/camera-king-ita.html',
            en: '/camera-king-en.html',
            fr: '/FR/camera-king-fr.html',
            de: '/DE/camera-king-de.html',
            es: '/ES/camera-king-es.html'
        },
        'camera-deluxe': {
            it: '/ITA/camera-deluxe-ita.html',
            en: '/camera-deluxe-en.html',
            fr: '/FR/camera-deluxe-fr.html',
            de: '/DE/camera-deluxe-de.html',
            es: '/ES/camera-deluxe-es.html'
        },
        'galleria': {
            it: '/ITA/galleria-ita.html',
            en: '/galleria-en.html',
            fr: '/FR/galleria-fr.html',
            de: '/DE/galleria-de.html',
            es: '/ES/galleria-es.html'
        },
        'faq': {
            it: '/ITA/faq-ita.html',
            en: '/faq-en.html',
            fr: '/FR/faq-fr.html',
            de: '/DE/faq-de.html',
            es: '/ES/faq-es.html'
        },
        'privacy': {
            it: '/ITA/privacy-ita.html',
            en: '/privacy-en.html',
            fr: '/FR/privacy-fr.html',
            de: '/DE/privacy-de.html',
            es: '/ES/privacy-es.html'
        },
        'termini': {
            it: '/ITA/termini-ita.html',
            en: '/termini-en.html',
            fr: '/FR/termini-fr.html',
            de: '/DE/termini-de.html',
            es: '/ES/termini-es.html'
        },
        'cookie': {
            it: '/ITA/cookie-policy-ita.html',
            en: '/cookie-policy-en.html',
            fr: '/FR/cookie-policy-fr.html',
            de: '/DE/cookie-policy-de.html',
            es: '/ES/cookie-policy-es.html'
        }
    };

    const selector = document.getElementById('language-selector');
    if (selector) {
        selector.addEventListener('change', function () {
            const targetLang = this.value;
            const page = this.getAttribute('data-page') || 'index';
            const urls = PAGE_URLS[page];
            
           if (urls && urls[targetLang]) {
                // Cattura l'ancora attuale (es. "#territorio") e uniscila al nuovo URL
                const currentHash = window.location.hash;
                window.location.href = urls[targetLang] + currentHash;
            }
        });
    }

    /* --- 8. CONFIGURAZIONE BOOKING WIDGET --- */
    const widget = document.getElementById('preventivo-box');
    if (widget) {
        const room = widget.getAttribute('data-room');
        const roomName = widget.getAttribute('data-room-name');
        const calRaw = widget.getAttribute('data-calendar-urls');

        if (room) window.CURRENT_ROOM = room;
        if (roomName) window.ROOM_NAME = roomName;
        if (calRaw) {
            try { window.CALENDAR_URLS = JSON.parse(calRaw); } catch (e) {}
        }
    }
}); // Fine DOMContentLoaded

/* --- 9. CONFIGURAZIONE SUPABASE --- */
window.SUPABASE_URL = 'https://qtvmrpzkvqsgzxlddsif.supabase.co';
window.SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0dm1ycHprdnFzZ3p4bGRkc2lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExODY2NzQsImV4cCI6MjA4Njc2MjY3NH0.IjzW0dhRaRp5R2uFw5JLj9ZeqYlK9dYHyU9EAcfB1v4';

/* --- 10. FIX SCROLL ANCORE DOPO CAMBIO LINGUA O REFRESH --- */
window.addEventListener('load', function() {
    if (window.location.hash) {
        // Trova l'elemento che corrisponde al cancelletto (es. #camere)
        const targetSection = document.querySelector(window.location.hash);
        if (targetSection) {
            // Aspetta un decimo di secondo per far calcolare bene le altezze ad AOS e alle immagini
            setTimeout(() => {
                targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 150);
        }
    }
});

