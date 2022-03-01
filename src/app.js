import * as utils from './js/utils.js';
import * as THREE from 'three';
import { MapControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Vector3 } from 'three';
import img from './extras/8kearth.jpg';
import { Object3D } from 'three';
import { Vector2 } from 'three';


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

let ZOOM = '5';
let pending = [];
let lastIn = [];
let _zoom = ZOOM;

let map = new Object3D();
scene.add(map)
controls.addEventListener('change', () => {
    //TODO: MOVE ALL THIS INTO UTILS OR A NEW CLASS
    _zoom = Math.max(Math.round(utils.valueMap(camera.position.y, 3, 40, 10, 1))-1, 0).toString();
    if (_zoom !== ZOOM) {
        ZOOM = _zoom;
        pending = [];
        lastIn = [];
        utils.resetTileCache();
        console.log(ZOOM)
        map.clear();
        //return;
    }
    raycaster.setFromCamera(new THREE.Vector2(), camera);
    const intersects = raycaster.intersectObject(mesh);
    if (intersects.length === 0) return;
    const pnt = intersects[0].point;
    pnt.y = 0;

    if (Math.abs(pnt.z) < .01 || Math.abs(pnt.x) < .01) return;

    const GRID_SIZE = 3;

    const centerTileInfo = utils.latlngzoom2tileStr(pnt.z * -1, pnt.x, ZOOM);
    let tiles = +centerTileInfo.z + +centerTileInfo.x + +centerTileInfo.y;
    if (isNaN(tiles)) return;

    for (let _x = centerTileInfo.x - (GRID_SIZE - 2); _x < centerTileInfo.x + (GRID_SIZE - 1); _x++) {
        for (let _y = centerTileInfo.y - (GRID_SIZE - 2); _y < centerTileInfo.y + (GRID_SIZE - 1); _y++) {
            if (!utils.tilecache[centerTileInfo.z.toString()]) {
                utils.tilecache[centerTileInfo.z.toString()] = {}
            }

            if (!utils.tilecache[centerTileInfo.z.toString()][_x.toString()]) {
                utils.tilecache[centerTileInfo.z.toString()][_x.toString()] = {}
            }

            const tileStr = `${centerTileInfo.z.toString()}/${_x.toString()}/${_y.toString()}`;
            if (!utils.tilecache[centerTileInfo.z.toString()][_x.toString()][_y.toString()] && !pending.includes(tileStr)) {
                pending.push(tileStr);
                utils.getTile(tileStr)
                    .then((geom) => {
                        const pIdx = pending.indexOf(tileStr);
                        lastIn.push({
                            __z: centerTileInfo.z.toString(),
                            __x: _x.toString(),
                            __y: _y.toString(),
                            vec: new Vector2(+_x, +_y)
                        });
                        pending.splice(pIdx, 1);
                        const objName = tileStr.replaceAll('/', '-');
                        utils.tilecache[centerTileInfo.z.toString()][_x.toString()][_y.toString()] = objName;//geom;
                        addGeojsonAsVerts(geom, ['park', 'residential', 'wood'], objName)
                    })
            }
            else {
                const center = new Vector2(centerTileInfo.x, centerTileInfo.y);

                lastIn = lastIn.sort((a, b) => {
                    return b.vec.distanceTo(center) - a.vec.distanceTo(center)
                })

                while (lastIn.length > (GRID_SIZE * GRID_SIZE) + 1) {
                    const toPop = lastIn[0];
                    const objNameToRemove = utils.tilecache[toPop.__z][toPop.__x][toPop.__y];
                    let objToRemove = map.getObjectByName(objNameToRemove);

                    if (objToRemove instanceof THREE.Object3D) {
                        map.remove(objToRemove)
                        delete (utils.tilecache[toPop.__z][toPop.__x][toPop.__y]);
                    }
                    lastIn.shift();
                }
            }
        }
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
    'park': '#0f0',
    'residential': '#00f',
    'wood': '#f00'
}


//TODO: MOVE ALL THIS INTO UTILS OR A NEW CLASS
function addGeojsonAsVerts(geoms, layernames, objName) {
    let object = new Object3D();
    object.name = objName;
    Object.keys(geoms).forEach((featureName) => {
        if (layernames.includes(featureName)) {
            const positions = [];
            const geom = geoms[featureName];
            geom.forEach((poly) => {
                for (let idx = 0; idx < poly.triangles.length; idx++) {
                    const arrIdx = (poly.triangles[idx] - 1) * 2
                    positions.push(poly.data.vertices[arrIdx], 0, -poly.data.vertices[arrIdx + 1])
                }
                const geometry = new THREE.BufferGeometry();
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
                geometry.computeVertexNormals();

                let _object = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: colors[featureName] }));
                object.add(_object)
            })
        }
    })
    map.add(object);

}

const light = new THREE.PointLight(0xffffff, 100, 100);
light.position.set(0, 5, 0);
scene.add(light);

const ambient = new THREE.AmbientLight(0xffffff, .5);
scene.add(ambient)

function animate() {

    requestAnimationFrame(animate);
    renderer.render(scene, camera);
    controls.update();
}
animate();