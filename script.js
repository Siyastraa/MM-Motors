// ===== DOM Elements (null-safe for multi-page) =====
const navbar = document.getElementById('navbar');
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
const searchInput = document.getElementById('searchInput');
const modalOverlay = document.getElementById('modalOverlay');
const modalClose = document.getElementById('modalClose');
const contactForm = document.getElementById('contactForm');

// ===== Vehicle Data =====
const vehicles = [
    { id: 'car-1', name: '2024 Executive Sedan', tags: 'Luxury · Comfort · Performance', price: '$95,000', image: 'images/car-sedan.png', engine: '3.0L V6', fuel: 'Hybrid', hp: '430 hp', description: 'The 2024 Executive Sedan is the epitome of modern luxury. Featuring a 3.0L V6 hybrid powertrain producing 430 horsepower, adaptive air suspension, and a hand-stitched leather interior.' },
    { id: 'car-2', name: '2024 Luxury Explorer', tags: 'All-Terrain · Spacious · Sleek', price: '$72,000', image: 'images/car-suv.png', engine: 'V6 Twin', fuel: 'Petrol', hp: '380 hp', description: 'Combining rugged capability with refined luxury, the 2024 Luxury Explorer tackles any terrain while pampering its passengers with a twin-turbocharged V6 and adaptive 4WD system.' },
    { id: 'car-3', name: '2024 Sport GT', tags: 'Aerodynamic · Fast · Precise', price: '$89,000', image: 'images/car-sports.png', engine: '4.0L V8', fuel: 'Petrol', hp: '620 hp', description: 'Built for those who demand the ultimate driving experience. The 2024 Sport GT delivers 620 hp from its naturally aspirated 4.0L V8 with a lightning-fast 7-speed dual-clutch transmission.' },
    { id: 'car-4', name: '2024 Grand Touring', tags: 'Elegant · Smooth · Refined', price: '$115,000', image: 'images/hero-car.png', engine: '4.0L V8', fuel: 'Petrol', hp: '503 hp', description: 'The Grand Touring is the ultimate expression of luxury performance. A 4.0L V8 delivering 503 hp is paired with a silky 8-speed automatic for effortless long-distance cruising.' },
    { id: 'car-5', name: '2024 Prestige SUV', tags: 'Family · Premium · Versatile', price: '$68,500', image: 'images/car-suv.png', engine: '2.5L I4', fuel: 'Hybrid', hp: '295 hp', description: 'The Prestige SUV offers the perfect blend of family-friendly versatility and premium appointments. Its hybrid powertrain delivers outstanding efficiency without compromising on performance.' },
    { id: 'car-6', name: '2024 Apex Roadster', tags: 'Track · Convertible · Thrilling', price: '$142,000', image: 'images/car-sports.png', engine: '5.0L V10', fuel: 'Petrol', hp: '780 hp', description: 'A limited-edition masterpiece. The Apex Roadster features an earth-shattering 5.0L V10 producing 780 hp, with a retractable hardtop and race-bred suspension for the ultimate open-air experience.' }
];

// ===== Navbar Scroll Effect =====
if (navbar) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 60) {
            navbar.classList.add('scrolled');
        } else {
            // Only remove on index page (where hero exists)
            if (document.querySelector('.hero')) {
                navbar.classList.remove('scrolled');
            }
        }
    });
}

// ===== Hamburger Menu =====
if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navLinks.classList.toggle('open');
        document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
    });

    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navLinks.classList.remove('open');
            document.body.style.overflow = '';
        });
    });
}

// ===== Scroll Animations =====
const observerOptions = { root: null, rootMargin: '0px 0px -60px 0px', threshold: 0.1 };

const scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const siblings = entry.target.parentElement.querySelectorAll('.animate-on-scroll');
            let delay = 0;
            siblings.forEach((sibling, i) => {
                if (sibling === entry.target) delay = i * 80;
            });
            setTimeout(() => entry.target.classList.add('visible'), Math.min(delay, 400));
            scrollObserver.unobserve(entry.target);
        }
    });
}, observerOptions);

document.querySelectorAll('.animate-on-scroll').forEach(el => scrollObserver.observe(el));

