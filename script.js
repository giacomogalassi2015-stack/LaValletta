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

const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

hamburger.addEventListener('click', () => {
    if (navLinks.style.display === 'flex') {
        navLinks.style.display = 'none';
        navLinks.style.position = 'static';
        navLinks.style.backgroundColor = 'transparent';
    } else {
        navLinks.style.display = 'flex';
        navLinks.style.flexDirection = 'column';
        navLinks.style.position = 'absolute';
        navLinks.style.top = '80px';
        navLinks.style.left = '0';
        navLinks.style.width = '100%';
        navLinks.style.backgroundColor = 'var(--primary)';
        navLinks.style.padding = '20px';
        navLinks.style.textAlign = 'center';
    }
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