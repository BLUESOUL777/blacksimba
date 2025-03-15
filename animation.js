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
init();
document.addEventListener('DOMContentLoaded', () => {
    // Listen for theme change events from main.js instead of directly attaching to the switch
    document.addEventListener('themeChanged', (event) => {
        updateAnimationForTheme(event.detail.isLightTheme);
    });
    
    // Check initial theme
    const body = document.body;
    const isLightTheme = body.classList.contains('light-theme');
    updateAnimationForTheme(isLightTheme);
});
function updateAnimationForTheme(isLightTheme) {
    if (!scene) return;
    const bgColor = isLightTheme ? 0xf5f5f5 : 0x0F0E0C;
    scene.background = new THREE.Color(bgColor);
    if (scene.fog) {
        scene.fog = new THREE.FogExp2(bgColor, 0.002);
    }
    scene.children.forEach(child => {
        if (child.isAmbientLight) {
            child.intensity = isLightTheme ? 0.8 : 0.7;
        }
        if (child.isDirectionalLight) {
            child.intensity = isLightTheme ? 1.8 : 2.0;
        }
        if (child.isPointLight) {
            child.intensity = isLightTheme ? 1.2 : 1.5;
        }
    });
    if (composer) {
        composer.passes.forEach(pass => {
            if (pass instanceof UnrealBloomPass) {
                pass.strength = isLightTheme ? 0.8 : 1.0;
                pass.radius = isLightTheme ? 0.3 : 0.4;
            }
            if (pass.uniforms && pass.uniforms.brightness) {
                pass.uniforms.brightness.value = isLightTheme ? 0.1 : 0.15;
                pass.uniforms.contrast.value = isLightTheme ? 1.1 : 1.2;
            }
        });
    }
    if (renderer) {
        renderer.toneMappingExposure = isLightTheme ? 1.2 : 1.5;
    }
}

function init() {
    checkPerformance();
    scene = new THREE.Scene();
    const isLightTheme = document.body.classList.contains('light-theme');
    const bgColor = isLightTheme ? 0xf5f5f5 : 0x0F0E0C;
    scene.background = new THREE.Color(bgColor);
    scene.fog = new THREE.FogExp2(bgColor, 0.002);
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: !isLowPerformance,
        alpha: true,
        powerPreference: 'high-performance',
        precision: 'highp'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(isLowPerformance ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isLowPerformance;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    const envMapLoader = new THREE.TextureLoader();
    const envMap = envMapLoader.load('textures/studio_hdri.hdr', function(texture) {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = texture;
    });

    addLights();

    setupPostProcessing();

    createEnvironment();
    loadAssets();
    window.addEventListener('resize', onWindowResize);
    animate();
}
function checkPerformance() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const hasLowPixelRatio = window.devicePixelRatio < 2;
    
    isLowPerformance = isMobile || hasLowPixelRatio;
    if (isLowPerformance) {
        console.log('Low performance mode enabled');
    }
}

function addLights() {
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    const orangeLight = new THREE.PointLight(0xe65b07, 3, 20);
    orangeLight.position.set(-5, 2, -3);
    scene.add(orangeLight);
    const secondaryLight = new THREE.PointLight(0xb34605, 3, 20);
    secondaryLight.position.set(5, 0, -2);
    scene.add(secondaryLight);
    const spotlight = new THREE.SpotLight(0xffffff, 2, 30, Math.PI / 6, 0.5, 1);
    spotlight.position.set(0, 10, 5);
    spotlight.castShadow = true;
    spotlight.shadow.mapSize.width = 1024;
    spotlight.shadow.mapSize.height = 1024;
    scene.add(spotlight);
}

