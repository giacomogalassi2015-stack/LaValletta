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