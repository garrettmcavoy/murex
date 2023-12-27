import * as THREE from 'three';
import { DRACOLoader } from './node_modules/three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from './node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import { ShaderPass } from './node_modules/three/examples/jsm/postprocessing/ShaderPass.js';
import { EffectComposer } from './node_modules/three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from './node_modules/three/examples/jsm/postprocessing/RenderPass.js';
import { GammaCorrectionShader } from './node_modules/three/examples/jsm/shaders/GammaCorrectionShader.js';
import { ObjectControls } from '/node_modules/threejs-object-controls/ObjectControls.js';

const container = document.getElementById('canvas-container');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.LinearDisplayP3ColorSpace;
container.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
scene.add(ambientLight);

const plight = new THREE.PointLight(0xffffff, 3, 0, 0);
plight.position.set(100,150,0);
scene.add(plight);

const plight2 = new THREE.PointLight(0xffffff, 20, 0, 0.8);
plight2.position.set(100,150,0);
scene.add(plight2);

camera.position.z = 160;

let conch;
let controls;

const material = new THREE.MeshPhongMaterial({
    color: 0xffffff
});

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/draco/gltf/');

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);
loader.load('./public/Murex_Romosus.gltf', gltf=> {
    conch = gltf.scene.children[0];
conch.material = material;
controls = new ObjectControls(camera, renderer.domElement, conch);
controls.enableVerticalRotation();
controls.disableZoom();
scene.add(conch);
});



const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene,camera);

const DotShader = {

	name: 'DotShader',

	uniforms: {
        'tDiffuse': {value: null},
        'spacing': {value: 8.5},
        'size': {value: 10},
        'resolution': {value: new THREE.Vector2(container.clientWidth, container.clientHeight)},
        'aspectRatio': {value: container.clientWidth / container.clientHeight }
    },

	vertexShader: /* glsl */`

        varying vec2 vUv;

		void main() {

            vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,

	fragmentShader: /* glsl */`

        uniform sampler2D tDiffuse;
        uniform float spacing;
        uniform float size;
        varying vec2 vUv;
        uniform vec2 resolution;

		void main() {
            
            vec2 count = vec2(resolution/spacing);
            vec2 p = floor(vUv*count)/count;
            vec4 color = texture2D(tDiffuse, p);
            vec2 pos = mod(gl_FragCoord.xy, vec2(spacing)) - vec2(spacing/2.0);
            float dist_squared = dot(pos,pos);
			gl_FragColor = mix(color, vec4(0.0, 0.0, 0.0, 1.0), smoothstep(size, size, dist_squared));

		}`

};

const colorsShader = {

	name: 'colorsShader',

	uniforms: {
        'tDiffuse': {value: null},
    },

	vertexShader: /* glsl */`

        varying vec2 vUv;

		void main() {

            vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,

	fragmentShader: /* glsl */`

        uniform sampler2D tDiffuse;
        varying vec2 vUv;

		void main() {

            vec4 base = texture2D(tDiffuse, vUv);
            float luminance = base.g;

            if (luminance > 0.064) {
                gl_FragColor = vec4(.28, .08, 0.08, .1);
            }
            if (luminance >= 0.4) {
                gl_FragColor = vec4(0.1, 0.5, 0.1, 1.0);
            }
            if (luminance >= 0.75) {
                gl_FragColor = vec4(.1, .9, .86, 1.0);
            }

		}`

};

const gammaCorrectionPass = new ShaderPass(GammaCorrectionShader );
const dotShaderPass = new ShaderPass(DotShader);
const colorsPass = new ShaderPass(colorsShader);
composer.addPass(renderPass);
composer.addPass(dotShaderPass);
composer.addPass(colorsPass);
composer.addPass(gammaCorrectionPass);

function animate() {
    requestAnimationFrame(animate);

    if (controls) {
        if (!controls.isUserInteractionActive()) {
        conch.rotation.x += 0.015;
        conch.rotation.y += 0.004;
    }

    composer.render();
}
}

animate();

function onWindowResize() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(container.clientWidth, container.clientHeight);
}

window.addEventListener('resize', onWindowResize);