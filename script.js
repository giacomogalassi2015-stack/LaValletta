/* ============================================================
   SCRIPT.JS - VERSIONE BLINDATA
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

    /* --- 1. INIZIALIZZAZIONE ANIMAZIONI (AOS) --- */
    // Avviamo le animazioni solo quando il sito è pronto
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
        if (!navbar) return; // Protezione se la navbar non viene trovata
        
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }

    // Ascolta lo scroll
    window.addEventListener('scroll', handleScroll);
    
    // ESEGUE SUBITO LA FUNZIONE: 
    // Fondamentale per far apparire la barra corretta appena si apre il sito
    handleScroll();


    /* --- 3. MENU MOBILE --- */
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    const body = document.body;

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            // Apre/Chiude il menu
            navLinks.classList.toggle('active');
            
            // Gestione Icona (Barre <-> X)
            const icon = hamburger.querySelector('i');
            if (icon) {
                if (navLinks.classList.contains('active')) {
                    icon.classList.remove('fa-bars');
                    icon.classList.add('fa-times');
                    body.style.overflow = 'hidden'; // Blocca lo scroll del sito quando il menu è aperto
                } else {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                    body.style.overflow = 'auto'; // Riattiva lo scroll
                }
            }
        });

        // Chiude il menu quando si clicca su un link
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                body.style.overflow = 'auto';
                
                // Resetta l'icona
                const icon = hamburger.querySelector('i');
                if(icon) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            });
        });
    }


    /* --- 4. SLIDER HOME PAGE (Manuale con Frecce) --- */
    const homeSliders = document.querySelectorAll('.slider-container');

    homeSliders.forEach(slider => {
        const slides = slider.querySelectorAll('.slide');
        const nextBtn = slider.querySelector('.next-btn');
        const prevBtn = slider.querySelector('.prev-btn');
        let currentSlideIdx = 0; 

        // Se non ci sono slide in questo contenitore, passa al prossimo
        if (slides.length === 0) return;

        function showSlide(index) {
            // Rimuove la classe active da tutte le slide
            slides.forEach(slide => slide.classList.remove('active'));
            
            // Calcola l'indice corretto (loop infinito)
            if (index >= slides.length) currentSlideIdx = 0;
            else if (index < 0) currentSlideIdx = slides.length - 1;
            else currentSlideIdx = index;
            
            // Attiva la slide giusta
            slides[currentSlideIdx].classList.add('active');
        }

        if(nextBtn) {
            nextBtn.addEventListener('click', (e) => {
                e.preventDefault(); // Evita che la pagina salti in alto
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
    // Logica specifica per le pagine interne (King/Deluxe)
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

        // Rendiamo questa funzione disponibile globalmente per le frecce HTML (onclick="...")
        window.changeRoomSlide = function(n) {
            clearInterval(roomInterval); // Ferma il timer automatico se l'utente clicca
            roomInterval = setInterval(nextRoomSlide, 5000); // Riavvia il timer
            showRoomSlides(roomSlideIndex += n);
        };

        // Avvio iniziale
        showRoomSlides(roomSlideIndex);
        roomInterval = setInterval(nextRoomSlide, 5000);
    }

}); // FINE DOMContentLoaded