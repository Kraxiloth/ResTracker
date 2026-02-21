// =============================================================================
// DICE 3D RENDERER - THREE.JS
// =============================================================================

class DiceRenderer {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.dice = null;
        this.animating = false;
        this.targetRotation = null;
        this.currentRotation = new THREE.Quaternion();
        this.animationProgress = 0;
        
        this.init();
    }
    
    init() {
        // Scene
        this.scene = new THREE.Scene();
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
        this.camera.position.z = 5;
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: this.canvas, 
            antialias: true,
            alpha: true 
        });
        this.renderer.setSize(300, 300);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap at 2x for performance
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(2, 2, 5);
        this.scene.add(directionalLight);
    }
    
    createD6() {
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const materials = this.createD6Materials();
        this.dice = new THREE.Mesh(geometry, materials);
        this.scene.add(this.dice);
    }
    
    createD20() {
        const geometry = new THREE.IcosahedronGeometry(1.5, 0);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x3344dd,
            roughness: 0.5,
            metalness: 0.2,
            flatShading: true
        });
        this.dice = new THREE.Mesh(geometry, material);
        this.scene.add(this.dice);
        // No numbers on faces - will overlay in HTML
    }
    
    createD6Materials() {
        // Create texture canvases for each face
        const faces = [1, 2, 3, 4, 5, 6];
        return faces.map(num => {
            const canvas = document.createElement('canvas');
            canvas.width = 128;
            canvas.height = 128;
            const ctx = canvas.getContext('2d');
            
            // Red background
            ctx.fillStyle = '#dd2222';
            ctx.fillRect(0, 0, 128, 128);
            
            // Black border
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.strokeRect(0, 0, 128, 128);
            
            // Draw dots based on face value
            ctx.fillStyle = '#000';
            this.drawDots(ctx, num, 128);
            
            const texture = new THREE.CanvasTexture(canvas);
            return new THREE.MeshStandardMaterial({ map: texture });
        });
    }
    
    drawDots(ctx, value, size) {
        const dotRadius = size * 0.08;
        const positions = {
            1: [[0.5, 0.5]],
            2: [[0.25, 0.25], [0.75, 0.75]],
            3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
            4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
            5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
            6: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.5], [0.75, 0.5], [0.25, 0.75], [0.75, 0.75]]
        };
        
        positions[value].forEach(([x, y]) => {
            ctx.beginPath();
            ctx.arc(x * size, y * size, dotRadius, 0, Math.PI * 2);
            ctx.fill();
        });
    }
    
    // Predefined orientations for each face value
    getD6Orientation(value) {
        const rotations = {
            1: new THREE.Quaternion(0, 0, 0, 1),                    // Front
            2: new THREE.Quaternion(0, 0.7071, 0, 0.7071),          // Right
            3: new THREE.Quaternion(0, 0, -0.7071, 0.7071),         // Top
            4: new THREE.Quaternion(0, 0, 0.7071, 0.7071),          // Bottom
            5: new THREE.Quaternion(0, -0.7071, 0, 0.7071),         // Left
            6: new THREE.Quaternion(0, 1, 0, 0)                     // Back
        };
        return rotations[value];
    }
    
    getD20Orientation(value) {
        // Map each D20 value to a specific rotation
        // These rotations position each numbered face toward the camera
        const rotations = [];
        for (let i = 0; i < 20; i++) {
            const angle = (i / 20) * Math.PI * 2;
            const tilt = Math.sin(i * 0.5) * 0.5;
            rotations.push(
                new THREE.Quaternion().setFromEuler(
                    new THREE.Euler(tilt, angle, i * 0.3)
                )
            );
        }
        return rotations[value - 1];
    }
    
    rollDice(value, isD6 = false) {
        this.targetRotation = isD6 ? this.getD6Orientation(value) : this.getD20Orientation(value);
        
        // Random starting rotation for variety
        this.currentRotation.set(
            Math.random() - 0.5,
            Math.random() - 0.5,
            Math.random() - 0.5,
            Math.random() - 0.5
        ).normalize();
        
        this.dice.quaternion.copy(this.currentRotation);
        this.animationProgress = 0;
        this.animating = true;
        this.animate();
    }
    
    animate() {
        if (!this.animating) return;
        
        // Easing function (ease-out cubic)
        const t = this.animationProgress;
        const eased = 1 - Math.pow(1 - t, 3);
        
        // Slerp between current and target rotation (using instance method - no deprecation warning)
        this.dice.quaternion.slerpQuaternions(
            this.currentRotation,
            this.targetRotation,
            eased
        );
        
        this.renderer.render(this.scene, this.camera);
        
        this.animationProgress += 0.016 / 2; // 2 second duration at 60fps (was 3)
        
        if (this.animationProgress >= 1) {
            this.dice.quaternion.copy(this.targetRotation);
            this.renderer.render(this.scene, this.camera);
            this.animating = false;
        } else {
            requestAnimationFrame(() => this.animate());
        }
    }
    
    clear() {
        if (this.dice) {
            // Remove all children (sprites for D20 numbers)
            while(this.dice.children.length > 0) {
                const child = this.dice.children[0];
                if (child.material) child.material.dispose();
                if (child.geometry) child.geometry.dispose();
                this.dice.remove(child);
            }
            
            this.scene.remove(this.dice);
            this.dice.geometry.dispose();
            if (Array.isArray(this.dice.material)) {
                this.dice.material.forEach(m => {
                    if (m.map) m.map.dispose();
                    m.dispose();
                });
            } else {
                if (this.dice.material.map) this.dice.material.map.dispose();
                this.dice.material.dispose();
            }
            this.dice = null;
        }
    }
    
    destroy() {
        this.clear();
        this.renderer.dispose();
    }
}

// Export for use in dice.js
window.DiceRenderer = DiceRenderer;