function setupPostProcessing() {
    composer = new EffectComposer(renderer);
    
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    
    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.0,          
        0.4,          
        0.85          
    );
    composer.addPass(bloomPass);
    
    const brightnessContrastShader = {
        uniforms: {
            "tDiffuse": { value: null },
            "brightness": { value: 0.15 },  
            "contrast": { value: 1.2 }      
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform sampler2D tDiffuse;
            uniform float brightness;
            uniform float contrast;
            varying vec2 vUv;
            
            void main() {
                vec4 color = texture2D(tDiffuse, vUv);
                color.rgb += brightness;
                
                color.rgb = (color.rgb - 0.5) * contrast + 0.5;
                
                gl_FragColor = color;
            }
        `
    };
    
    const brightnessContrastPass = new ShaderPass(brightnessContrastShader);
    composer.addPass(brightnessContrastPass);
    
    const fxaaPass = new ShaderPass(FXAAShader);
    fxaaPass.material.uniforms['resolution'].value.set(
        1 / (window.innerWidth * renderer.getPixelRatio()),
        1 / (window.innerHeight * renderer.getPixelRatio())
    );
    composer.addPass(fxaaPass);
    
    renderer.toneMappingExposure = 1.5;
}

function createEnvironment() {
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
    const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particleSystem);
}

function loadAssets() {
    createTemporaryCanModel();
    createLogoGeometry();
    createLiquidParticles();
    
    
    setTimeout(() => {
        onLoadingComplete();
        startIntroAnimation();
    }, 2000);
}

function createTemporaryCanModel() {
    const geometry = new THREE.CylinderGeometry(0.8, 0.8, 2.5, 64, 32, true);
    
    const textureLoader = new THREE.TextureLoader();
    const canTexture = textureLoader.load('img/WhatsApp Image 2025-03-11 at 11.24.46 AM.jpeg', function(texture) {
        
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
    });
    
    const normalMap = textureLoader.load('img/WhatsApp Image 2025-03-11 at 11.24.46 AM.jpeg', function(texture) {
        
        const canvas = document.createElement('canvas');
        const width = texture.image.width;
        const height = texture.image.height;
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        context.drawImage(texture.image, 0, 0);
        
        
        const imgData = context.getImageData(0, 0, width, height);
        const normalData = context.createImageData(width, height);
        
        for (let i = 0; i < imgData.data.length; i += 4) {
            normalData.data[i] = 128; 
            normalData.data[i+1] = 128; 
            normalData.data[i+2] = 255; 
            normalData.data[i+3] = imgData.data[i+3]; 
        }
        
        context.putImageData(normalData, 0, 0);
        texture.image = canvas;
        texture.needsUpdate = true;
    });
    
    canTexture.wrapS = THREE.RepeatWrapping;
    canTexture.repeat.set(1, 1);
    
    const material = new THREE.MeshPhysicalMaterial({
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
    
    canModel = new THREE.Mesh(geometry, material);
    canModel.castShadow = true;
    canModel.receiveShadow = true;
    canModel.position.y = -10; 
    
    const uvAttribute = geometry.attributes.uv;
    for (let i = 0; i < uvAttribute.count; i++) {
        const u = uvAttribute.getX(i);
        const v = uvAttribute.getY(i);
        
        uvAttribute.setX(i, (u + 0.25) % 1);
    }
    uvAttribute.needsUpdate = true;
    
    const topGeometry = new THREE.CircleGeometry(0.8, 32);
    const bottomGeometry = new THREE.CircleGeometry(0.8, 32);
    
    const topMaterial = new THREE.MeshStandardMaterial({
        color: 0x888888,
        metalness: 0.9,
        roughness: 0.1,
    });
    
    const bottomMaterial = new THREE.MeshStandardMaterial({
        color: 0x888888,
        metalness: 0.9,
        roughness: 0.1,
    });
    
    const topCap = new THREE.Mesh(topGeometry, topMaterial);
    topCap.position.y = 1.25;
    topCap.rotation.x = -Math.PI / 2;
    canModel.add(topCap);
    
    const bottomCap = new THREE.Mesh(bottomGeometry, bottomMaterial);
    bottomCap.position.y = -1.25;
    bottomCap.rotation.x = Math.PI / 2;
    canModel.add(bottomCap);
    
    const tabGeometry = new THREE.BoxGeometry(0.3, 0.05, 0.2);
    const tabMaterial = new THREE.MeshStandardMaterial({
        color: 0xCCCCCC,
        metalness: 1.0,
        roughness: 0.2
    });
    const pullTab = new THREE.Mesh(tabGeometry, tabMaterial);
    pullTab.position.set(0, 1.3, 0.4);
    canModel.add(pullTab);
    
    scene.add(canModel);

    const canHighlight = new THREE.PointLight(0xffffff, 1.5, 10);
    canHighlight.position.set(2, 0, 2);
    scene.add(canHighlight);
    
    const rimLight = new THREE.PointLight(0xffffff, 1.0, 8);
    rimLight.position.set(-2, 0, -2);
    scene.add(rimLight);
}

function createLogoGeometry() {
    logoGeometry = new THREE.Shape();
    
    logoGeometry.moveTo(0, 1);
    logoGeometry.bezierCurveTo(0.5, 1, 1, 0.5, 1, 0);
    logoGeometry.bezierCurveTo(1, -0.5, 0.5, -1, 0, -1);
    logoGeometry.bezierCurveTo(-0.5, -1, -1, -0.5, -1, 0);
    logoGeometry.bezierCurveTo(-1, 0.5, -0.5, 1, 0, 1);
    
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
    
    const particleCount = isLowPerformance ? 100 : 200;
    
    for (let i = 0; i < particleCount; i++) {
        
        const size = 0.05 + Math.random() * 0.15;
        const geometry = new THREE.SphereGeometry(size, isLowPerformance ? 4 : 8, isLowPerformance ? 4 : 8);
        
        const material = i % 2 === 0 ? orangeMaterial : darkOrangeMaterial;
        const droplet = new THREE.Mesh(geometry, material);
        droplet.position.set(
            (Math.random() - 0.5) * 4,
            -10, 
            (Math.random() - 0.5) * 4
        );
        
        droplet.castShadow = !isLowPerformance;
        scene.add(droplet);
        
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
    animateLiquidParticles();
    animateCanModel();
}

function animateLiquidParticles() {
    liquidParticles.forEach(particle => {
        particle.mesh.position.y =  -5;
        particle.animating = false;
        particle.startTime = null;
    });
    
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
        
        const progress = Math.min(particleTime * particle.speed, 1);
        const yProgress = Math.sin(progress * Math.PI);
        
        if (progress < 1) {
            particle.mesh.position.x = particle.initialX + Math.sin(time + particle.phase) * particle.amplitude;
            particle.mesh.position.y = -5 + yProgress * 8; 
            particle.mesh.position.z = particle.initialZ + Math.cos(time + particle.phase) * particle.amplitude;
            const scale = 1 + yProgress * 0.5;
            particle.mesh.scale.set(scale, scale, scale);
        } else {
            particle.startTime = time + Math.random() * 2;
        }
    });
}

function updateBackgroundParticles() {
    if (scene.children.length > 0) {
        const particleSystem = scene.children.find(child => child instanceof THREE.Points);
        
        if (particleSystem) {
            const positions = particleSystem.geometry.attributes.position.array;
            const time = clock.getElapsedTime();
            
            for (let i = 0; i < particles.length; i++) {
                const i3 = i * 3;
                
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
        canModel.rotation.y += 0.005;
    }
}

function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    const time = clock.getElapsedTime();
    
    frameCount++;
    if (time - lastTime >= 1) {
        fps = frameCount;
        frameCount = 0;
        lastTime = time;
        
        if (fps < 30 && !isLowPerformance) {
            isLowPerformance = true;
            adjustQualityDynamically();
        }
    }
    
    if (mixer) mixer.update(delta);
    
    updateBackgroundParticles();
    updateLiquidParticles();
    updateCanModel();
    
    composer.render();
}
function adjustQualityDynamically() {
    console.log('Adjusting quality for better performance');
    
    renderer.shadowMap.enabled = false;
    
    const bloomPass = composer.passes.find(pass => pass instanceof UnrealBloomPass);
    if (bloomPass) {
        bloomPass.strength = 0.6;
        bloomPass.radius = 0.2;
    }
    
    reduceLiquidParticles();
}
function reduceLiquidParticles() {
    if (liquidParticles.length > 100) {
        for (let i = liquidParticles.length - 1; i >= 100; i--) {
            scene.remove(liquidParticles[i].mesh);
            liquidParticles.pop();
        }
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    const fxaaPass = composer.passes.find(pass => pass.material && pass.material.uniforms.resolution);
    if (fxaaPass) {
        fxaaPass.material.uniforms['resolution'].value.set(
            1 / (window.innerWidth * renderer.getPixelRatio()),
            1 / (window.innerHeight * renderer.getPixelRatio())
        );
    }
}

function gsapFallback(target, props) {
    const startValues = {};
    const endValues = {};
    const startTime = clock.getElapsedTime();
    const duration = props.duration || 1;
    for (const key in props) {
        if (key !== 'duration' && key !== 'ease') {
            startValues[key] = target[key];
            endValues[key] = props[key];
        }
    }
    
    function updateAnimation() {
        const currentTime = clock.getElapsedTime() - startTime;
        const progress = Math.min(currentTime / duration, 1);
        
        let easedProgress = progress;
        if (props.ease === 'power2.out') {
            easedProgress = 1 - Math.pow(1 - progress, 2);
        }
        
        for (const key in endValues) {
            target[key] = startValues[key] + (endValues[key] - startValues[key]) * easedProgress;
        }
        
        if (progress < 1) {
            requestAnimationFrame(updateAnimation);
        }
    }
    updateAnimation();
}