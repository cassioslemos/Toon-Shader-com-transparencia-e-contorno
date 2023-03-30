import * as THREE from 'https://threejsfundamentals.org/threejs/resources/threejs/r132/build/three.module.js';
import { ColladaLoader } from 'https://threejsfundamentals.org/threejs/resources/threejs/r132/examples/jsm/loaders/ColladaLoader.js';
import { FBXLoader } from 'https://threejsfundamentals.org/threejs/resources/threejs/r132/examples/jsm/loaders/FBXLoader.js';
import {OBJLoader} from 'https://threejsfundamentals.org/threejs/resources/threejs/r132/examples/jsm/loaders/OBJLoader.js';
import {GLTFLoader} from 'https://threejsfundamentals.org/threejs/resources/threejs/r132/examples/jsm/loaders/GLTFLoader.js';

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
    var flagpeasant = 0; //se a animacao do campones acabou
    const aspect = 2;
    const near = 0.1;
    const far = 150000;
    var mixers = [];
    var camerarotationy = 0; //informa a rotacao da camera
    let Emissionthen = 0;
    let Emissionthen2 = 0;
    let Emissionthen3 = 0;
    let Emissionthen4 = 0;
    var style = "bolha"; //estilo da particula: 0 para bolha, 1 para poeira, 2 para nuvem
    var transparencyon = true; //ativa transparencia
    var transparencylifetimeon = true; //ativa transparencia de acordo com o tempo de vida da particula
    var outlineon = true; //ativa contorno
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(0, 10, 50);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xdddddd);
    var ceugeometry = new THREE.SphereGeometry(10000, 32, 16); //cria esfera do ceu
    var ceuMaterials = new THREE.MeshBasicMaterial({ map: new THREE.TextureLoader().load("/Textures/skycube_1/sky.jpg"), side: THREE.DoubleSide }); //textura do ceu
    var ceu = new THREE.Mesh(ceugeometry, ceuMaterials);
    scene.add(ceu);

    function looppeasant(mixer) { //faz com que o proximo movement do loop seja de onde o ultimo parou
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

    function animate(mixers, delta) { //faz animacao
        requestAnimationFrame(animate);
        if (mixers) {
            for (var i = 0; i < mixers.length; i++) {
                mixers[i].update(delta);
                if (mixers[i].name == "peasant") { //se for animacao do campones
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
     const gltfLoader = new GLTFLoader();

     fbxLoader.load('/Models/town/TEST2.fbx', (town) => { //cria cidade
         town.translateZ(-1000);
         town.scale.set(10,10,10);
         scene.add( town );
     } );

     gltfLoader.load('/Models/magic_lamp/scene.gltf', (gltf) => { //cria lampada magica
        var root = gltf.scene;
        root.translateX(-110);
        root.translateY(58);
        root.translateZ(-1160);
        scene.add(root);
    }); 
 
     colladaloader.load( 'Models/peasant/peasant.dae', function ( collada ) { //cria campones
         var peasant = collada.scene;
         peasant.traverse( function ( node ) {
             if ( node.isSkinnedMesh ) {
                 node.geometry.computeVertexNormals(); //computa vetores normais
             }
         } );
       peasant.translateX(50);
       peasant.translateY(0);
       peasant.translateZ(-756);
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

    function changeTransparency(particle, alpha, shadowColor, lightColor, stencilref, billboard) {
        var vertCode = `# version 300 es
            uniform mat4 projectionMatrix;
            uniform mat4 viewMatrix;
            uniform mat4 modelMatrix;
            uniform bool billboard;



            

            in vec3 position;
            in vec3 normal;
            in vec4 TexCoord;
            in vec2 uv;

            out vec3 n;
            out vec3 FragPos;


            
            
            void main(){
                mat4 ModelView = viewMatrix* modelMatrix;
                
                if(billboard){
                    ModelView[0][0] = length(vec3(modelMatrix[0]));
                    ModelView[0][1] = 0.0;
                    ModelView[0][2] = 0.0;

                    
                    ModelView[1][0] = 0.0;
                    ModelView[1][1] =  length(vec3(modelMatrix[1]));
                    ModelView[1][2] = 0.0;

                    
                    ModelView[2][0] = 0.0;
                    ModelView[2][1] = 0.0;
                    ModelView[2][2] = length(vec3(modelMatrix[2]));
                }
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
                shadowColor: { value: shadowColor },
                lightColor: { value: lightColor },
                uAlpha: { value: alpha },
                billboard: {value: billboard}
            }, vertexShader: vertCode, fragmentShader: fragCode, wireframe: false, side: THREE.DoubleSide, depthTest: true, depthWrite: true, transparent: true, stencilWrite: true, stencilRef: stencilref, stencilFunc:THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp
        });
        particle.material = SphereMaterials;
    }

    function changeTransparencyOutline(particle, alpha, stencilref, billboard) {
        var vertCode = `# version 300 es
            uniform mat4 projectionMatrix;
            uniform mat4 viewMatrix;
            uniform mat4 modelMatrix;
            uniform bool billboard;



            

            in vec3 position;




            
            
            void main(){
                mat4 ModelView = viewMatrix* modelMatrix;
                
                if(billboard){
                    ModelView[0][0] = length(vec3(modelMatrix[0]));
                    ModelView[0][1] = 0.0;
                    ModelView[0][2] = 0.0;

                    
                    ModelView[1][0] = 0.0;
                    ModelView[1][1] =  length(vec3(modelMatrix[1]));
                    ModelView[1][2] = 0.0;

                    
                    ModelView[2][0] = 0.0;
                    ModelView[2][1] = 0.0;
                    ModelView[2][2] = length(vec3(modelMatrix[2]));
                }
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
                billboard: {value: billboard},
                uAlpha: { value: alpha },
            }, vertexShader: vertCode, fragmentShader: fragCode, wireframe: false, side: THREE.DoubleSide, depthTest: true, depthWrite: true, transparent: true, stencilWrite: true, stencilRef: stencilref, stencilFunc: THREE.NotEqualStencilFunc
        });
        particle.material = SphereMaterials;
    }


    class Particle {
        constructor(position, now, alpha, lifetime, movement, shadowColor, lightColor, stencilref, billboard) {
            if (!transparencyon)
                alpha = 1.0;
            var geometry = new THREE.SphereGeometry(2, 32, 16);
            if(style == "poeira"){
            geometry.dynamic = true;
            geometry.attributes.position.needsUpdate = true;
            var positions = geometry.getAttribute("position");
            for (let i = 0; i < positions.count; i++) {
                let Amplitudex = getRandomFloat(0.1, 0.2, 2);
                let Amplitudey = getRandomFloat(0.1, 0.2, 2);
                let Amplitudez = getRandomFloat(0.1, 0.2, 2);
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
        this.shadowColor = shadowColor;
        this.lightColor = lightColor;
        this.stencilref = stencilref;
        this.billboard = billboard;
        this.movementside = getRandomFloat(-5,5,1);
        this.movementside = Math.trunc(this.movementside);
        this.movementside = Math.sign(this.movementside);
            this.vertCode = `# version 300 es
            uniform mat4 projectionMatrix;
            uniform mat4 viewMatrix;
            uniform mat4 modelMatrix;
            uniform bool billboard;



            

            in vec3 position;
            in vec3 normal;
            in vec4 TexCoord;
            in vec2 uv;

            out vec3 n;
            out vec3 FragPos;


            
            
            void main(){
                mat4 ModelView = viewMatrix* modelMatrix;
                
                if(billboard){
                    ModelView[0][0] = length(vec3(modelMatrix[0]));
                    ModelView[0][1] = 0.0;
                    ModelView[0][2] = 0.0;

                    
                    ModelView[1][0] = 0.0;
                    ModelView[1][1] =  length(vec3(modelMatrix[1]));
                    ModelView[1][2] = 0.0;

                    
                    ModelView[2][0] = 0.0;
                    ModelView[2][1] = 0.0;
                    ModelView[2][2] = length(vec3(modelMatrix[2]));
                }
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
                    shadowColor: { value: this.shadowColor },
                    lightColor: { value: this.lightColor },
                    uAlpha: { value: alpha },
                    billboard: {value: this.billboard}
                }, vertexShader: this.vertCode, fragmentShader: this.fragCode, wireframe: false, side: THREE.DoubleSide, depthTest: true, depthWrite: true, transparent: true, stencilWrite: true, stencilRef: stencilref, stencilFunc:THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp
            });
            if(style == "nuvem")
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

        getMovementSide() {
            return this.movementside;
        }

        getStencilRef() {
            return this.stencilref;
        }

        getBillboard() {
            return this.billboard;
        }

        setParticlePosition(position) {
            this.particle.position.set(position.x, position.y, position.z);
        }

        update(deltat, newalpha, movex, movey, movez, invertside) {
            if(movex)
                if(invertside != 0)
                    this.particle.position.set(this.particle.position.x + this.movement.x * deltat * invertside, this.particle.position.y, this.particle.position.z);
                else
                    this.particle.position.set(this.particle.position.x + this.movement.x * deltat * this.movementside, this.particle.position.y, this.particle.position.z);
            if(movey)
                this.particle.position.set(this.particle.position.x, this.particle.position.y + (this.movement.y) * deltat, this.particle.position.z);
            if(movez)
                this.particle.position.set(this.particle.position.x, this.particle.position.y, this.particle.position.z + (this.movement.z) * deltat);
            if(transparencyon && transparencylifetimeon){
                changeTransparency(this.particle, newalpha, this.shadowColor, this.lightColor, this.stencilref, this.billboard);
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
    let particles3 = [];
    let particlesOutline3 = [];
    let particles4 = [];
    let particlesOutline4 = [];
    let transparent = [];


    transparent.push(new ObjectTransparent(Object.keys({ particles })[0], particles));
    transparent.push(new ObjectTransparent(Object.keys({ particles2 })[0], particles2));
    transparent.push(new ObjectTransparent(Object.keys({ particles3 })[0], particles3));
    transparent.push(new ObjectTransparent(Object.keys({ particles4 })[0], particles4));




    camera.rotateX(degToRad(10));

    function render(now) {
        now *= 0.001;
        if (resizeRendererToDisplaySize(renderer)) {
            const canvas = renderer.domElement;
            camera.aspect = canvas.clientWidth / canvas.clientHeight;
            camera.updateProjectionMatrix();
        }
        //Particle System fumaca do campones
        let p;
        let quant_particles;
        let emission_rate_time;
        
        if (now - Emissionthen >= 0.5) {

            quant_particles = 1000;
            emission_rate_time = 30;
            transparencylifetimeon = true;
            style = "nuvem";
            for (let i = 0; i < emission_rate_time; i++) {
                if (particles.length < quant_particles) {
                    var movement = new THREE.Vector3(getRandomFloat(-15.0, 15.0, 2), getRandomFloat(5.0, 20.0, 2), getRandomFloat(-5.0, 5.0, 2));
                    p = new Particle(new THREE.Vector3(45.0, 5.0, -760.0), now, 0.2, 6, movement, new THREE.Color(0x808080), new THREE.Color(0xdcdcdc), 1, false);
                    p.getParticle().scale.set(5.5, 5.5, 5.5);
                    if(outlineon){
                        let p_contorno = p.getParticle().clone();
                        p_contorno.material = new THREE.RawShaderMaterial({
                            uniforms: {
                                billboard: {value: p.getBillboard()},
                                uAlpha: { value: p.getAlpha() },
                            }, vertexShader: `# version 300 es
                        uniform mat4 projectionMatrix;
                        uniform mat4 viewMatrix;
                        uniform mat4 modelMatrix;
                        uniform bool billboard;
            
            
            
                        
            
                        in vec3 position;
            
            
                        
                        
                        void main(){
                            mat4 ModelView = viewMatrix* modelMatrix;
                            
                            if(billboard){
                                ModelView[0][0] = length(vec3(modelMatrix[0]));
                                ModelView[0][1] = 0.0;
                                ModelView[0][2] = 0.0;
                                
                                
                                ModelView[1][0] = 0.0;
                                ModelView[1][1] =  length(vec3(modelMatrix[1]));
                                ModelView[1][2] = 0.0;
                                
                                
                                ModelView[2][0] = 0.0;
                                ModelView[2][1] = 0.0;
                                ModelView[2][2] = length(vec3(modelMatrix[2]));
                            }
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
                        `, wireframe: false, side: THREE.DoubleSide, depthTest: true, depthWrite: true, transparent: true, stencilWrite: true, stencilRef: p.getStencilRef(), stencilFunc: THREE.NotEqualStencilFunc
                        });
                        p_contorno.scale.set(6.0, 6.0, 6.0);
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
                var movex = true;    
                var movey = true;  
                var movez = true;    
                particles[i].update(deltat, newalpha, movex, movey, movez, 1);
                if(outlineon){
                    if(movex)
                        particlesOutline[i].position.set(particlesOutline[i].position.x + particles[i].getMovement().x * deltat, particlesOutline[i].position.y, particlesOutline[i].position.z);
                    if(movey)
                        particlesOutline[i].position.set(particlesOutline[i].position.x, particlesOutline[i].position.y + (particles[i].getMovement().y) * deltat, particlesOutline[i].position.z);
                    if(movez)
                        particlesOutline[i].position.set(particlesOutline[i].position.x, particlesOutline[i].position.y, particlesOutline[i].position.z + (particles[i].getMovement().z) * deltat);
                    if(transparencyon && transparencylifetimeon)
                        changeTransparencyOutline(particlesOutline[i], newalpha, particles[i].getStencilRef(), particles[i].getBillboard());
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
                            particlesOutline[i].scale.set(particlesOutline[i].scale.x - 0.15, particlesOutline[i].scale.y - 0.15, particlesOutline[i].scale.z - 0.15);
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
        
        if (now - Emissionthen2 >= 0.5) {
            quant_particles = 1000;
            emission_rate_time = 30;
            style = "poeira";
            for (let i = 0; i < emission_rate_time; i++) {
                if (particles2.length < quant_particles) {
                    var movement = new THREE.Vector3(getRandomFloat(-10.0, 10.0, 2), getRandomFloat(10.0, 30.0, 2), getRandomFloat(-5.0, 5.0, 2));
                    p = new Particle(new THREE.Vector3(29.0, 74.0, -864.0), now, 0.8, 6, movement, new THREE.Color(0x808080), new THREE.Color(0xdcdcdc), 2, false);
                    p.getParticle().scale.set(0.5, 0.5, 0.5);
                    if(outlineon){
                        let p_contorno = p.getParticle().clone();
                        p_contorno.material = new THREE.RawShaderMaterial({
                            uniforms: {
                                billboard: {value: p.getBillboard()},
                                uAlpha: { value: p.getAlpha() },
                            }, vertexShader: `# version 300 es
                uniform mat4 projectionMatrix;
                uniform mat4 viewMatrix;
                uniform mat4 modelMatrix;
                uniform bool billboard;



                

                in vec3 position;


                
                
                void main(){
                    mat4 ModelView = viewMatrix* modelMatrix;
                    
                    if(billboard){
                        ModelView[0][0] = length(vec3(modelMatrix[0]));
                        ModelView[0][1] = 0.0;
                        ModelView[0][2] = 0.0;
                        
                        
                        ModelView[1][0] = 0.0;
                        ModelView[1][1] =  length(vec3(modelMatrix[1]));
                        ModelView[1][2] = 0.0;
                        
                        
                        ModelView[2][0] = 0.0;
                        ModelView[2][1] = 0.0;
                        ModelView[2][2] = length(vec3(modelMatrix[2]));
                    }
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
                `, wireframe: false, side: THREE.DoubleSide, depthTest: true, depthWrite: true, transparent: true, stencilWrite: true, stencilRef: p.getStencilRef(), stencilFunc: THREE.NotEqualStencilFunc
                        });
                        p_contorno.scale.set(0.8, 0.8, 0.8);
                        particlesOutline2.push(p_contorno);
                    }
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
                var movex = true;    
                var movey = true;  
                var movez = true;  
                particles2[i].update(deltat, newalpha, movex, movey, movez, 1);
                if(outlineon){
                    if(movex)
                        particlesOutline2[i].position.set(particlesOutline2[i].position.x + particles2[i].getMovement().x * deltat, particlesOutline2[i].position.y, particlesOutline2[i].position.z);
                    if(movey)
                        particlesOutline2[i].position.set(particlesOutline2[i].position.x, particlesOutline2[i].position.y + (particles2[i].getMovement().y) * deltat, particlesOutline2[i].position.z);
                    if(movez)
                        particlesOutline2[i].position.set(particlesOutline2[i].position.x, particlesOutline2[i].position.y, particlesOutline2[i].position.z + (particles2[i].getMovement().z) * deltat);
                    if(transparencyon && transparencylifetimeon){
                        changeTransparencyOutline(particlesOutline2[i], newalpha, particles2[i].getStencilRef(), particles2[i].getBillboard());
                    }
                }
                if (particles2[i].getActualLifetime(now) < 1) {
                    particles2[i].getParticle().scale.set(particles2[i].getParticle().scale.x + 0.02, particles2[i].getParticle().scale.y + 0.02, particles2[i].getParticle().scale.z + 0.02);
                    if(outlineon)
                        particlesOutline2[i].scale.set(particlesOutline2[i].scale.x + 0.02, particlesOutline2[i].scale.y + 0.02, particlesOutline2[i].scale.z + 0.02);
                }
                if (particles2[i].getActualLifetime(now) > particles2[i].lifetime - 2.8) {
                    if (particles2[i].getParticle().scale.x - 0.05 >= 0) {
                        particles2[i].getParticle().scale.set(particles2[i].getParticle().scale.x - 0.05, particles2[i].getParticle().scale.y - 0.05, particles2[i].getParticle().scale.z - 0.05);
                        if(outlineon){
                            particlesOutline2[i].scale.set(particlesOutline2[i].scale.x - 0.05, particlesOutline2[i].scale.y - 0.05, particlesOutline2[i].scale.z - 0.05);
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


        //Particle System fumaca da lampada
        if (now - Emissionthen3 >= 0.5) {
            quant_particles = 1000;
            emission_rate_time = 5;
            style = "nuvem";

            for (let i = 0; i < emission_rate_time; i++) {
                if (particles3.length < quant_particles) {
                    var movement = new THREE.Vector3(getRandomFloat(10.0, 12.0, 2), getRandomFloat(10.0, 15.0, 2), getRandomFloat(-5.0, 5.0, 2));
                    p = new Particle(new THREE.Vector3(-106.0, 61.0, -1161.0), now, 0.8, 20, movement, new THREE.Color(0xde3163), new THREE.Color(0x007fff), 3, true);
                    p.getParticle().scale.set(0.1, 0.1, 0.1);
                    if(outlineon){
                        let p_contorno = p.getParticle().clone();
                        p_contorno.material = new THREE.RawShaderMaterial({
                            uniforms: {
                                billboard: {value: p.getBillboard()},
                                uAlpha: { value: p.getAlpha() },
                            }, vertexShader: `# version 300 es
                uniform mat4 projectionMatrix;
                uniform mat4 viewMatrix;
                uniform mat4 modelMatrix;
                uniform bool billboard;



                

                in vec3 position;


                
                
                void main(){
                    mat4 ModelView = viewMatrix* modelMatrix;
                    
                    if(billboard){
                        ModelView[0][0] = length(vec3(modelMatrix[0]));
                        ModelView[0][1] = 0.0;
                        ModelView[0][2] = 0.0;
                        
                        
                        ModelView[1][0] = 0.0;
                        ModelView[1][1] =  length(vec3(modelMatrix[1]));
                        ModelView[1][2] = 0.0;
                        
                        
                        ModelView[2][0] = 0.0;
                        ModelView[2][1] = 0.0;
                        ModelView[2][2] = length(vec3(modelMatrix[2]));
                    }
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
                `, wireframe: false, side: THREE.DoubleSide, depthTest: true, depthWrite: true, transparent: true, stencilWrite: true, stencilRef: p.getStencilRef(), stencilFunc: THREE.NotEqualStencilFunc
                        });
                        p_contorno.scale.set(1.5, 1.5, 1.5);
                        particlesOutline3.push(p_contorno);
                    }
                    particles3.push(p);
                    Emissionthen3 = now;
                }
            }
        }
        var deltat = (now - then) / 2;
        for (let i = 0; i < particles3.length; i++) {
            if (deltat < 1) {
                var newalpha = 1.0;
                var movex = true;    
                var movey = true;  
                var movez = true;  
                if(transparencyon && transparencylifetimeon)
                    newalpha = particles3[i].getAlpha() - (particles3[i].getAlpha() * particles3[i].getActualLifetime(now) / (particles3[i].lifetime - 2.5));
                if (particles3[i].getActualLifetime(now) < 3) {
                    particles3[i].getParticle().scale.set(particles3[i].getParticle().scale.x + 0.05, particles3[i].getParticle().scale.y + 0.05, particles3[i].getParticle().scale.z + 0.05);
                    particles3[i].update(deltat, newalpha, movex, movey, movez, 1);
                    if(outlineon){
                        if(movex)
                            particlesOutline3[i].position.set(particlesOutline3[i].position.x + particles3[i].getMovement().x * deltat, particlesOutline3[i].position.y, particlesOutline3[i].position.z);
                        if(movey)
                            particlesOutline3[i].position.set(particlesOutline3[i].position.x, particlesOutline3[i].position.y + (particles3[i].getMovement().y) * deltat, particlesOutline3[i].position.z);
                        if(movez)
                            particlesOutline3[i].position.set(particlesOutline3[i].position.x, particlesOutline3[i].position.y, particlesOutline3[i].position.z + (particles3[i].getMovement().z) * deltat);
                        if(transparencyon && transparencylifetimeon){
                            changeTransparencyOutline(particlesOutline3[i], newalpha, particles3[i].getStencilRef(), particles3[i].getBillboard());
                        }
                    }
                    if(outlineon)
                        particlesOutline3[i].scale.set(particlesOutline3[i].scale.x + 0.05, particlesOutline3[i].scale.y + 0.05, particlesOutline3[i].scale.z + 0.05);
                }
                if (particles3[i].getActualLifetime(now) >= 3 && particles3[i].getActualLifetime(now) < 4) {
                    movex=false;
                    particles3[i].update(deltat, newalpha, movex, movey, movez, 1);
                    if(outlineon){
                        if(movex)
                            particlesOutline3[i].position.set(particlesOutline3[i].position.x + particles3[i].getMovement().x * deltat * 1, particlesOutline3[i].position.y, particlesOutline3[i].position.z);
                        if(movey)
                            particlesOutline3[i].position.set(particlesOutline3[i].position.x, particlesOutline3[i].position.y + (particles3[i].getMovement().y) * deltat, particlesOutline3[i].position.z);
                        if(movez)
                            particlesOutline3[i].position.set(particlesOutline3[i].position.x, particlesOutline3[i].position.y, particlesOutline3[i].position.z + (particles3[i].getMovement().z) * deltat);
                        if(transparencyon && transparencylifetimeon){
                            changeTransparencyOutline(particlesOutline3[i], newalpha, particles3[i].getStencilRef(), particles3[i].getBillboard());
                         }
                    }
                }

                if (particles3[i].getActualLifetime(now) >= 4 && particles3[i].getActualLifetime(now) < 7) {
                    movex=true;
                    particles3[i].update(deltat, newalpha, movex, movey, movez, -1);
                    if(outlineon){
                        if(movex)
                            particlesOutline3[i].position.set(particlesOutline3[i].position.x + particles3[i].getMovement().x * deltat * -1, particlesOutline3[i].position.y, particlesOutline3[i].position.z);
                        if(movey)
                            particlesOutline3[i].position.set(particlesOutline3[i].position.x, particlesOutline3[i].position.y + (particles3[i].getMovement().y) * deltat, particlesOutline3[i].position.z);
                        if(movez)
                            particlesOutline3[i].position.set(particlesOutline3[i].position.x, particlesOutline3[i].position.y, particlesOutline3[i].position.z + (particles3[i].getMovement().z) * deltat);
                        if(transparencyon && transparencylifetimeon){
                            changeTransparencyOutline(particlesOutline3[i], newalpha, particles3[i].getStencilRef(), particles3[i].getBillboard());
                         }
                    }
                }

                if (particles3[i].getActualLifetime(now) >= 7 && particles3[i].getActualLifetime(now) < 12) {
                    particles3[i].update(deltat, newalpha, movex, movey, movez, 0);
                    particles3[i].getParticle().scale.set(particles3[i].getParticle().scale.x + 0.08, particles3[i].getParticle().scale.y + 0.08, particles3[i].getParticle().scale.z + 0.08);
                    if(outlineon){
                        if(movex)
                            particlesOutline3[i].position.set(particlesOutline3[i].position.x + particles3[i].getMovement().x * deltat * particles3[i].getMovementSide(), particlesOutline3[i].position.y, particlesOutline3[i].position.z);
                        if(movey)
                            particlesOutline3[i].position.set(particlesOutline3[i].position.x, particlesOutline3[i].position.y + (particles3[i].getMovement().y) * deltat, particlesOutline3[i].position.z);
                        if(movez)
                            particlesOutline3[i].position.set(particlesOutline3[i].position.x, particlesOutline3[i].position.y, particlesOutline3[i].position.z + (particles3[i].getMovement().z) * deltat);
                        if(transparencyon && transparencylifetimeon){
                            changeTransparencyOutline(particlesOutline3[i], newalpha, particles3[i].getStencilRef(), particles3[i].getBillboard());
                         }
                        particlesOutline3[i].scale.set(particlesOutline3[i].scale.x + 0.08, particlesOutline3[i].scale.y + 0.08, particlesOutline3[i].scale.z + 0.08);
                    }
                        
                }

                if (particles3[i].getActualLifetime(now) >= 12) {
                    movex = false;
                    movey = false;
                    movez = false;
                    particles3[i].update(deltat, newalpha, movex, movey, movez, 0);
                    if(outlineon){
                        if(movex)
                            particlesOutline3[i].position.set(particlesOutline3[i].position.x + particles3[i].getMovement().x * deltat * particles3[i].getMovementSide(), particlesOutline3[i].position.y, particlesOutline3[i].position.z);
                        if(movey)
                            particlesOutline3[i].position.set(particlesOutline3[i].position.x, particlesOutline3[i].position.y + (particles3[i].getMovement().y) * deltat, particlesOutline3[i].position.z);
                        if(movez)
                            particlesOutline3[i].position.set(particlesOutline3[i].position.x, particlesOutline3[i].position.y, particlesOutline3[i].position.z + (particles3[i].getMovement().z) * deltat);
                        if(transparencyon && transparencylifetimeon){
                            changeTransparencyOutline(particlesOutline3[i], newalpha, particles3[i].getStencilRef(), particles3[i].getBillboard());
                         }
                    }
                    if (particles3[i].getParticle().scale.x - 0.05 >= 0) {
                        particles3[i].getParticle().scale.set(particles3[i].getParticle().scale.x - 0.05, particles3[i].getParticle().scale.y - 0.05, particles3[i].getParticle().scale.z - 0.05);
                        if(outlineon){
                            particlesOutline3[i].scale.set(particlesOutline3[i].scale.x - 0.05, particlesOutline3[i].scale.y - 0.05, particlesOutline3[i].scale.z - 0.05);
                        }
                    }
                    else {
                        particles3[i].getParticle().scale.set(0, 0, 0);
                        if(outlineon)
                            particlesOutline3[i].scale.set(0, 0, 0);
                    }
                }

                if(outlineon)
                    scene.add(particlesOutline3[i]);
                scene.add(particles3[i].getParticle());

                if (particles3[i].getActualLifetime(now) >= particles3[i].lifetime) {
                    scene.remove(particles3[i].getParticle());
                    if(outlineon)
                        scene.remove(particlesOutline3[i]);
                    particles3.splice(i, 1);
                    if(outlineon)
                        particlesOutline3.splice(i, 1);
                    i = i - 1;
                }
            }
        }
        if(transparencyon){
            if (deltat < 1) {
                bubbleSortParticles(particles3, camera, particlesOutline3);
            }
        }


        //Particle System bolhas do lago
        if (now - Emissionthen4 >= 0.5) {
            quant_particles = 10;
            emission_rate_time = 1;
            style = "bolha";
            transparencylifetimeon = false;
            for (let i = 0; i < emission_rate_time; i++) {
                if (particles4.length < quant_particles) {
                    var movement = new THREE.Vector3(getRandomFloat(-10.0, 10.0, 2), getRandomFloat(10.0, 30.0, 2), getRandomFloat(-5.0, 5.0, 2));
                    p = new Particle(new THREE.Vector3(-30.0, -30.0, -790.0), now, 0.3, 3, movement, new THREE.Color(0xafeeee), new THREE.Color(0xffffff), 3, true);
                    p.getParticle().scale.set(0.1, 0.1, 0.1);
                    if(outlineon){
                        let p_contorno = p.getParticle().clone();
                        p_contorno.material = new THREE.RawShaderMaterial({
                            uniforms: {
                                billboard: {value: p.getBillboard()},
                                uAlpha: { value: p.getAlpha() },
                            }, vertexShader: `# version 300 es
                uniform mat4 projectionMatrix;
                uniform mat4 viewMatrix;
                uniform mat4 modelMatrix;
                uniform bool billboard;



                

                in vec3 position;


                
                
                void main(){
                    mat4 ModelView = viewMatrix* modelMatrix;
                    
                    if(billboard){
                        ModelView[0][0] = length(vec3(modelMatrix[0]));
                        ModelView[0][1] = 0.0;
                        ModelView[0][2] = 0.0;
                        
                        
                        ModelView[1][0] = 0.0;
                        ModelView[1][1] =  length(vec3(modelMatrix[1]));
                        ModelView[1][2] = 0.0;
                        
                        
                        ModelView[2][0] = 0.0;
                        ModelView[2][1] = 0.0;
                        ModelView[2][2] = length(vec3(modelMatrix[2]));
                    }
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
                `, wireframe: false, side: THREE.DoubleSide, depthTest: true, depthWrite: true, transparent: true, stencilWrite: true, stencilRef: p.getStencilRef(), stencilFunc: THREE.NotEqualStencilFunc
                        });
                        p_contorno.scale.set(0.3, 0.3, 0.3);
                        particlesOutline4.push(p_contorno);
                    }
                    particles4.push(p);
                    Emissionthen4 = now;
                }
            }
        }
        var deltat = (now - then) / 2;
        for (let i = 0; i < particles4.length; i++) {
            if (deltat < 1) {
                var newalpha = 1.0;
                if(transparencyon && transparencylifetimeon)
                    newalpha = particles4[i].getAlpha() - (particles4[i].getAlpha() * particles4[i].getActualLifetime(now) / (particles4[i].lifetime - 2.5));
                var movex = true;    
                var movey = true;  
                var movez = true;  
                particles4[i].update(deltat, newalpha, movex, movey, movez, 1);
                if(outlineon){
                    if(movex)
                        particlesOutline4[i].position.set(particlesOutline4[i].position.x + particles4[i].getMovement().x * deltat, particlesOutline4[i].position.y, particlesOutline4[i].position.z);
                    if(movey)
                        particlesOutline4[i].position.set(particlesOutline4[i].position.x, particlesOutline4[i].position.y + (particles4[i].getMovement().y) * deltat, particlesOutline4[i].position.z);
                    if(movez)
                        particlesOutline4[i].position.set(particlesOutline4[i].position.x, particlesOutline4[i].position.y, particlesOutline4[i].position.z + (particles4[i].getMovement().z) * deltat);
                    if(transparencyon && transparencylifetimeon){
                        changeTransparencyOutline(particlesOutline4[i], newalpha, particles4[i].getStencilRef(), particles4[i].getBillboard());
                    }
                }
                if (particles4[i].getActualLifetime(now) < 1) {
                    particles4[i].getParticle().scale.set(particles4[i].getParticle().scale.x + 0.02, particles4[i].getParticle().scale.y + 0.02, particles4[i].getParticle().scale.z + 0.02);
                    if(outlineon)
                        particlesOutline4[i].scale.set(particlesOutline4[i].scale.x + 0.02, particlesOutline4[i].scale.y + 0.02, particlesOutline4[i].scale.z + 0.02);
                }

                if(outlineon)
                    scene.add(particlesOutline4[i]);
                scene.add(particles4[i].getParticle());

                if (particles4[i].getActualLifetime(now) >= particles4[i].lifetime) {
                    scene.remove(particles4[i].getParticle());
                    if(outlineon)
                        scene.remove(particlesOutline4[i]);
                    particles4.splice(i, 1);
                    if(outlineon)
                        particlesOutline4.splice(i, 1);
                    i = i - 1;
                }
            }
        }
        if(transparencyon){
            if (deltat < 1) {
                bubbleSortParticles(particles4, camera, particlesOutline4);
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
                                if (transparent[i].getName() == "particles3") {
                                    particlesOutline3[j].renderOrder = transparentquant + transparent[i].getObject().length;
                                }
                                if (transparent[i].getName() == "particles4") {
                                    particlesOutline4[j].renderOrder = transparentquant + transparent[i].getObject().length;
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
                            if (transparent[i].getName() == "particles3") {
                                transparentquant = transparentquant + particles3.length;
                            }
                            if (transparent[i].getName() == "particles4") {
                                transparentquant = transparentquant + particles4.length;
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
        animate(mixers, deltat); //chama animacao
        if (flagpeasant == 1) {//zera flag de animacao se ativada
            flagpeasant = 0;
        }
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

main();