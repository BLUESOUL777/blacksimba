// Animation script for Black Simba Energy Drink website
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { onLoadingComplete } from './main.js';

let scene, camera, renderer, composer;
let clock = new THREE.Clock();
let mixer, particles = [], canModel, liquidParticles = [], logoGeometry;
let isLowPerformance = false;
let frameCount = 0, lastTime = 0, fps = 0;
const canvas = document.getElementById('intro-canvas');

// Initialize the animation
init();

// Listen for theme changes
document.addEventListener('DOMContentLoaded', () => {
    const themeSwitch = document.getElementById('theme-switch');
    if (themeSwitch) {
        themeSwitch.addEventListener('change', () => {
            updateAnimationForTheme(themeSwitch.checked);
        });
    }
});

// Update animation based on theme
function updateAnimationForTheme(isLightTheme) {
    if (!scene) return;
    
    // Update scene background and fog
    const bgColor = isLightTheme ? 0xf5f5f5 : 0x0F0E0C;
    scene.background = new THREE.Color(bgColor);
    if (scene.fog) {
        scene.fog = new THREE.FogExp2(bgColor, 0.002);
    }
    
    // Update lighting intensity
    scene.children.forEach(child => {
        if (child.isAmbientLight) {
            child.intensity = isLightTheme ? 0.7 : 0.5;
        }
    });
}

function init() {
    // Check device performance
    checkPerformance();
    
    // Create scene with theme-aware background
    scene = new THREE.Scene();
    const isLightTheme = document.body.classList.contains('light-theme');
    const bgColor = isLightTheme ? 0xf5f5f5 : 0x0F0E0C;
    scene.background = new THREE.Color(bgColor);
    scene.fog = new THREE.FogExp2(bgColor, 0.002);

    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);

    // Create renderer
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: !isLowPerformance,
        alpha: true,
        powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(isLowPerformance ? 1 : window.devicePixelRatio);
    renderer.shadowMap.enabled = !isLowPerformance;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // NOTE: THREE.sRGBEncoding is deprecated, using the new property
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    // Add lights
    addLights();

    // Setup post-processing
    setupPostProcessing();

    // Create environment
    createEnvironment();

    // Load models and textures
    loadAssets();

    // Handle window resize
    window.addEventListener('resize', onWindowResize);

    // Start animation loop
    animate();
}

// Check device performance to adjust settings
function checkPerformance() {
    // Simple performance detection based on device pixel ratio and platform
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const hasLowPixelRatio = window.devicePixelRatio < 2;
    
    isLowPerformance = isMobile || hasLowPixelRatio;
    
    // Adjust particle counts based on performance
    if (isLowPerformance) {
        console.log('Low performance mode enabled');
    }
}

function addLights() {
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);

    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Add point lights for dramatic effect
    const orangeLight = new THREE.PointLight(0xe65b07, 3, 20);
    orangeLight.position.set(-5, 2, -3);
    scene.add(orangeLight);

    // Add secondary light
    const secondaryLight = new THREE.PointLight(0xb34605, 3, 20);
    secondaryLight.position.set(5, 0, -2);
    scene.add(secondaryLight);

    // Add spotlight for the can
    const spotlight = new THREE.SpotLight(0xffffff, 2, 30, Math.PI / 6, 0.5, 1);
    spotlight.position.set(0, 10, 5);
    spotlight.castShadow = true;
    spotlight.shadow.mapSize.width = 1024;
    spotlight.shadow.mapSize.height = 1024;
    scene.add(spotlight);
}

function setupPostProcessing() {
    // Create composer
    composer = new EffectComposer(renderer);
    
    // Add render pass
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    
    // Add bloom pass for glow effect
    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.7,  // strength
        0.3,  // radius
        0.7   // threshold
    );
    composer.addPass(bloomPass);
    
    // Add FXAA pass for anti-aliasing
    const fxaaPass = new ShaderPass(FXAAShader);
    fxaaPass.material.uniforms['resolution'].value.set(
        1 / (window.innerWidth * renderer.getPixelRatio()),
        1 / (window.innerHeight * renderer.getPixelRatio())
    );
    composer.addPass(fxaaPass);
}

function createEnvironment() {
    // Create a dark floor
    const floorGeometry = new THREE.PlaneGeometry(100, 100);
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0x110F0E,
        roughness: 0.7,
        metalness: 0.2,
        side: THREE.DoubleSide
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -3;
    floor.receiveShadow = true;
    scene.add(floor);

    // Create background particles
    createBackgroundParticles();
}

function createBackgroundParticles() {
    const particleCount = isLowPerformance ? 100 : 200;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        particlePositions[i3] = (Math.random() - 0.5) * 20;
        particlePositions[i3 + 1] = (Math.random() - 0.5) * 20;
        particlePositions[i3 + 2] = (Math.random() - 0.5) * 20;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    const particleMaterial = new THREE.PointsMaterial({
        color: 0xe65b07,
        size: 0.05,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending
    });

    // Create particle system
    const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particleSystem);
}

