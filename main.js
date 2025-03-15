const loaderContainer = document.querySelector('.loader-container');
const progressBar = document.querySelector('.progress');
const introContainer = document.getElementById('intro-container');
const mainContent = document.querySelector('.main-content');
const enterBtn = document.querySelector('.enter-btn');
const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('.section');
const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
const contactForm = document.getElementById('contactForm');

// Assets to preload
const assetsToLoad = [
    { type: 'image', path: '/img/logo.png' },
    { type: 'image', path: '/img/background.jpg' },
    { type: 'image', path: '/img/texture1.jpg' },
    { type: 'image', path: '/img/texture2.jpg' },
    { type: 'model', path: '/models/can.glb' }
];

// Loading variables
let loadedItems = 0;
const totalItems = assetsToLoad.length || 10;
let isLoaded = false;
let loadingComplete = false;

// Cart state
let cart = {
    items: [],
    total: 0
};

// Initialize the website
document.addEventListener('DOMContentLoaded', () => {
    // Initialize theme toggle first to ensure proper theme is applied before animations
    setupThemeToggle();
    
    // Start the loading sequence
    startLoading();
    
    // Add event listeners
    setupEventListeners();
    
    // Listen for visibility changes to handle tab switching
    handleVisibilityChange();
});

// Start the loading process
function startLoading() {
    if (assetsToLoad.length === 0) {
        // If no assets are defined, use simulated loading
        simulateLoading();
    } else {
        // Load real assets
        loadAssets();
    }
}

// Load real assets
function loadAssets() {
    assetsToLoad.forEach(asset => {
        switch(asset.type) {
            case 'image':
                const img = new Image();
                img.onload = () => assetLoaded();
                img.onerror = () => assetLoaded(); // Still continue on error
                img.src = asset.path;
                break;
                
            case 'model':
                // In a real implementation, this would use a proper 3D model loader
                // For now, simulate loading with a timeout
                setTimeout(() => assetLoaded(), 500);
                break;
                
            default:
                // Unknown asset type, just count it as loaded
                assetLoaded();
        }
    });
}

// When an asset is loaded
function assetLoaded() {
    loadedItems++;
    const percentage = (loadedItems / totalItems) * 100;
    updateProgressBar(percentage);
    
    if (loadedItems >= totalItems) {
        onLoadingComplete();
    }
}

// Simulate loading for development
function simulateLoading() {
    const loadingInterval = setInterval(() => {
        loadedItems++;
        updateProgressBar(loadedItems / totalItems * 100);
        
        if (loadedItems >= totalItems) {
            clearInterval(loadingInterval);
            onLoadingComplete();
        }
    }, 200);
}

// Update the progress bar
function updateProgressBar(percentage) {
    // Ensure percentage is between 0 and 100
    percentage = Math.max(0, Math.min(100, percentage));
    progressBar.style.width = `${percentage}%`;
    
    // Add a smooth transition when close to completion
    if (percentage > 80) {
        progressBar.style.transition = 'width 0.5s ease-out';
    }
}

// Actions to take when loading is complete
function onLoadingComplete() {
    // Prevent double execution
    if (loadingComplete) return;
    loadingComplete = true;
    
    // Hide loader with a fade out effect
    loaderContainer.style.opacity = '0';
    loaderContainer.style.transition = 'opacity 0.5s ease';
    
    setTimeout(() => {
        loaderContainer.style.display = 'none';
        isLoaded = true;
        
        // Start the intro animation
        // animation.js will handle the 3D animation
    }, 500);
}

// Setup event listeners
function setupEventListeners() {
    // Enter site button
    enterBtn.addEventListener('click', enterSite);
    
    // Allow keyboard navigation as well
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Enter' || e.code === 'Space') {
            enterBtn.click();
        }
    });
    
    // Add navigation event listeners
    navLinks.forEach(link => {
        link.addEventListener('click', handleNavigation);
    });
    
    // Mobile menu toggle
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', toggleMobileMenu);
    }
    
    // Contact form submission
    if (contactForm) {
        contactForm.addEventListener('submit', handleFormSubmit);
    }
    
    // Add scroll animations
    window.addEventListener('scroll', debounce(handleScroll, 50));
    
    // Add store button listeners
    setupStoreButtons();
    
    // Add product detail button listeners
    setupProductButtons();
}

// Enter site event handler
function enterSite() {
    // Check if animation is loaded first
    if (!isLoaded) {
        console.warn('Trying to enter site before loading is complete');
        return;
    }
    
    // Add a class to animate the transition
    introContainer.classList.add('fade-out');
    
    // Fade out intro animation
    introContainer.style.opacity = '0';
    introContainer.style.transition = 'opacity 1s ease';
    
    // Show main content
    setTimeout(() => {
        introContainer.style.display = 'none';
        mainContent.classList.remove('hidden');
        mainContent.classList.add('fade-in');
        
        // Set the hero section as active
        setActiveSection('hero');
        
        // Animate main content elements
        animateMainContent();
        
        // Update URL without refreshing the page
        history.pushState({page: 'main'}, 'Black Simba Energy', '#main');
    }, 1000);
}

