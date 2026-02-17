/* --- INIZIALIZZAZIONE ANIMAZIONI (AOS) --- */
AOS.init({
    once: true, 
    offset: 100 
});

/* --- GESTIONE NAVBAR (FIX DEFINITIVO) --- */
const navbar = document.getElementById('navbar');

function handleScroll() {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
}

// 1. Ascolta lo scroll
window.addEventListener('scroll', handleScroll);

// 2. CONTROLLO IMMEDIATO (Per risolvere il problema "invisibile al caricamento")
document.addEventListener('DOMContentLoaded', handleScroll);
window.onload = handleScroll; // Doppia sicurezza dopo il caricamento foto

/* --- MENU MOBILE --- */
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');
const body = document.body;

if (hamburger) {
    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        
        const icon = hamburger.querySelector('i');
        if (icon) {
            if (navLinks.classList.contains('active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
                body.style.overflow = 'hidden'; // Blocca scroll
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
                body.style.overflow = 'auto'; // Sblocca scroll
            }
        }
    });
}

// Chiudi menu al click sui link
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

/* --- SLIDER HOME PAGE (Manuale) --- */
const homeSliders = document.querySelectorAll('.slider-container');

homeSliders.forEach(slider => {
    const slides = slider.querySelectorAll('.slide');
    const nextBtn = slider.querySelector('.next-btn');
    const prevBtn = slider.querySelector('.prev-btn');
    let currentSlideIdx = 0; 

    function showSlide(index) {
        slides.forEach(slide => slide.classList.remove('active'));
        
        if (index >= slides.length) currentSlideIdx = 0;
        else if (index < 0) currentSlideIdx = slides.length - 1;
        else currentSlideIdx = index;
        
        slides[currentSlideIdx].classList.add('active');
    }

    if(nextBtn) nextBtn.addEventListener('click', () => showSlide(currentSlideIdx + 1));
    if(prevBtn) prevBtn.addEventListener('click', () => showSlide(currentSlideIdx - 1));
});

/* --- SLIDER DETTAGLIO CAMERA (Automatico 5s + Frecce) --- */
// Questo serve per le pagine King e Deluxe

let roomSlideIndex = 0;
let roomInterval;

// Funzione globale chiamata dalle frecce HTML (onclick="changeRoomSlide(...)")
window.changeRoomSlide = function(n) {
    // Resetta il timer se l'utente clicca
    clearInterval(roomInterval);
    roomInterval = setInterval(() => nextRoomSlide(), 5000);
    
    showRoomSlides(roomSlideIndex += n);
}

function nextRoomSlide() {
    showRoomSlides(roomSlideIndex += 1);
}

function showRoomSlides(n) {
    const slides = document.querySelectorAll(".room-slide");
    if (!slides || slides.length === 0) return;

    if (n >= slides.length) { roomSlideIndex = 0 }
    if (n < 0) { roomSlideIndex = slides.length - 1 }

    slides.forEach(slide => slide.classList.remove("active"));
    slides[roomSlideIndex].classList.add("active");
}

// Avvia lo slider automatico solo se esiste nella pagina
document.addEventListener("DOMContentLoaded", () => {
    const slides = document.querySelectorAll(".room-slide");
    if (slides.length > 0) {
        showRoomSlides(roomSlideIndex);
        roomInterval = setInterval(() => nextRoomSlide(), 5000);
    }
});