function loadAssets() {
    // Create a temporary can model (will be replaced with a proper GLTF model)
    createTemporaryCanModel();
    
    // Create logo geometry for the liquid splash
    createLogoGeometry();
    
    // Create liquid particles
    createLiquidParticles();
    
    // Simulate loading complete
    setTimeout(() => {
        onLoadingComplete();
        startIntroAnimation();
    }, 2000);
}

function createTemporaryCanModel() {
    // Create a simple cylinder as a placeholder for the can
    const geometry = new THREE.CylinderGeometry(0.8, 0.8, 2.5, 32);
    const material = new THREE.MeshStandardMaterial({
        color: 0xe65b07,
        metalness: 0.8,
        roughness: 0.2
    });
    
    canModel = new THREE.Mesh(geometry, material);
    canModel.castShadow = true;
    canModel.receiveShadow = true;
    canModel.position.y = -10; // Start below the view
    scene.add(canModel);
    
    // Add logo to the can
    const logoGeometry = new THREE.PlaneGeometry(1, 1.5);
    const logoMaterial = new THREE.MeshBasicMaterial({
        color: 0xe65b07,
        side: THREE.DoubleSide
    });
    
    const logo = new THREE.Mesh(logoGeometry, logoMaterial);
    logo.position.z = 0.51;
    logo.rotation.y = Math.PI;
    canModel.add(logo);
}

function createLogoGeometry() {
    // Create a simple logo shape (will be replaced with actual logo)
    logoGeometry = new THREE.Shape();
    
    // Draw a simple lion head shape
    logoGeometry.moveTo(0, 1);
    logoGeometry.bezierCurveTo(0.5, 1, 1, 0.5, 1, 0);
    logoGeometry.bezierCurveTo(1, -0.5, 0.5, -1, 0, -1);
    logoGeometry.bezierCurveTo(-0.5, -1, -1, -0.5, -1, 0);
    logoGeometry.bezierCurveTo(-1, 0.5, -0.5, 1, 0, 1);
    
    // Add some details
    const earR = new THREE.Shape();
    earR.moveTo(0.7, 0.7);
    earR.bezierCurveTo(0.8, 0.8, 1.2, 0.8, 1.2, 0.6);
    earR.bezierCurveTo(1.2, 0.4, 0.9, 0.5, 0.7, 0.7);
    
    const earL = new THREE.Shape();
    earL.moveTo(-0.7, 0.7);
    earL.bezierCurveTo(-0.8, 0.8, -1.2, 0.8, -1.2, 0.6);
    earL.bezierCurveTo(-1.2, 0.4, -0.9, 0.5, -0.7, 0.7);
    
    logoGeometry.holes = [earR, earL];
}

function createLiquidParticles() {
    // Create materials for the liquid particles
    const orangeMaterial = new THREE.MeshStandardMaterial({
        color: 0xe65b07,
        metalness: 0.6,
        roughness: 0.2,
        transparent: true,
        opacity: 0.8,
        emissive: 0xe65b07,
        emissiveIntensity: 0.2
    });
    
    const darkOrangeMaterial = new THREE.MeshStandardMaterial({
        color: 0xb34605,
        metalness: 0.6,
        roughness: 0.3,
        transparent: true,
        opacity: 0.8,
        emissive: 0xb34605,
        emissiveIntensity: 0.1
    });
    
    // Create liquid droplets
    const particleCount = isLowPerformance ? 100 : 200;
    
    for (let i = 0; i < particleCount; i++) {
        // Random size for each particle
        const size = 0.05 + Math.random() * 0.15;
        const geometry = new THREE.SphereGeometry(size, isLowPerformance ? 4 : 8, isLowPerformance ? 4 : 8);
        
        // Alternate between the two materials for variety
        const material = i % 2 === 0 ? orangeMaterial : darkOrangeMaterial;
        const droplet = new THREE.Mesh(geometry, material);
        
        // Set initial position (will be updated in animation)
        droplet.position.set(
            (Math.random() - 0.5) * 4,
            -10, // Start below view
            (Math.random() - 0.5) * 4
        );
        
        droplet.castShadow = !isLowPerformance;
        scene.add(droplet);
        
        // Store particle data for animation
        liquidParticles.push({
            mesh: droplet,
            initialX: (Math.random() - 0.5) * 3,
            initialZ: (Math.random() - 0.5) * 3,
            speed: 0.1 + Math.random() * 0.2,
            delay: i * (isLowPerformance ? 20 : 10),
            phase: Math.random() * Math.PI * 2,
            amplitude: 0.1 + Math.random() * 0.3
        });
    }
}

function startIntroAnimation() {
    // Animation will be triggered here
    // This will be called after assets are loaded
    
    // Animate liquid particles
    animateLiquidParticles();
    
    // Animate can model
    animateCanModel();
}

function animateLiquidParticles() {
    // Set all particles to starting position
    liquidParticles.forEach(particle => {
        particle.mesh.position.y = -5;
        particle.animating = false;
        particle.startTime = null;
    });
    
    // Start animation sequence
    setTimeout(() => {
        liquidParticles.forEach((particle, index) => {
            setTimeout(() => {
                particle.animating = true;
                particle.startTime = clock.getElapsedTime();
            }, particle.delay);
        });
    }, 1000);
}