// Handle navigation
function handleNavigation(e) {
    e.preventDefault();
    
    // Get the target section ID
    const targetId = e.currentTarget.getAttribute('href').substring(1);
    
    // Set the active section
    setActiveSection(targetId);
    
    // Close mobile menu if open
    const navList = document.querySelector('nav ul');
    if (navList.classList.contains('active')) {
        toggleMobileMenu();
    }
    
    // Update URL
    history.pushState({page: targetId}, '', `#${targetId}`);
}

// Set active section
function setActiveSection(sectionId) {
    // Remove active class from all sections
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Add active class to target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        
        // Scroll to top of section
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
        
        // Animate elements in the section
        animateSectionElements(targetSection);
    }
    
    // Update active nav link
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${sectionId}`) {
            link.classList.add('active');
        }
    });
}

// Toggle mobile menu
function toggleMobileMenu() {
    const navList = document.querySelector('nav ul');
    navList.classList.toggle('active');
    
    // Toggle icon
    const icon = mobileMenuToggle.querySelector('i');
    if (icon) {
        if (navList.classList.contains('active')) {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-times');
        } else {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        }
    }
}

// Handle form submission
function handleFormSubmit(e) {
    e.preventDefault();
    
    // Get form data
    const formData = new FormData(contactForm);
    const formValues = Object.fromEntries(formData.entries());
    
    // In a real application, you would send this data to a server
    console.log('Form submitted:', formValues);
    
    // Show success message
    const successMessage = document.createElement('div');
    successMessage.className = 'success-message';
    successMessage.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <p>Thank you for your message! We'll get back to you soon.</p>
    `;
    
    // Replace form with success message
    contactForm.innerHTML = '';
    contactForm.appendChild(successMessage);
    
    // Reset form after 5 seconds
    setTimeout(() => {
        contactForm.innerHTML = `
            <div class="form-group">
                <label for="name">NAME</label>
                <input type="text" id="name" name="name" required>
            </div>
            <div class="form-group">
                <label for="email">EMAIL</label>
                <input type="email" id="email" name="email" required>
            </div>
            <div class="form-group">
                <label for="subject">SUBJECT</label>
                <select id="subject" name="subject">
                    <option value="general">General Inquiry</option>
                    <option value="order">Order Support</option>
                    <option value="wholesale">Wholesale</option>
                    <option value="press">Press</option>
                </select>
            </div>
            <div class="form-group">
                <label for="message">MESSAGE</label>
                <textarea id="message" name="message" rows="5" required></textarea>
            </div>
            <button type="submit" class="btn primary-btn">SEND MESSAGE</button>
        `;
        
        // Re-add event listener
        contactForm.addEventListener('submit', handleFormSubmit);
    }, 5000);
}

// Animate main content elements
function animateMainContent() {
    // Get all animatable elements
    const elements = document.querySelectorAll('.main-content h1, .main-content p, .main-content .product-item');
    
    // Add staggered animation to each element
    elements.forEach((el, index) => {
        setTimeout(() => {
            el.classList.add('fade-in');
        }, index * 100); // Staggered delay
    });
}

// Animate section elements
function animateSectionElements(section) {
    // Get all animatable elements in the section
    const elements = section.querySelectorAll('.slide-up, .slide-down, .fade-in');
    
    // Reset animations
    elements.forEach(el => {
        el.style.opacity = '0';
    });
    
    // Add staggered animation to each element
    elements.forEach((el, index) => {
        setTimeout(() => {
            el.style.opacity = '1';
        }, index * 100 + 100); // Staggered delay
    });
}

// Handle scroll animations
function handleScroll() {
    // Get all animatable elements
    const elements = document.querySelectorAll('.animate-on-scroll');
    
    elements.forEach(el => {
        const elementTop = el.getBoundingClientRect().top;
        const elementVisible = 150;
        
        if (elementTop < window.innerHeight - elementVisible) {
            el.classList.add('active');
        }
    });
}

// Handle tab visibility changes to improve performance
function handleVisibilityChange() {
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // Pause animations or heavy processes when tab is not visible
            console.log('Tab hidden, pausing heavy animations');
        } else {
            // Resume when tab becomes visible again
            console.log('Tab visible, resuming animations');
        }
    });
}

// Handle window resize
window.addEventListener('resize', debounce(() => {
    // Update any size-dependent elements
    console.log('Window resized, updating layout');
}, 250));

