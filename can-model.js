import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

// Scene variables
let scene, camera, renderer, canModel, controls;
let mouseX = 0, mouseY = 0;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create container if it doesn't exist
    if (!document.getElementById('can-container')) {
        const container = document.createElement('div');
        container.id = 'can-container';
        container.className = 'can-model-container';
        
        // Insert after the hero section
        const heroSection = document.getElementById('hero');
        if (heroSection) {
            heroSection.appendChild(container);
        } else {
            document.body.appendChild(container);
        }
    }
    
    // Initialize 3D scene
    init();
});

// Initialize the scene
function init() {
    const canContainer = document.getElementById('can-container');
    
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0F0E0C); // Using the dark color palette

    // Create camera
    camera = new THREE.PerspectiveCamera(45, canContainer.clientWidth / canContainer.clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 5);

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(canContainer.clientWidth, canContainer.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    canContainer.appendChild(renderer.domElement);

    // Add controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;

    // Add lights
    addLights();

    // Create can model
    createCanModel();

    // Setup scroll animations
    setupScrollAnimations();

    // Add window event listeners
    window.addEventListener('resize', onWindowResize);
    document.addEventListener('mousemove', onMouseMove);

    // Start animation loop
    animate();
}

// Add lights to the scene
function addLights() {
    // Main directional light (simulates key light)
    const mainLight = new THREE.DirectionalLight(0xD4AF37, 1.5); // Gold color
    mainLight.position.set(5, 5, 5);
    scene.add(mainLight);

    // Fill light (opposite of main light)
    const fillLight = new THREE.DirectionalLight(0x8A6E2F, 0.8); // Darker gold
    fillLight.position.set(-5, 0, -5);
    scene.add(fillLight);

    // Ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);
}

// Create a 3D can model
function createCanModel() {
    // Create a group to hold all can parts
    canModel = new THREE.Group();
    
    // Create the main can body
    const bodyGeometry = new THREE.CylinderGeometry(0.8, 0.8, 2.5, 32);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x110F0E, // Very dark gray/black
        metalness: 0.9,
        roughness: 0.1
    });
    const canBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
    canModel.add(canBody);
    
    // Create the top lid
    const topGeometry = new THREE.CylinderGeometry(0.8, 0.8, 0.1, 32);
    const topMaterial = new THREE.MeshStandardMaterial({
        color: 0x131210, // Soft black
        metalness: 0.8,
        roughness: 0.2
    });
    const canTop = new THREE.Mesh(topGeometry, topMaterial);
    canTop.position.y = 1.25;
    canModel.add(canTop);
    
    // Create the pull tab
    const tabGeometry = new THREE.BoxGeometry(0.3, 0.05, 0.2);
    const tabMaterial = new THREE.MeshStandardMaterial({
        color: 0xD4AF37, // Gold color
        metalness: 1.0,
        roughness: 0.2
    });
    const pullTab = new THREE.Mesh(tabGeometry, tabMaterial);
    pullTab.position.set(0, 1.3, 0.4);
    canModel.add(pullTab);
    
    // Create a simple logo (just a plane with texture)
    const logoGeometry = new THREE.PlaneGeometry(1.5, 1);
    const logoMaterial = new THREE.MeshStandardMaterial({
        color: 0xD4AF37, // Gold color
        metalness: 0.8,
        roughness: 0.2,
        side: THREE.DoubleSide
    });
    const logo = new THREE.Mesh(logoGeometry, logoMaterial);
    logo.position.set(0, 0, 0.85);
    logo.rotation.y = Math.PI;
    canModel.add(logo);
    
    // Add condensation droplets
    addCondensationEffect(canModel);
    
    // Position the entire can
    canModel.position.set(0, 0, 0);
    canModel.rotation.y = Math.PI / 4;
    
    // Add to scene
    scene.add(canModel);
    
    return canModel;
}

// Add condensation droplets to the can
function addCondensationEffect(model) {
    // Create droplet instances
    const dropletCount = 50;
    const dropletGeometry = new THREE.SphereGeometry(0.02, 8, 8);
    const dropletMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 0.0,
        roughness: 0.1,
        transparent: true,
        opacity: 0.7
    });
    
    // Create individual droplets
    for (let i = 0; i < dropletCount; i++) {
        const droplet = new THREE.Mesh(dropletGeometry, dropletMaterial);
        
        // Random position on cylinder surface
        const angle = Math.random() * Math.PI * 2;
        const height = (Math.random() * 2 - 1) * 1.2;
        
        // Position on cylinder surface
        droplet.position.set(
            0.82 * Math.cos(angle),
            height,
            0.82 * Math.sin(angle)
        );
        
        // Random scale for variety
        const scale = 0.5 + Math.random() * 1.5;
        droplet.scale.set(scale, scale, scale);
        
        // Add to model
        model.add(droplet);
    }
}

// Setup scroll-based animations
function setupScrollAnimations() {
    // Rotate can based on scroll position
    ScrollTrigger.create({
        trigger: '#can-container',
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
        onUpdate: (self) => {
            if (canModel) {
                // Full 360° rotation based on scroll progress
                canModel.rotation.y = Math.PI / 4 + (self.progress * Math.PI * 2);
                
                // Tilt effect
                canModel.rotation.x = Math.sin(self.progress * Math.PI) * 0.2;
                
                // Subtle float animation
                canModel.position.y = Math.sin(self.progress * Math.PI * 4) * 0.1;
            }
        }
    });
    
    // Scale effect when scrolling to the products section
    ScrollTrigger.create({
        trigger: '#products',
        start: 'top bottom',
        end: 'center center',
        scrub: true,
        onUpdate: (self) => {
            if (canModel) {
                // Scale up slightly when in view
                const scale = 1 + (self.progress * 0.2);
                canModel.scale.set(scale, scale, scale);
            }
        }
    });
}

// Handle mouse movement for interactive rotation
function onMouseMove(event) {
    // Calculate normalized mouse position (-1 to 1)
    mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    mouseY = (event.clientY / window.innerHeight) * 2 - 1;
}

// Update can rotation based on mouse position
function updateCanRotation() {
    if (canModel) {
        // Subtle rotation based on mouse position
        canModel.rotation.y += (mouseX * 0.01 - canModel.rotation.y * 0.1) * 0.05;
        canModel.rotation.x += (mouseY * 0.01 - canModel.rotation.x * 0.1) * 0.05;
    }
}

// Handle window resize
function onWindowResize() {
    const canContainer = document.getElementById('can-container');
    camera.aspect = canContainer.clientWidth / canContainer.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canContainer.clientWidth, canContainer.clientHeight);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Update controls
    controls.update();
    
    // Update can rotation based on mouse
    updateCanRotation();
    
    // Render scene
    renderer.render(scene, camera);
} 