// ===== Vehicle Modal =====
function openModal(vehicleId) {
    if (!modalOverlay) return;
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return;

    document.getElementById('modalImage').src = vehicle.image;
    document.getElementById('modalImage').alt = vehicle.name;
    document.getElementById('modalTitle').textContent = vehicle.name;
    document.getElementById('modalTags').textContent = vehicle.tags;
    document.getElementById('modalPrice').textContent = vehicle.price;
    document.getElementById('modalDescription').textContent = vehicle.description;

    document.getElementById('modalSpecs').innerHTML = `
        <div class="modal-spec-item"><div class="modal-spec-label">Engine</div><div class="modal-spec-value">${vehicle.engine}</div></div>
        <div class="modal-spec-item"><div class="modal-spec-label">Fuel</div><div class="modal-spec-value">${vehicle.fuel}</div></div>
        <div class="modal-spec-item"><div class="modal-spec-label">Horsepower</div><div class="modal-spec-value">${vehicle.hp}</div></div>
    `;

    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    if (!modalOverlay) return;
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

if (modalClose) modalClose.addEventListener('click', closeModal);
if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });
}
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay && modalOverlay.classList.contains('active')) closeModal();
});

// ===== Car Card Click Handlers =====
document.querySelectorAll('.car-card').forEach(card => {
    card.addEventListener('click', (e) => {
        if (e.target.closest('a') || e.target.closest('button')) return;
        openModal(card.id);
    });
});

// ===== Category Filter (Inventory Page) =====
const filterBtns = document.querySelectorAll('.filter-btn');
if (filterBtns.length > 0) {
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.dataset.filter;
            document.querySelectorAll('.car-card').forEach(card => {
                if (filter === 'all' || card.dataset.category === filter) {
                    card.style.display = '';
                    card.style.opacity = '1';
                    card.style.transform = '';
                } else {
                    card.style.opacity = '0';
                    card.style.transform = 'scale(0.95)';
                    setTimeout(() => {
                        if (!card.dataset.category.includes(document.querySelector('.filter-btn.active')?.dataset.filter) &&
                            document.querySelector('.filter-btn.active')?.dataset.filter !== 'all') {
                            card.style.display = 'none';
                        }
                    }, 300);
                }
            });
        });
    });
}

// ===== Global Search & Filtering =====
function filterCars(queryText) {
    const query = queryText.toLowerCase().trim();
    const cards = document.querySelectorAll('.car-card');
    if (cards.length === 0) return;

    cards.forEach(card => {
        const name = card.querySelector('.car-name')?.textContent.toLowerCase() || '';
        const tags = card.querySelector('.car-tags')?.textContent.toLowerCase() || '';
        const price = card.querySelector('.car-price')?.textContent.toLowerCase() || '';
        if (!query || name.includes(query) || tags.includes(query) || price.includes(query)) {
            card.style.display = '';
            card.style.opacity = '1';
            card.style.transform = '';
        } else {
            card.style.display = 'none';
        }
    });
}

if (searchInput) {
    // Check for search query on load
    const urlParams = new URLSearchParams(window.location.search);
    const initialQuery = urlParams.get('search');
    
    if (initialQuery) {
        searchInput.value = initialQuery;
        setTimeout(() => filterCars(initialQuery), 100);
    }

    // Handle Enter key for navigation
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const query = searchInput.value.trim();
            if (query && !window.location.pathname.includes('inventory.html')) {
                window.location.href = `inventory.html?search=${encodeURIComponent(query)}`;
            }
        }
    });

    // Real-time filtering on pages with cars
    searchInput.addEventListener('input', (e) => {
        if (window.location.pathname.includes('inventory.html') || document.querySelectorAll('.car-card').length > 0) {
             filterCars(e.target.value);
        }
    });
}

// ===== Contact Form =====
if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.textContent = 'Sending...';
            submitBtn.disabled = true;
        }
        setTimeout(() => {
            contactForm.innerHTML = `
                <div class="form-success">
                    <div class="success-icon">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                            <polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                    </div>
                    <h3>Message Sent Successfully!</h3>
                    <p>We'll get back to you within the hour during business hours.</p>
                </div>
            `;
        }, 1500);
    });
}