// Utility function to debounce events
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// Handle browser back/forward navigation
window.addEventListener('popstate', (e) => {
    if (e.state && e.state.page) {
        setActiveSection(e.state.page);
    } else {
        // Default to hero section
        setActiveSection('hero');
    }
});

// Theme toggle functionality
function setupThemeToggle() {
    const themeSwitch = document.getElementById('theme-switch');
    
    // Check if theme switch exists before proceeding
    if (!themeSwitch) {
        console.error('Theme switch element not found');
        return;
    }
    
    const body = document.body;
    
    // Apply saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        body.classList.add('light-theme');
        themeSwitch.checked = true;
        updateThemeColors(true);
        // Dispatch theme event for other scripts
        document.dispatchEvent(new CustomEvent('themeChanged', { detail: { isLightTheme: true } }));
    }
    
    // Toggle theme when switch is clicked
    themeSwitch.addEventListener('change', function() {
        if (this.checked) {
            body.classList.add('light-theme');
            localStorage.setItem('theme', 'light');
        } else {
            body.classList.remove('light-theme');
            localStorage.setItem('theme', 'dark');
        }
        updateThemeColors(this.checked);
        
        // Dispatch custom event for other scripts to listen to
        document.dispatchEvent(new CustomEvent('themeChanged', { detail: { isLightTheme: this.checked } }));
    });
}

// Update colors in 3D scenes based on theme
function updateThemeColors(isLightTheme) {
    // Update scene background color if animation.js is loaded
    if (typeof scene !== 'undefined') {
        const bgColor = isLightTheme ? 0xf5f5f5 : 0x0F0E0C;
        scene.background = new THREE.Color(bgColor);
        if (scene.fog) {
            scene.fog = new THREE.FogExp2(bgColor, 0.002);
        }
    }
}

// Setup store buttons
function setupStoreButtons() {
    const storeButtons = document.querySelectorAll('.store-card .btn');
    storeButtons.forEach(button => {
        button.addEventListener('click', handleStoreButtonClick);
    });
}

// Setup product buttons
function setupProductButtons() {
    const productButtons = document.querySelectorAll('.product-card .btn');
    productButtons.forEach(button => {
        button.addEventListener('click', handleProductButtonClick);
    });
}

// Handle store button clicks
function handleStoreButtonClick(e) {
    e.preventDefault();
    const card = e.target.closest('.store-card');
    const product = {
        name: card.querySelector('h3').textContent,
        price: parseFloat(card.querySelector('p').textContent.replace('$', ''))
    };
    
    // Add to cart
    addToCart(product);
    
    // Show success message
    showNotification(`Added ${product.name} to cart!`);
}

// Handle product button clicks
function handleProductButtonClick(e) {
    e.preventDefault();
    const card = e.target.closest('.product-card');
    const product = {
        name: card.querySelector('h3').textContent,
        description: card.querySelector('p').textContent
    };
    
    // Show product details modal
    showProductModal(product);
}

// Add item to cart
function addToCart(product) {
    cart.items.push(product);
    cart.total += product.price;
    
    // Update cart UI if it exists
    updateCartUI();
}

// Update cart UI
function updateCartUI() {
    const cartCount = document.querySelector('.cart-count');
    if (cartCount) {
        cartCount.textContent = cart.items.length;
    }
}

// Show notification
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <p>${message}</p>
    `;
    
    document.body.appendChild(notification);
    
    // Fade in
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Show product modal
function showProductModal(product) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            <h2>${product.name}</h2>
            <p>${product.description}</p>
            <div class="product-details">
                <div class="nutrition-info">
                    <h3>Nutrition Facts</h3>
                    <ul>
                        <li>Energy: 50 kcal</li>
                        <li>Caffeine: 30mg</li>
                        <li>Taurine: 400mg</li>
                        <li>B-Vitamins: B3, B6, B12</li>
                    </ul>
                </div>
                <button class="btn primary-btn">ADD TO CART - &#8377;80</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners
    const closeBtn = modal.querySelector('.close-modal');
    const addToCartBtn = modal.querySelector('.primary-btn');
    
    closeBtn.addEventListener('click', () => {
        modal.classList.add('fade-out');
        setTimeout(() => modal.remove(), 300);
    });
    
    addToCartBtn.addEventListener('click', () => {
        addToCart({
            name: product.name,
            price: 3.99
        });
        showNotification(`Added ${product.name} to cart!`);
        modal.classList.add('fade-out');
        setTimeout(() => modal.remove(), 300);
    });
    
    // Show modal with animation
    setTimeout(() => modal.classList.add('show'), 100);
}

// Export functions that might be needed by other scripts
export { updateProgressBar, onLoadingComplete };