function animateCanModel() {
    // Animate can rising from below
    setTimeout(() => {
        gsapFallback(canModel.position, {
            y: -1,
            duration: 2,
            ease: 'power2.out'
        });
    }, 3000);
}

function updateLiquidParticles() {
    const time = clock.getElapsedTime();
    
    liquidParticles.forEach(particle => {
        if (!particle.animating) return;
        
        const particleTime = time - particle.startTime;
        if (particleTime < 0) return;
        
        // Calculate position based on time
        // Simulate liquid explosion
        const progress = Math.min(particleTime * particle.speed, 1);
        const yProgress = Math.sin(progress * Math.PI);
        
        if (progress < 1) {
            // Rising and falling motion
            particle.mesh.position.x = particle.initialX + Math.sin(time + particle.phase) * particle.amplitude;
            particle.mesh.position.y = -5 + yProgress * 8; // Rise up and fall
            particle.mesh.position.z = particle.initialZ + Math.cos(time + particle.phase) * particle.amplitude;
            
            // Scale based on position (larger at peak)
            const scale = 1 + yProgress * 0.5;
            particle.mesh.scale.set(scale, scale, scale);
        } else {
            // Reset particle for continuous effect
            particle.startTime = time + Math.random() * 2;
        }
    });
}

function updateBackgroundParticles() {
    // Update background particles
    if (scene.children.length > 0) {
        const particleSystem = scene.children.find(child => child instanceof THREE.Points);
        
        if (particleSystem) {
            const positions = particleSystem.geometry.attributes.position.array;
            const time = clock.getElapsedTime();
            
            for (let i = 0; i < particles.length; i++) {
                const i3 = i * 3;
                
                // Rotate particles around center
                const x = particles[i].x;
                const z = particles[i].z;
                const speed = particles[i].speed;
                
                positions[i3] = x * Math.cos(time * speed) - z * Math.sin(time * speed);
                positions[i3 + 2] = x * Math.sin(time * speed) + z * Math.cos(time * speed);
            }
            
            particleSystem.geometry.attributes.position.needsUpdate = true;
        }
    }
}

function updateCanModel() {
    if (canModel) {
        // Rotate the can slowly
        canModel.rotation.y += 0.005;
    }
}

function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    const time = clock.getElapsedTime();
    
    // Monitor performance
    frameCount++;
    if (time - lastTime >= 1) {
        fps = frameCount;
        frameCount = 0;
        lastTime = time;
        
        // Adjust quality based on framerate if needed
        if (fps < 30 && !isLowPerformance) {
            isLowPerformance = true;
            adjustQualityDynamically();
        }
    }
    
    // Update animations
    if (mixer) mixer.update(delta);
    
    // Update particles
    updateBackgroundParticles();
    updateLiquidParticles();
    updateCanModel();
    
    // Render scene with post-processing
    composer.render();
}

// Dynamically adjust quality based on performance
function adjustQualityDynamically() {
    console.log('Adjusting quality for better performance');
    
    // Reduce shadow quality
    renderer.shadowMap.enabled = false;
    
    // Reduce bloom quality
    const bloomPass = composer.passes.find(pass => pass instanceof UnrealBloomPass);
    if (bloomPass) {
        bloomPass.strength = 0.6;
        bloomPass.radius = 0.2;
    }
    
    // Reduce particle count
    reduceLiquidParticles();
}

// Reduce number of liquid particles
function reduceLiquidParticles() {
    if (liquidParticles.length > 100) {
        for (let i = liquidParticles.length - 1; i >= 100; i--) {
            scene.remove(liquidParticles[i].mesh);
            liquidParticles.pop();
        }
    }
}

function onWindowResize() {
    // Update camera
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    
    // Update renderer and composer
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    
    // Update FXAA pass
    const fxaaPass = composer.passes.find(pass => pass.material && pass.material.uniforms.resolution);
    if (fxaaPass) {
        fxaaPass.material.uniforms['resolution'].value.set(
            1 / (window.innerWidth * renderer.getPixelRatio()),
            1 / (window.innerHeight * renderer.getPixelRatio())
        );
    }
}

// Simple GSAP-like animation fallback
function gsapFallback(target, props) {
    const startValues = {};
    const endValues = {};
    const startTime = clock.getElapsedTime();
    const duration = props.duration || 1;
    
    // Store start and end values
    for (const key in props) {
        if (key !== 'duration' && key !== 'ease') {
            startValues[key] = target[key];
            endValues[key] = props[key];
        }
    }
    
    // Animation function
    function updateAnimation() {
        const currentTime = clock.getElapsedTime() - startTime;
        const progress = Math.min(currentTime / duration, 1);
        
        // Apply easing (simple power2.out)
        let easedProgress = progress;
        if (props.ease === 'power2.out') {
            easedProgress = 1 - Math.pow(1 - progress, 2);
        }
        
        // Update values
        for (const key in endValues) {
            target[key] = startValues[key] + (endValues[key] - startValues[key]) * easedProgress;
        }
        
        if (progress < 1) {
            requestAnimationFrame(updateAnimation);
        }
    }
    
    // Start animation
    updateAnimation();
}