/* ============================================================
   CA' DELLA VALLETTA - SCRIPT UNIFICATO (CSP FRIENDLY)
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // 1. INIZIALIZZAZIONE AOS (Animazioni)
    if (typeof AOS !== 'undefined') {
        AOS.init({ once: true, offset: 100, duration: 800 });
    }

    // 2. NAVBAR SCROLL
    const navbar = document.getElementById('navbar');
    const handleScroll = () => {
        if (!navbar) return;
        window.scrollY > 50 ? navbar.classList.add('scrolled') : navbar.classList.remove('scrolled');
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();

    // 3. MENU MOBILE
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            const icon = hamburger.querySelector('i');
            icon.classList.toggle('fa-bars');
            icon.classList.toggle('fa-times');
            document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : 'auto';
        });
    }

    // 4. LANGUAGE SELECTOR (Mappa degli URL)
    const PAGE_URLS = {
        'index': { it: '/ITA/index-ita.html', en: '/', fr: '/FR/index-fr.html', de: '/DE/index-de.html', es: '/ES/index-es.html' },
        'camera-king': { it: '/ITA/camera-king-ita.html', en: '/camera-king-en.html', fr: '/FR/camera-king-fr.html', de: '/DE/camera-king-de.html', es: '/ES/camera-king-es.html' },
        'camera-deluxe': { it: '/ITA/camera-deluxe-ita.html', en: '/camera-deluxe-en.html', fr: '/FR/camera-deluxe-fr.html', de: '/DE/camera-deluxe-de.html', es: '/ES/camera-deluxe-es.html' }
    };

    const selector = document.getElementById('language-selector');
    if (selector) {
        selector.addEventListener('change', function() {
            const page = this.getAttribute('data-page') || 'index';
            const dest = PAGE_URLS[page] ? PAGE_URLS[page][this.value] : null;
            if (dest) window.location.href = dest;
        });
    }

    // 5. SLIDERS (Home Page)
    document.querySelectorAll('.slider-container').forEach(slider => {
        const slides = slider.querySelectorAll('.slide');
        if (!slides.length) return;
        let idx = 0;
        const show = (n) => {
            slides.forEach(s => s.classList.remove('active'));
            idx = (n + slides.length) % slides.length;
            slides[idx].classList.add('active');
        };
        slider.querySelector('.next-btn')?.addEventListener('click', (e) => { e.preventDefault(); show(idx + 1); });
        slider.querySelector('.prev-btn')?.addEventListener('click', (e) => { e.preventDefault(); show(idx - 1); });
    });

    // 6. LAZY LOADING MAP (Intersection Observer)
    const mapWrapper = document.querySelector('.map-lazy-wrapper');
    if (mapWrapper && 'IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const src = mapWrapper.getAttribute('data-src');
                    if (src) {
                        const iframe = document.createElement('iframe');
                        iframe.src = src;
                        iframe.style.cssText = "position:absolute;inset:0;width:100%;height:100%;border:0;";
                        iframe.setAttribute("allowfullscreen", "");
                        iframe.setAttribute("loading", "lazy");
                        mapWrapper.querySelector('.map-placeholder')?.remove();
                        mapWrapper.appendChild(iframe);
                    }
                    observer.unobserve(mapWrapper);
                }
            });
        }, { rootMargin: "200px" });
        observer.observe(mapWrapper);
    }

    // 7. CONFIGURAZIONE SUPABASE (Globale)
    window.SUPABASE_URL = 'https://qtvmrpzkvqsgzxlddsif.supabase.co';
    window.SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // (la tua chiave)
});

// 8. FUNZIONE SLIDER CAMERE (Fuori dal DOMContentLoaded per le frecce onclick)
function changeRoomSlide(direction) {
    const slides = document.querySelectorAll('.room-slide');
    if (!slides.length) return;
    let current = Array.from(slides).findIndex(s => s.classList.contains('active'));
    slides[current].classList.remove('active');
    const next = (current + direction + slides.length) % slides.length;
    slides[next].classList.add('active');
}