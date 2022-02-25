import * as utils from './js/utils.js';
import * as THREE from 'three';
import { MapControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Vector3 } from 'three';
import img from './extras/8kearth.jpg';

const ZOOM = '6';

const scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(15, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.set(-73.935242, 20, -40);


const raycaster = new THREE.Raycaster();

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);

let controls = new MapControls(camera, renderer.domElement);
controls.listenToKeyEvents(window); // optional
controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
controls.dampingFactor = 0.15;
controls.screenSpacePanning = true;
controls.minDistance = 0;
controls.maxDistance = 500;
controls.maxPolarAngle = Math.PI / 2;

const boxDebug = new THREE.BoxGeometry(1, 1, 1);
const debugMat = new THREE.MeshBasicMaterial({ color: '#f00' });
const debugMesh = new THREE.Mesh(boxDebug, debugMat)
//scene.add(debugMesh)
let pending = false;
controls.addEventListener('change', () => {
    raycaster.setFromCamera(new THREE.Vector2(), camera);
    const intersects = raycaster.intersectObject(mesh);
    if (intersects.length === 0) return;
    const pnt = intersects[0].point;
    pnt.y = 0;
    //debugMesh.position.set(pnt.x, pnt.y, pnt.z);
    const tileInfo = utils.latlngzoom2tileStr(pnt.z * -1, pnt.x, ZOOM);
    let tiles = +tileInfo.z + +tileInfo.x + +tileInfo.y;
    if (isNaN(tiles)) return;    //
    if (!utils.tilecache[tileInfo.z.toString()]) {
        utils.tilecache[tileInfo.z.toString()] = {}
    }
    if (!utils.tilecache[tileInfo.z.toString()][tileInfo.x.toString()]) {
        utils.tilecache[tileInfo.z.toString()][tileInfo.x.toString()] = {}
    }
    if (!utils.tilecache[tileInfo.z.toString()][tileInfo.x.toString()][tileInfo.y.toString()] && !pending) {
        //console.log(tileInfo.url);
        pending = true;
        utils.getTile(tileInfo.url)
            .then((geom) => {
                // console.log(geom)
                pending = false;
                utils.tilecache[tileInfo.z.toString()][tileInfo.x.toString()][tileInfo.y.toString()] = geom;
                addGeojsonAsVerts(geom,['park','residential','wood'])
            })
        //console.log(utils.tilecache)
    }
})

const geometry = new THREE.BoxGeometry(360, 0, 180, 12, 1, 6);

var plane = new Image();
plane.src = img;
const texture = new THREE.TextureLoader().load(plane.src);
const material = new THREE.MeshBasicMaterial({ map: texture });
const mesh = new THREE.Mesh(geometry, material)
//mesh.visible = false;
//scene.add(mesh);

controls.target = new Vector3(-73.935242, 0, -40.730610);

const colors = {
    'park':'#0f0',
    'residential':'#00f',
    'wood':'#f00'
}
let object;

function addGeojsonAsVerts(geoms, layernames) {
    //console.log(geoms);
   // const feature_name = 'park'
   scene.remove(object);
    Object.keys(geoms).forEach((featureName) => {
        if (layernames.includes(featureName)) {
            const positions = [];
            const geom = geoms[featureName]
            //console.log(featureName)
            geom.forEach((poly) => {
                for (let idx = 0; idx < poly.triangles.length; idx++) {
                   // console.log(poly.triangles)
                    //console.log(poly.data.vertices)
                    const arrIdx = (poly.triangles[idx]-1)*2
                    positions.push(poly.data.vertices[arrIdx], 0, -poly.data.vertices[arrIdx + 1])
                }
                const geometry = new THREE.BufferGeometry();
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
                geometry.computeVertexNormals();

                object = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({color:colors[featureName]}));
                scene.add(object);
            })
        }
    })

}

const light = new THREE.PointLight( 0xffffff, 100, 100 );
light.position.set( 0, 5, 0 );
scene.add( light );

function animate() {

    requestAnimationFrame(animate);
    renderer.render(scene, camera);
    controls.update();
}
animate();