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
    
    // Add theme change listener
    const themeSwitch = document.getElementById('theme-switch');
    if (themeSwitch) {
        themeSwitch.addEventListener('change', function() {
            updateSceneForTheme(this.checked);
        });
    }
});

// Initialize the scene
function init() {
    const canContainer = document.getElementById('can-container');
    
    // Create scene with theme-aware background
    scene = new THREE.Scene();
    const isLightTheme = document.body.classList.contains('light-theme');
    scene.background = new THREE.Color(isLightTheme ? 0xf5f5f5 : 0x0F0E0C);

    // Create camera
    camera = new THREE.PerspectiveCamera(45, canContainer.clientWidth / canContainer.clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 5);

    // Create renderer with enhanced settings
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
    });
    renderer.setSize(canContainer.clientWidth, canContainer.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    canContainer.appendChild(renderer.domElement);

    // Setup controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;

    // Load environment map for reflections
    const envMapLoader = new THREE.TextureLoader();
    const envMap = envMapLoader.load('textures/studio_hdri.hdr', function(texture) {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = texture;
    });

    addLights();
    createCanModel();
    setupScrollAnimations();

    window.addEventListener('resize', onWindowResize);
    document.addEventListener('mousemove', onMouseMove);

    animate();
}

// Add lights to the scene
function addLights() {
    // Main directional light (simulates key light)
    const mainLight = new THREE.DirectionalLight(0xe65b07, 2.0);
    mainLight.position.set(5, 5, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 30;
    mainLight.shadow.bias = -0.001;
    scene.add(mainLight);

    // Fill light (opposite of main light)
    const fillLight = new THREE.DirectionalLight(0xb34605, 1.2);
    fillLight.position.set(-5, 0, -5);
    scene.add(fillLight);

    // Ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0x404040, 0.7);
    scene.add(ambientLight);
    
    // Add a spotlight to highlight the can
    const spotlight = new THREE.SpotLight(0xffffff, 1.5, 20, Math.PI / 6, 0.5);
    spotlight.position.set(0, 5, 5);
    spotlight.castShadow = true;
    spotlight.shadow.mapSize.width = 1024;
    spotlight.shadow.mapSize.height = 1024;
    scene.add(spotlight);
    
    // Add a rim light to enhance edges
    const rimLight = new THREE.PointLight(0xffffff, 1.0, 10);
    rimLight.position.set(-3, 0, -3);
    scene.add(rimLight);
}

// Create a 3D can model
function createCanModel() {
    // Create a group to hold all can parts
    canModel = new THREE.Group();
    
    // Create a texture loader
    const textureLoader = new THREE.TextureLoader();
    
    // Load the can texture image with enhanced settings
    const canTexture = textureLoader.load('img/WhatsApp Image 2025-03-11 at 11.24.46 AM.jpeg', function(texture) {
        // Enhance texture settings
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
    });
    
    // Create a normal map from the texture for added detail
    const normalMap = textureLoader.load('img/WhatsApp Image 2025-03-11 at 11.24.46 AM.jpeg', function(texture) {
        // Convert the texture to a normal map effect
        const canvas = document.createElement('canvas');
        const width = texture.image.width;
        const height = texture.image.height;
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        context.drawImage(texture.image, 0, 0);
        
        // Simple normal map generation
        const imgData = context.getImageData(0, 0, width, height);
        const normalData = context.createImageData(width, height);
        
        for (let i = 0; i < imgData.data.length; i += 4) {
            // Create a simple emboss effect for the normal map
            normalData.data[i] = 128; // R
            normalData.data[i+1] = 128; // G
            normalData.data[i+2] = 255; // B - pointing outward
            normalData.data[i+3] = imgData.data[i+3]; // Alpha
        }
        
        context.putImageData(normalData, 0, 0);
        texture.image = canvas;
        texture.needsUpdate = true;
    });
    
    // Improve texture wrapping
    canTexture.wrapS = THREE.RepeatWrapping;
    canTexture.repeat.set(1, 1);
    
    // Create the main can body with higher definition
    const bodyGeometry = new THREE.CylinderGeometry(0.8, 0.8, 2.5, 64, 32, true);
    const bodyMaterial = new THREE.MeshPhysicalMaterial({
        map: canTexture,
        normalMap: normalMap,
        normalScale: new THREE.Vector2(0.15, 0.15),
        metalness: 0.6,
        roughness: 0.2,
        clearcoat: 0.5,
        clearcoatRoughness: 0.3,
        reflectivity: 0.5,
        envMapIntensity: 1.0,
        emissive: 0x333333,
        emissiveMap: canTexture,
        emissiveIntensity: 0.2,
    });
    
    // Adjust UV mapping for better texture alignment
    const uvAttribute = bodyGeometry.attributes.uv;
    for (let i = 0; i < uvAttribute.count; i++) {
        const u = uvAttribute.getX(i);
        const v = uvAttribute.getY(i);
        
        // Adjust the U coordinate to center the texture on the front of the can
        uvAttribute.setX(i, (u + 0.25) % 1);
    }
    uvAttribute.needsUpdate = true;
    
    const canBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
    canBody.castShadow = true;
    canBody.receiveShadow = true;
    canModel.add(canBody);
    
    // Create the top lid with more detail
    const topGeometry = new THREE.CylinderGeometry(0.8, 0.8, 0.1, 64);
    const topMaterial = new THREE.MeshStandardMaterial({
        color: 0x888888,
        metalness: 0.9,
        roughness: 0.1,
        envMapIntensity: 1.0
    });
    const canTop = new THREE.Mesh(topGeometry, topMaterial);
    canTop.position.y = 1.25;
    canTop.castShadow = true;
    canTop.receiveShadow = true;
    canModel.add(canTop);
    
    // Add a more detailed pull tab
    const tabGroup = new THREE.Group();
    
    // Main tab part
    const tabGeometry = new THREE.BoxGeometry(0.3, 0.05, 0.2);
    const tabMaterial = new THREE.MeshStandardMaterial({
        color: 0xCCCCCC,
        metalness: 1.0,
        roughness: 0.2,
        envMapIntensity: 1.0
    });
    const pullTab = new THREE.Mesh(tabGeometry, tabMaterial);
    tabGroup.add(pullTab);
    
    // Tab ring
    const ringGeometry = new THREE.TorusGeometry(0.1, 0.02, 16, 32);
    const ring = new THREE.Mesh(ringGeometry, tabMaterial);
    ring.position.z = -0.1;
    ring.rotation.x = Math.PI / 2;
    tabGroup.add(ring);
    
    tabGroup.position.set(0, 1.3, 0.4);
    canModel.add(tabGroup);
    
    // Add condensation droplets with enhanced appearance
    addCondensationEffect(canModel);
    
    // Position the entire can
    canModel.position.set(0, 0, 0);
    canModel.rotation.y = Math.PI / 4;
    
    // Add to scene
    scene.add(canModel);
    
    return canModel;
}

// Add condensation droplets to the can with enhanced appearance
function addCondensationEffect(model) {
    // Create droplet instances
    const dropletCount = 80; // Increased count for more detail
    const dropletGeometry = new THREE.SphereGeometry(0.02, 12, 12); // More segments
    const dropletMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.0,
        roughness: 0.1,
        transparent: true,
        opacity: 0.7,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        ior: 1.4, // Water-like refraction
        transmission: 0.9, // Glass-like transparency
        thickness: 0.01 // Thin water droplet
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
    
    // Add a few droplet trails
    for (let i = 0; i < 15; i++) {
        const trailCount = 3 + Math.floor(Math.random() * 5);
        const angle = Math.random() * Math.PI * 2;
        const startHeight = (Math.random() * 1.8 - 0.9);
        
        for (let j = 0; j < trailCount; j++) {
            const droplet = new THREE.Mesh(dropletGeometry, dropletMaterial);
            
            // Position in a trail
            droplet.position.set(
                0.82 * Math.cos(angle),
                startHeight - (j * 0.1),
                0.82 * Math.sin(angle)
            );
            
            // Decreasing scale down the trail
            const scale = (1.0 - j/trailCount) * (0.8 + Math.random() * 0.8);
            droplet.scale.set(scale, scale * 1.2, scale);
            
            // Add to model
            model.add(droplet);
        }
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

// Update scene based on theme
function updateSceneForTheme(isLightTheme) {
    if (!scene) return;
    
    const bgColor = isLightTheme ? 0xf5f5f5 : 0x0F0E0C;
    scene.background = new THREE.Color(bgColor);
    
    // Update lighting based on theme
    scene.children.forEach(child => {
        if (child.isDirectionalLight) {
            child.intensity = isLightTheme ? 1.8 : 2.0; // Adjusted for both themes
        }
        if (child.isAmbientLight) {
            child.intensity = isLightTheme ? 0.8 : 0.7; // Adjusted for both themes
        }
        if (child.isSpotLight) {
            child.intensity = isLightTheme ? 1.2 : 1.5; // Adjusted for both themes
        }
    });
    
    // Update renderer settings
    if (renderer) {
        renderer.toneMappingExposure = isLightTheme ? 1.2 : 1.5; // Increase exposure
    }
} 