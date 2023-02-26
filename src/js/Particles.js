import * as THREE from 'https://threejsfundamentals.org/threejs/resources/threejs/r132/build/three.module.js';
import { ColladaLoader } from 'https://threejsfundamentals.org/threejs/resources/threejs/r132/examples/jsm/loaders/ColladaLoader.js';
import { FBXLoader } from 'https://threejsfundamentals.org/threejs/resources/threejs/r132/examples/jsm/loaders/FBXLoader.js';
import {OBJLoader} from 'https://threejsfundamentals.org/threejs/resources/threejs/r132/examples/jsm/loaders/OBJLoader.js';

function getRandomFloat(min, max, decimals) {
    const str = (Math.random() * (max - min) + min).toFixed(decimals);

    return parseFloat(str);
}

function distanceVector(v1, v2) {
    var dx = v1.x - v2.x;
    var dy = v1.y - v2.y;
    var dz = v1.z - v2.z;

    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}


function main() {
    var then = 0;
    const canvas = document.querySelector('#canvas');
    const renderer = new THREE.WebGLRenderer({ canvas });
    var gl = renderer.getContext();
    const fov = 45;
    var flagpeasant = 0; //se a animação do aladdin acabou
    const aspect = 2;
    const near = 0.1;
    const far = 150000;
    var mixers = [];
    var camerarotationy = 0; //informa a rotação da camera
    let Emissionthen = 0;
    let Emissionthen2 = 0;
    var style = 2; //estilo da particula: 0 para bolha, 1 para poeira, 2 para nuvem
    var transparencyon = true; //ativa transparencia
    var transparencylifetimeon = true; //ativa transparencia de acordo com o tempo de vida da particula
    var outlineon = true; //ativa contorno
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(0, 10, 50);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xdddddd);
    var ceugeometry = new THREE.SphereGeometry(10000, 32, 16); //cria esfera do céu
    var ceuMaterials = new THREE.MeshBasicMaterial({ map: new THREE.TextureLoader().load("/Textures/skycube_1/sky.jpg"), side: THREE.DoubleSide }); //textura do céu
    var ceu = new THREE.Mesh(ceugeometry, ceuMaterials);
    scene.add(ceu);

    function looppeasant(mixer) { //faz com que o próximo movement do loop seja de onde o ultimo parou
        var objeto = mixer.getRoot();
        mixer.addEventListener('loop', function (e) {
            if (flagpeasant == 0) {
                flagpeasant = 1;
                objeto.rotateY(degToRad(180));
                objeto.translateX(-3);
                objeto.translateZ(-18);
            }
        });
    }

    function animate(mixers, delta) { //faz animação
        requestAnimationFrame(animate);
        if (mixers) {
            for (var i = 0; i < mixers.length; i++) {
                mixers[i].update(delta);
                if (mixers[i].name == "peasant") { //se for animação do aladdin
                    looppeasant(mixers[i]);
                }
            }
        }
    }


    const skyColor = 0xB1E1FF;
    const groundColor = 0xB97A20;
    const intensity = 1;
    const light1 = new THREE.HemisphereLight(skyColor, groundColor, intensity);
    scene.add(light1);




    const color = 0xFFFFFF;
    const light2 = new THREE.DirectionalLight(color, intensity);
    light2.position.set(0, 10, 0);
    light2.target.position.set(-5, 0, 0);
    scene.add(light2);
    scene.add(light2.target);

     const fbxLoader = new FBXLoader(); 
     const colladaloader = new ColladaLoader();
     const objLoader = new OBJLoader();
     fbxLoader.load('/Models/town/TEST2.fbx', (town) => { //cria town
         town.translateZ(-1000);
         town.scale.set(10,10,10);
         scene.add( town );
     } );
 
     colladaloader.load( 'Models/peasant/peasant.dae', function ( collada ) { //cria aladdin
         var peasant = collada.scene;
         peasant.traverse( function ( node ) {
             if ( node.isSkinnedMesh ) {
                 node.geometry.computeVertexNormals(); //computa vetores normais
             }
         } );
       peasant.translateX(50);
       peasant.translateY(0);
       peasant.translateZ(-750);
       peasant.scale.set(0.1,0.1,0.1);
       peasant.children[0].children.forEach(child => {
             if (child.type == "LineSegments") {
                 child.visible = false; 
             }
         });
         const mixer = new THREE.AnimationMixer(peasant);
         const idle = mixer.clipAction(peasant.animations[0]); 
         idle.clampWhenFinished = true;
         idle.play();
         mixer.name="peasant";
         mixers.push(mixer);
         scene.add(peasant);
 
     } ); 

     var cloud;

     objLoader.load('/Models/cloud/cloud.obj', (root) => {
        cloud = root.children[0].geometry;
    });  


    function bubbleSortParticles(array, camera, outline) {

        for (var i = 0; i < array.length; i++) {

            for (var j = 0; j < array.length - 1; j++) {


                if (distanceVector(array[j].getParticle().position, camera.position) < distanceVector(array[j + 1].getParticle().position, camera.position)) {


                    var temp = array[j];
                    array[j] = array[j + 1];
                    array[j + 1] = temp;

                    if(outlineon){
                        var temp = outline[j];
                        outline[j] = outline[j + 1];
                        outline[j + 1] = temp;
                    }
                }
            }
        }
    }

    function bubbleSortTransparent(array, camera) {

        for (var i = 0; i < array.length; i++) {

            for (var j = 0; j < array.length - 1; j++) {


                if (Array.isArray(array[j].getObject()) && Array.isArray(array[j + 1].getObject()) && (array[j].getObject().length > 0) && (array[j + 1].getObject().length > 0)) {

                    if (distanceVector(array[j].getObject()[0].getParticle().position, camera.position) < distanceVector(array[j + 1].getObject()[0].getParticle().position, camera.position)) {
                        var temp = array[j];
                        array[j] = array[j + 1];
                        array[j + 1] = temp;
                    }
                }
            }
        }
    }

    function changeTransparency(particle, alpha) {
        var vertCode = `# version 300 es
            uniform mat4 projectionMatrix;
            uniform mat4 viewMatrix;
            uniform mat4 modelMatrix;



            

            in vec3 position;
            in vec3 normal;
            in vec4 TexCoord;
            in vec2 uv;

            out vec3 n;
            out vec3 FragPos;


            
            
            void main(){
                mat4 ModelView = viewMatrix* modelMatrix;
                
                ModelView[0][0] = length(vec3(modelMatrix[0]));
                ModelView[0][1] = 0.0;
                ModelView[0][2] = 0.0;

                
                ModelView[1][0] = 0.0;
                ModelView[1][1] =  length(vec3(modelMatrix[1]));
                ModelView[1][2] = 0.0;

                
                ModelView[2][0] = 0.0;
                ModelView[2][1] = 0.0;
                ModelView[2][2] = length(vec3(modelMatrix[2]));
                vec4 modelPosition = ModelView * vec4(position, 1.0);
                n = normal;
                FragPos = vec3(modelMatrix * vec4(position, 1.0));
                gl_Position = projectionMatrix * modelPosition;
            }
            `;
        var fragCode = `# version 300 es
            precision mediump float;
            uniform vec3 shadowColor;
            uniform vec3 lightColor;
            uniform float uAlpha;
            

            

            
            in vec3 n;
            in vec3 FragPos;


            
            out vec4 color;

            

            
            void main(){
                vec3 light_direction = vec3(500,500,500) - FragPos;
                float temp = max(0.0,dot(n, normalize(light_direction)));
                color = vec4(temp, temp, temp, 1.0);
                color = clamp(color,0.0,1.0);
                float gamma = 3.7;
                color[0] = pow(color[0], gamma);
                color[1] = pow(color[1], gamma);
                color[2] = pow(color[2], gamma);
                color = color * 100.0;
                color = floor(color);
                color = color / 100.0;
                color[0] = pow(color[0], 1.4/gamma);
                color[1] = pow(color[1], 1.0/gamma);
                color[2] = pow(color[2], 1.0/gamma);
                vec3 tempcolor = mix(shadowColor, lightColor, color[1]);
                color = vec4(tempcolor, uAlpha);
            }
            `;
        var SphereMaterials = new THREE.RawShaderMaterial({
            uniforms: {
                shadowColor: { value: new THREE.Color(0x808080) },
                lightColor: { value: new THREE.Color(0xdcdcdc) },
                uAlpha: { value: alpha },
            }, vertexShader: vertCode, fragmentShader: fragCode, wireframe: false, side: THREE.DoubleSide, depthTest: true, depthWrite: true, transparent: true, stencilWrite: true, stencilRef: 1, stencilFunc:THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp
        });
        particle.material = SphereMaterials;
    }

    function changeTransparencyOutline(particle, alpha) {
        var vertCode = `# version 300 es
            uniform mat4 projectionMatrix;
            uniform mat4 viewMatrix;
            uniform mat4 modelMatrix;



            

            in vec3 position;




            
            
            void main(){
                mat4 ModelView = viewMatrix* modelMatrix;
                
                ModelView[0][0] = length(vec3(modelMatrix[0]));
                ModelView[0][1] = 0.0;
                ModelView[0][2] = 0.0;

                
                ModelView[1][0] = 0.0;
                ModelView[1][1] =  length(vec3(modelMatrix[1]));
                ModelView[1][2] = 0.0;

                
                ModelView[2][0] = 0.0;
                ModelView[2][1] = 0.0;
                ModelView[2][2] = length(vec3(modelMatrix[2]));
                vec4 modelPosition = ModelView * vec4(position, 1.0);
                gl_Position = projectionMatrix * modelPosition;
            }
            `;
        var fragCode = `# version 300 es
            precision mediump float;
            uniform float uAlpha;
            

            

            


            
            out vec4 color;

            

            
            void main(){
                color = vec4(0,0,0, uAlpha);
            }
            `;
        var SphereMaterials = new THREE.RawShaderMaterial({
            uniforms: {
                uAlpha: { value: alpha },
            }, vertexShader: vertCode, fragmentShader: fragCode, wireframe: false, side: THREE.DoubleSide, depthTest: true, depthWrite: true, transparent: true, stencilWrite: true, stencilRef: 1, stencilFunc: THREE.NotEqualStencilFunc
        });
        particle.material = SphereMaterials;
    }


    class Particle {
        constructor(position, now, alpha, lifetime, movement) {
            if (!transparencyon)
                alpha = 1.0;
            var geometry = new THREE.SphereGeometry(2, 32, 16);
            if(style == 1){
            geometry.dynamic = true;
            geometry.attributes.position.needsUpdate = true;
            var positions = geometry.getAttribute("position");
            for (let i = 0; i < positions.count; i++) {
                let Amplitudex = getRandomFloat(0.1, 0.8, 2);
                let Amplitudey = getRandomFloat(0.1, 0.8, 2);
                let Amplitudez = getRandomFloat(0.1, 0.8, 2);
                var x = positions.getX(i);
                var y = positions.getY(i);
                var z = positions.getZ(i);
                z += Math.cos(z * 1.5) * Amplitudez + Math.random();
                y += Math.sin(y * 1.5) * Amplitudey + Math.random();
                x += Math.cos(x * 1.5) * Amplitudex + Math.random();
                positions.setXYZ(i, x, y, z);

            }
            geometry.setAttribute('position', positions);
            geometry.computeVertexNormals();
        }
            this.vertCode = `# version 300 es
            uniform mat4 projectionMatrix;
            uniform mat4 viewMatrix;
            uniform mat4 modelMatrix;



            

            in vec3 position;
            in vec3 normal;
            in vec4 TexCoord;
            in vec2 uv;

            out vec3 n;
            out vec3 FragPos;


            
            
            void main(){
                mat4 ModelView = viewMatrix* modelMatrix;
                
                ModelView[0][0] = length(vec3(modelMatrix[0]));
                ModelView[0][1] = 0.0;
                ModelView[0][2] = 0.0;

                
                ModelView[1][0] = 0.0;
                ModelView[1][1] =  length(vec3(modelMatrix[1]));
                ModelView[1][2] = 0.0;

                
                ModelView[2][0] = 0.0;
                ModelView[2][1] = 0.0;
                ModelView[2][2] = length(vec3(modelMatrix[2]));
                vec4 modelPosition = ModelView * vec4(position, 1.0);
                n = normal;
                FragPos = vec3(modelMatrix * vec4(position, 1.0));
                gl_Position = projectionMatrix * modelPosition;
            }
            `;
            this.fragCode = `# version 300 es
            precision mediump float;
            uniform vec3 shadowColor;
            uniform vec3 lightColor;
            uniform float uAlpha;
            

            

            
            in vec3 n;
            in vec3 FragPos;


            
            out vec4 color;

            

            
            void main(){
                vec3 light_direction = vec3(500,500,500) - FragPos;
                float temp = max(0.0,dot(n, normalize(light_direction)));
                color = vec4(temp, temp, temp, 1.0);
                float gamma = 3.7;
                color[0] = pow(color[0], gamma);
                color[1] = pow(color[1], gamma);
                color[2] = pow(color[2], gamma);
                color = color * 100.0;
                color = floor(color);
                color = color / 100.0;
                color[0] = pow(color[0], 1.0/gamma);
                color[1] = pow(color[1], 1.0/gamma);
                color[2] = pow(color[2], 1.0/gamma);
                vec3 tempcolor = mix(shadowColor, lightColor, color[1]);
                color = vec4(tempcolor, uAlpha);
            }
            `;
            var SphereMaterials = new THREE.RawShaderMaterial({
                uniforms: {
                    shadowColor: { value: new THREE.Color(0xc0c0c0) },
                    lightColor: { value: new THREE.Color(0xdcdcdc) },
                    uAlpha: { value: alpha },
                }, vertexShader: this.vertCode, fragmentShader: this.fragCode, wireframe: false, side: THREE.DoubleSide, depthTest: true, depthWrite: true, transparent: true, stencilWrite: true, stencilRef: 1, stencilFunc:THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp
            });
            if(style == 2)
                this.particle = new THREE.Mesh(cloud, SphereMaterials);
            else
                this.particle = new THREE.Mesh(geometry, SphereMaterials);
            this.particle.position.set(position.x, position.y, position.z);
            this.movement = movement;
            if (this.movement.x >= 0 && this.movement.x < 0.4) {
                this.movement.x += 1;
            }
            this.intiallife = now;
            this.lifetime = lifetime;
            this.alpha = alpha;
        }

        getParticle() {
            return this.particle;
        }

        getMovement() {
            return this.movement;
        }

        setParticlePosition(position) {
            this.particle.position.set(position.x, position.y, position.z);
        }

        update(deltat, newalpha) {
            this.particle.position.set(this.particle.position.x + this.movement.x * deltat, this.particle.position.y + (this.movement.y) * deltat, this.particle.position.z + (this.movement.z) * deltat);
            if(transparencyon && transparencylifetimeon){
                changeTransparency(this.particle, newalpha);
            }
        }

        getActualLifetime(now) {
            return (now - this.intiallife);
        }
        getAlpha() {
            return this.alpha;
        }

    }

    function resizeRendererToDisplaySize(renderer) {
        const canvas = renderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const needResize = canvas.width !== width || canvas.height !== height;
        if (needResize) {
            renderer.setSize(width, height, false);
        }
        return needResize;
    }

    class ObjectTransparent {
        constructor(name, object) {
            this.name = name;
            this.object = object;
        }
        getName() {
            return this.name;
        }
        getObject() {
            return this.object;
        }
    }

    let particles = [];
    let particlesOutline = [];
    let particles2 = [];
    let particlesOutline2 = [];
    let transparent = [];


    transparent.push(new ObjectTransparent(Object.keys({ particles })[0], particles));
    transparent.push(new ObjectTransparent(Object.keys({ particles2 })[0], particles2));




    camera.rotateX(degToRad(10));

    function render(now) {
        now *= 0.001;
        if (resizeRendererToDisplaySize(renderer)) {
            const canvas = renderer.domElement;
            camera.aspect = canvas.clientWidth / canvas.clientHeight;
            camera.updateProjectionMatrix();
        }
        //Particle System fumaca do peasant
        let p;
        let quant_particles = 1000;
        let emission_rate_time = 30;
        if (now - Emissionthen >= 0.5) {
            for (let i = 0; i < emission_rate_time; i++) {
                if (particles.length < quant_particles) {
                    var movement = new THREE.Vector3(getRandomFloat(-15.0, 15.0, 2), getRandomFloat(5.0, 20.0, 2), getRandomFloat(-5.0, 5.0, 2));
                    p = new Particle(new THREE.Vector3(40.0, 5.0, -760.0), now, 0.2, 6, movement);
                    p.getParticle().scale.set(5.5, 5.5, 5.5);
                    if(outlineon){
                        let p_contorno = p.getParticle().clone();
                        p_contorno.material = new THREE.RawShaderMaterial({
                            uniforms: {
                                uAlpha: { value: p.getAlpha() },
                            }, vertexShader: `# version 300 es
                        uniform mat4 projectionMatrix;
                        uniform mat4 viewMatrix;
                        uniform mat4 modelMatrix;
            
            
            
                        
            
                        in vec3 position;
            
            
                        
                        
                        void main(){
                            mat4 ModelView = viewMatrix* modelMatrix;
                            
                            ModelView[0][0] = length(vec3(modelMatrix[0]));
                            ModelView[0][1] = 0.0;
                            ModelView[0][2] = 0.0;
                            
                            
                            ModelView[1][0] = 0.0;
                            ModelView[1][1] =  length(vec3(modelMatrix[1]));
                            ModelView[1][2] = 0.0;
                            
                            
                            ModelView[2][0] = 0.0;
                            ModelView[2][1] = 0.0;
                            ModelView[2][2] = length(vec3(modelMatrix[2]));
                            vec4 modelPosition = ModelView * vec4(position, 1.0);
                            gl_Position = projectionMatrix * modelPosition;
                        }
                        `, fragmentShader: `# version 300 es
                        precision mediump float;
                        uniform float uAlpha;
                    
                        
                        out vec4 color;
                    
                        
                    
                        
                        void main(){
                            color = vec4(0,0,0,uAlpha);
                        }
                        `, wireframe: false, side: THREE.DoubleSide, depthTest: true, depthWrite: true, transparent: true, stencilWrite: true, stencilRef: 1, stencilFunc: THREE.NotEqualStencilFunc
                        });
                        p_contorno.scale.set(6.5, 6.5, 5.0);
                        particlesOutline.push(p_contorno);
                    }
                    particles.push(p);
                    Emissionthen = now;
                }
            }
        }
        var deltat = (now - then) / 2;
        for (let i = 0; i < particles.length; i++) {
            if (deltat < 1) {
                var newalpha = 1.0;
                if(transparencyon && transparencylifetimeon)
                    newalpha = particles[i].getAlpha() - (particles[i].getAlpha() * particles[i].getActualLifetime(now) / (particles[i].lifetime - 1.0));
                particles[i].update(deltat, newalpha);
                if(outlineon){
                    particlesOutline[i].position.set(particlesOutline[i].position.x + particles[i].getMovement().x * deltat, particlesOutline[i].position.y + (particles[i].getMovement().y) * deltat, particlesOutline[i].position.z + (particles[i].getMovement().z) * deltat);
                    if(transparencyon && transparencylifetimeon)
                        changeTransparencyOutline(particlesOutline[i], newalpha);
                }
                if (particles[i].getActualLifetime(now) < 1) {
                    particles[i].getParticle().scale.set(particles[i].getParticle().scale.x + 0.02, particles[i].getParticle().scale.y + 0.02, particles[i].getParticle().scale.z + 0.02);
                    if(outlineon)
                        particlesOutline[i].scale.set(particlesOutline[i].scale.x + 0.02, particlesOutline[i].scale.y + 0.02, particlesOutline[i].scale.z + 0.02);
                }
                if (particles[i].getActualLifetime(now) > particles[i].lifetime - 2.8) {
                    if (particles[i].getParticle().scale.x - 0.1 >= 0) {
                        particles[i].getParticle().scale.set(particles[i].getParticle().scale.x - 0.15, particles[i].getParticle().scale.y - 0.15, particles[i].getParticle().scale.z - 0.15);
                        if(outlineon){
                            particlesOutline[i].scale.set(particlesOutline[i].scale.x - 0.15, particlesOutline[i].scale.y - 0.15, 0);
                        }
                    }
                    else {
                        particles[i].getParticle().scale.set(0, 0, 0);
                        if(outlineon)
                            particlesOutline[i].scale.set(0, 0, 0);
                    }
                }

                if(outlineon)
                    scene.add(particlesOutline[i]);
                scene.add(particles[i].getParticle());

                if (particles[i].getActualLifetime(now) >= particles[i].lifetime || newalpha < 0.00) {
                    scene.remove(particles[i].getParticle());
                    if(outlineon)
                        scene.remove(particlesOutline[i]);
                    particles.splice(i, 1);
                    if(outlineon)
                        particlesOutline.splice(i, 1);
                    i = i - 1;
                }
            }
        }
        if(transparencyon){
            if (deltat < 1) {
                bubbleSortParticles(particles, camera, particlesOutline);
            }
        }


        //Particle System fumaca da chamine
        quant_particles = 1000;
        emission_rate_time = 30;
        if (now - Emissionthen2 >= 0.5) {

            for (let i = 0; i < emission_rate_time; i++) {
                if (particles2.length < quant_particles) {
                    var movement = new THREE.Vector3(getRandomFloat(-10.0, 10.0, 2), getRandomFloat(10.0, 30.0, 2), getRandomFloat(-5.0, 5.0, 2));
                    p = new Particle(new THREE.Vector3(29.0, 74.0, -864.0), now, 0.8, 6, movement);
                    p.getParticle().scale.set(0.5, 0.5, 0.5);
                    if(outlineon){
                        let p_contorno = p.getParticle().clone();
                        p_contorno.material = new THREE.RawShaderMaterial({
                            uniforms: {
                                uAlpha: { value: p.getAlpha() },
                            }, vertexShader: `# version 300 es
                uniform mat4 projectionMatrix;
                uniform mat4 viewMatrix;
                uniform mat4 modelMatrix;



                

                in vec3 position;


                
                
                void main(){
                    mat4 ModelView = viewMatrix* modelMatrix;
                    
                    ModelView[0][0] = length(vec3(modelMatrix[0]));
                    ModelView[0][1] = 0.0;
                    ModelView[0][2] = 0.0;
                    
                    
                    ModelView[1][0] = 0.0;
                    ModelView[1][1] =  length(vec3(modelMatrix[1]));
                    ModelView[1][2] = 0.0;
                    
                    
                    ModelView[2][0] = 0.0;
                    ModelView[2][1] = 0.0;
                    ModelView[2][2] = length(vec3(modelMatrix[2]));
                    vec4 modelPosition = ModelView * vec4(position, 1.0);
                    gl_Position = projectionMatrix * modelPosition;
                }
                `, fragmentShader: `# version 300 es
                precision mediump float;
                uniform float uAlpha;
            
            
                
                out vec4 color;
            
                
            
                
                void main(){
                    color = vec4(0,0,0,uAlpha);
                }
                `, wireframe: false, side: THREE.DoubleSide, depthTest: true, depthWrite: true, transparent: true, stencilWrite: true, stencilRef: 2, stencilFunc: THREE.NotEqualStencilFunc
                        });
                        p_contorno.scale.set(0.8, 0.8, 0);
                        particlesOutline2.push(p_contorno);
                    }
                    p.getParticle().material.stencilRef = 2;
                    particles2.push(p);
                    Emissionthen2 = now;
                }
            }
        }
        var deltat = (now - then) / 2;
        for (let i = 0; i < particles2.length; i++) {
            if (deltat < 1) {
                var newalpha = 1.0;
                if(transparencyon && transparencylifetimeon)
                    newalpha = particles2[i].getAlpha() - (particles2[i].getAlpha() * particles2[i].getActualLifetime(now) / (particles2[i].lifetime - 2.5));
                particles2[i].update(deltat, newalpha);
                if(outlineon){
                    particles2[i].getParticle().material.stencilRef = 2;
                    particlesOutline2[i].position.set(particlesOutline2[i].position.x + particles2[i].getMovement().x * deltat, particlesOutline2[i].position.y + (particles2[i].getMovement().y) * deltat, particlesOutline2[i].position.z + (particles2[i].getMovement().z) * deltat);
                    if(transparencyon && transparencylifetimeon){
                        changeTransparencyOutline(particlesOutline2[i], newalpha);
                        particlesOutline2[i].material.stencilRef = 2;
                    }
                }
                if (particles2[i].getActualLifetime(now) < 1) {
                    particles2[i].getParticle().scale.set(particles2[i].getParticle().scale.x + 0.02, particles2[i].getParticle().scale.y + 0.02, particles2[i].getParticle().scale.z + 0.02);
                    if(outlineon)
                        particlesOutline2[i].scale.set(particlesOutline2[i].scale.x + 0.02, particlesOutline2[i].scale.y + 0.02, 0);
                }
                if (particles2[i].getActualLifetime(now) > particles2[i].lifetime - 2.8) {
                    if (particles2[i].getParticle().scale.x - 0.05 >= 0) {
                        particles2[i].getParticle().scale.set(particles2[i].getParticle().scale.x - 0.05, particles2[i].getParticle().scale.y - 0.05, particles2[i].getParticle().scale.z - 0.05);
                        if(outlineon){
                            particlesOutline2[i].scale.set(particlesOutline2[i].scale.x - 0.05, particlesOutline2[i].scale.y - 0.05, 0);
                        }
                    }
                    else {
                        particles2[i].getParticle().scale.set(0, 0, 0);
                        if(outlineon)
                            particlesOutline2[i].scale.set(0, 0, 0);
                    }
                }

                if(outlineon)
                    scene.add(particlesOutline2[i]);
                scene.add(particles2[i].getParticle());

                if (particles2[i].getActualLifetime(now) >= particles2[i].lifetime) {
                    scene.remove(particles2[i].getParticle());
                    if(outlineon)
                        scene.remove(particlesOutline2[i]);
                    particles2.splice(i, 1);
                    if(outlineon)
                        particlesOutline2.splice(i, 1);
                    i = i - 1;
                }
            }
        }
        if(transparencyon){
            if (deltat < 1) {
                bubbleSortParticles(particles2, camera, particlesOutline2);
            }
        }




        
        if (deltat < 1) {
            if(transparencyon){
                bubbleSortTransparent(transparent, camera);
                for (let i = 0, transparentquant = 0; i < transparent.length; i++) {
                    if (Array.isArray(transparent[i].getObject()) == true) {
                        for (let j = 0; j < transparent[i].getObject().length; j++) {
                            transparentquant++;
                            transparent[i].getObject()[j].getParticle().renderOrder = transparentquant;
                            if(outlineon){
                                if (transparent[i].getName() == "particles") {
                                    particlesOutline[j].renderOrder = transparent[i].getObject().length + transparentquant;
                                }
                                if (transparent[i].getName() == "particles2") {
                                    particlesOutline2[j].renderOrder = transparentquant + transparent[i].getObject().length;
                                }
                            }
                        }
                        if(outlineon){
                            if (transparent[i].getName() == "particles") {
                                transparentquant = transparentquant + particles.length;
                            }
                            if (transparent[i].getName() == "particles2") {
                                transparentquant = transparentquant + particles2.length;
                            }
                        }
                    }
                }
            }
        }






        //CONTROLE DE CAMERA
        document.addEventListener('keydown', function (event) {
            if (event.keyCode == 65) { //anda com w s a d
                camera.translateX(-0.01);
            }
            if (event.keyCode == 68) {
                camera.translateX(0.01);
            }
            if (event.keyCode == 87) {
                camera.translateZ(-0.01);
            }
            if (event.keyCode == 83) {
                camera.translateZ(0.01);
            }
            if (event.keyCode == 37) { //rota com direcionais
                camera.rotateY(degToRad(0.001));
                camerarotationy = camerarotationy + 0.001;
                if (camerarotationy >= 360) {
                    camerarotationy = camerarotationy - 360;
                }
            }
            if (event.keyCode == 39) {
                camera.rotateY(degToRad(-0.001));
                camerarotationy = camerarotationy - 0.001;
                if (camerarotationy < 0) {
                    camerarotationy = 360 - camerarotationy;
                }
            }
            if (event.keyCode == 38) {
                camera.rotateX(degToRad(0.001));
            }
            if (event.keyCode == 40) {
                camera.rotateX(degToRad(-0.001));
            }
            if (event.keyCode == 70) { //reseta camera com f
                camera.rotation.y = degToRad(0);
                if (camerarotationy > 90 && camerarotationy < 270) {
                    camerarotationy = 180;
                }
                else {
                    camerarotationy = 0;
                }
            }
        });

        renderer.clear();
        renderer.render(scene, camera);
        then = now;
        animate(mixers, deltat); //chama animação
        if (flagpeasant == 1) {//zera flag de animação se ativada
            flagpeasant = 0;
        }
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

main();