AOS.init({
    once: true, 
    offset: 100 
});

const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Menu Mobile Moderno
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');
const body = document.body;

hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    
    // Cambia l'icona da "barre" a "X" quando è aperto
    const icon = hamburger.querySelector('i');
    icon.classList.toggle('fa-bars');
    icon.classList.toggle('fa-times');

    // Blocca lo scroll del body quando il menu è aperto
    if (navLinks.classList.contains('active')) {
        body.style.overflow = 'hidden';
    } else {
        body.style.overflow = 'auto';
    }
});

// Chiudi il menu quando si clicca su un link
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        body.style.overflow = 'auto';
        hamburger.querySelector('i').classList.add('fa-bars');
        hamburger.querySelector('i').classList.remove('fa-times');
    });
});

// --- GESTIONE SLIDER CAMERE ---

const sliders = document.querySelectorAll('.slider-container');

sliders.forEach(slider => {
    const slides = slider.querySelectorAll('.slide');
    const nextBtn = slider.querySelector('.next-btn');
    const prevBtn = slider.querySelector('.prev-btn');
    let currentSlideIdx = 0; 

    function showSlide(index) {
       
        slides.forEach(slide => slide.classList.remove('active'));
        
        if (index >= slides.length) {
            currentSlideIdx = 0;
        } else if (index < 0) {
            currentSlideIdx = slides.length - 1;
        } else {
            currentSlideIdx = index;
        }
        slides[currentSlideIdx].classList.add('active');
    }

    nextBtn.addEventListener('click', () => {
        showSlide(currentSlideIdx + 1);
    });

    prevBtn.addEventListener('click', () => {
        showSlide(currentSlideIdx - 1);
    });
});
