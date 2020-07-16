if ( WEBGL.isWebGLAvailable() === false ) {
    document.body.appendChild( WEBGL.getWebGLErrorMessage() );
}

import {
    Group, Color, Vector3,
    MeshStandardMaterial, LineBasicMaterial,
    WebGLRenderer,
    OrthographicCamera,
    Scene,
    DirectionalLight, AmbientLight,
    Mesh,
    BoxGeometry, WireframeGeometry, SphereGeometry, CylinderGeometry, BufferGeometry,
    LineSegments,
    TextureLoader,
    sRGBEncoding,
} from 'three';

import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

let camera, scaleCamera;
let scene, scaleScene;
let renderer, controls, scaleControls;
let dLight, aLight, sdLight, saLight;
let Z0, scale, scaleInsetSize;
let rendererWidth, rendererHeight;
let textureName;
let datapoints;

let objectName='camera', sessionName='28', instruction='use';
let mesh = new Mesh();
let hands = new Group();
let global_offset = new Vector3();
let loader = new GLTFLoader(), textureLoader = new TextureLoader();
let geometryLoaded = false, textureLoaded = false;

const scaleObjectSize = 0.01, aLightStrength=1.2, scaleInsetFrac = 0.25, 
    zoomSpeed = 1.2, rotateSpeed = 1.5, thumbnailHeight = 40,
    joint_radius_m = 4e-3, bone_radius_m = 2.5e-3;
const hand_line_ids = [
    [0, 1], [0, 5], [0, 9], [0, 13], [0, 17],
    [1, 2], [2, 3], [3, 4],
    [5, 6], [6, 7], [7, 8],
    [9, 10], [10, 11], [11, 12],
    [13, 14], [14, 15], [15, 16],
    [17, 18], [18, 19], [19, 20],
]
const bone_material = new MeshStandardMaterial({
    color: new Color("rgb(198, 134, 66)"),
    roughness: 0.5,
    metalness: 0.5});
const joint_materials = [
    new MeshStandardMaterial({
        color: new Color("rgb(0, 255, 0)"),
        roughness: 0.5,
        metalness: 0.5
    }),
    new MeshStandardMaterial({
        color: new Color("rgb(255, 0, 0)"),
        roughness: 0.5,
        metalness: 0.5
    })];
const DEV = false;

class App {
    init() {
        // read datapoints information and create dropdown menus
        var datapointsName;
        if (DEV) {
            datapointsName = 'http://localhost:8000/debug_data/contactpose/datapoints.json'
        } else {
            datapointsName = './contactpose_data/datapoints.json';
        }
        $.getJSON(datapointsName, {}, createMenus);
    }
}

// update the object names menu
function updateObjectNames() {
    var thumbArea = document.getElementById("thumbArea");
    thumbArea.innerHTML = "";
    var selectedObject = null;
    for (var o in datapoints[instruction]) {
        if (!datapoints[instruction][o].includes(parseInt(sessionName))) continue;
        if (o == objectName) {
            selectedObject = o;
        }
        var imgName;
        if (DEV) {
            imgName = 'http://localhost:8000/thumbnails/' + o + '.png';
        } else {
            imgName = './thumbnails/' + o + '.png';
        }
        var img = document.createElement("img");
        img.src = imgName;
        img.height = thumbnailHeight;
        var inp = document.createElement("input");
        inp.type = "radio";
        inp.name = "objectNameOptions";
        inp.value = o;
        inp.id = o + "Button";
        inp.autocomplete = "off";
        inp.setAttribute("onchange", "MYAPP.objectNameChanged(this.value)");
        var label = document.createElement("label");
        label.className = "btn btn-outline-primary";
        label.setAttribute("data-toggle", "tooltip");
        label.setAttribute("title", o);
        label.appendChild(inp);
        label.appendChild(img);
        thumbArea.appendChild(label);
    }
    $('[data-toggle="tooltip"]').tooltip();

    if (!selectedObject) {
        for (var o in datapoints[instruction]) {
            if (datapoints[instruction][o].includes(parseInt(sessionName))) {
                selectedObject = o;
                break;
            }
        }
    }
    document.getElementById(selectedObject + "Button").click();
    if (selectedObject != objectName) {
        console.log('Error in updateObjectNames()');
    }
}


// update the session names menu
function updateSessionNames() {
    var menu = document.getElementById("sessionNamesMenu");
    menu.options.length = 0;
    var idxSelected = 0;
    var sessionList = datapoints[instruction][objectName];
    for (var sIdx=0; sIdx < sessionList.length; sIdx++) {
        var s = sessionList[sIdx];
        menu.options[menu.length] = new Option(s, s);
        if (s == sessionName) {
            idxSelected = menu.length - 1;
        }
    }
    menu.options[idxSelected].selected = true;

    if (menu.value != sessionName) {
        // menu.onchange(menu.value);
        console.log('Error in updateSesssionNames()');
    }
}


// update instructions menu
function updateInstructions() {
    var menu = document.getElementById("instructionsMenu");
    menu.options.length = 0;
    const insList = Object.keys(datapoints);
    var idxSelected = 0;
    for (var iIdx=0; iIdx < insList.length; iIdx++) {
        const ins = insList[iIdx];
        if (!(objectName in datapoints[ins]) ||
            !datapoints[ins][objectName].includes(parseInt(sessionName))) continue;
        menu.options[menu.length] = new Option(ins, ins);
        if (ins == instruction) {
            idxSelected = menu.length - 1;
        }
    }
    menu.options[idxSelected].selected = true;

    if (menu.value != instruction) {
        // menu.onchange(menu.value);
        console.log('Error in updateInstructions()');
    }
}


function instructionChanged(value) {
    instruction = value;
    console.log(sessionName + " : " + instruction + " : " + objectName);
    updateSessionNames();
    updateObjectNames();
    updateMesh();
}
function objectNameChanged(value) {
    objectName = value;
    console.log(sessionName + " : " + instruction + " : " + objectName);
    updateInstructions();
    updateSessionNames();
    updateMesh();
}
function sessionNameChanged(value) {
    sessionName = value;
    console.log(sessionName + " : " + instruction + " : " + objectName);
    updateInstructions();
    updateObjectNames();
    updateMesh();
}


function createMenus(jsondata) {
    datapoints = {};
    for (var instr in jsondata) {
        datapoints[instr] = {};
        Object.keys(jsondata[instr]).sort().forEach(function(key) {
            datapoints[instr][key] = jsondata[instr][key];
        });
    }

    var iMenu = document.getElementById('instructionsMenu');
    var idxSelected = 0;
    for (var instr in datapoints) {
        if (instr == instruction) {
            idxSelected = iMenu.length;
        }
        iMenu.options[iMenu.length] = new Option(instr);
    }
    iMenu.options[idxSelected].selected = true;

    initRender();
    iMenu.onchange(iMenu.value);
    animate();
}


function initRender() {
    renderer = new WebGLRenderer({
        antialias: true,
        canvas: document.querySelector("canvas")
    });
    renderer.autoClear = false;
    renderer.outputEncoding = sRGBEncoding;
    renderer.setScissorTest(true);

    // camera = new PerspectiveCamera(60, 2, 0.01, 0.41);
    camera = new OrthographicCamera(-0.2, 0.2, 0.2, -0.2, 0.01, 0.41);
    camera.position.set(0, -0.16, 0.1);
    camera.zoom = 2;
    var cameraTarget = new Vector3(0, 0, 0);
    camera.lookAt(cameraTarget);

    scene = new Scene();
    scene.add(hands);
    mesh.name = 'object';
    scene.add(mesh);
    scene.background = new Color( 0xFFFFFF );

    // Lights
    dLight = new DirectionalLight(0xFFFFFF);
    dLight.position.copy(camera.position);
    scene.add(dLight);

    aLight = new AmbientLight(0xFFFFFF, aLightStrength);
    scene.add(aLight);

    controls = new TrackballControls(camera, renderer.domElement);
    controls.rotateSpeed = rotateSpeed;
    controls.zoomSpeed   = zoomSpeed;
    controls.addEventListener('change', render);

    // add a fixed size object for a sense of scale
    var geom = new BoxGeometry(scaleObjectSize, scaleObjectSize, scaleObjectSize);
    var mat  = new MeshStandardMaterial({
        color: 0x007bff,
        roughness: 0.5, metalness: 0.5
    });
    var scaleObject = new Mesh(geom, mat);
    var wireframe = new WireframeGeometry(geom);
    var line = new LineSegments(wireframe, new LineBasicMaterial({
        color: 'black', linewidth: 2
    }));
    sdLight = new DirectionalLight(0xFFFFFF);
    sdLight.position.copy(camera.position);
    saLight = new AmbientLight(0xFFFFFF, aLightStrength);
    line.depthTest = false;
    scaleScene = new Scene();
    scaleScene.add(scaleObject);
    scaleScene.add(line);
    scaleScene.add(sdLight);
    scaleScene.add(saLight);
    // scaleCamera = new PerspectiveCamera(60, 2, 0.01, 0.41);
    scaleCamera = new OrthographicCamera(-0.2, 0.2, 0.2, -0.2, 0.01, 0.41);
    scaleCamera.position.set(0, -0.16, 0.1);
    scaleCamera.lookAt(cameraTarget);
    scaleCamera.zoom = 2;
    scaleControls = new TrackballControls(scaleCamera, renderer.domElement);
    scaleControls.rotateSpeed = rotateSpeed;
    scaleControls.zoomSpeed   = zoomSpeed;
    scaleControls.noPan = true;
    scaleControls.noZoom = true;

    // Z0 = controls.target.distanceTo(controls.object.position);
    Z0 = controls.object.zoom;
}

function updateMesh() {
    var newMeshName, newAnnotationsName, newTextureName;
    if (DEV) {
        newMeshName = 'http://localhost:8000/debug_data/contactpose/camera.glb';
        newTextureName = 'http://localhost:8000/debug_data/contactpose/full1_use_camera.png';
        newAnnotationsName = 'http://localhost:8000/debug_data/contactpose/full1_use_camera.json';
    } else {
        newMeshName = './contactpose_data/meshes/' + objectName + '.glb';
        newTextureName = './contactpose_data/textures/full' + sessionName +
            '_' + instruction + '_' + objectName + '.png';
        newAnnotationsName = './contactpose_data/annotations/full' + sessionName +
            '_' + instruction + '_' + objectName + '.json';
    }
    if (newTextureName != textureName) {
        textureName = newTextureName;
       
        geometryLoaded = false;
        textureLoaded = false;
        document.getElementById("displayStatus").innerHTML = "Loading: <font color='red'>geometry, texture</font>";
        
        loader.load(newMeshName, onGeometryLoad);
        textureLoader.load(newTextureName, onTextureLoad);
        if (objectName != 'palm_print') {  // palm_print does not have joint annotations
            $.getJSON(newAnnotationsName, {}, createHands);
        }
    }
}


function onTextureLoad (texture) {
    texture.encoding = sRGBEncoding;
    texture.flipY = false;
    let material = new MeshStandardMaterial( {
        color: 'white',
        map: texture,
        roughness: 0.5, metalness: 0.5
    });

    mesh.material.dispose();
    mesh.material = material;
    textureLoaded = true;
    var status;
    if (geometryLoaded) {
        status = "<font color='green'>Loaded</font>";
    } else {
        status = "Loading: <font color='red'>geometry</font>" 
    }
    document.getElementById("displayStatus").innerHTML = status;
}


function onGeometryLoad (gltf) {
    let geometry = new BufferGeometry();
    gltf.scene.traverse(function(child) {
        if (child.geometry != undefined) {
            geometry = child.geometry;
        }
    });
    geometry.scale(1e-3, 1e-3, 1e-3);  // three.js r118 does not read scale
    geometry.computeBoundingBox();
    geometry.boundingBox.getCenter(global_offset);
    geometry.center();
    geometry.computeFaceNormals();
    geometry.computeVertexNormals();
    mesh.geometry.dispose();
    mesh.geometry = geometry;
    geometryLoaded = true;
    var status;
    if (textureLoaded) {
        status = "<font color='green'>Loaded</font>";
    } else {
        status = "Loading: <font color='red'>texture</font>" 
    }
    document.getElementById("displayStatus").innerHTML = status;
}


function createHands(annotations) {
    clearHands();
    annotations['hands'].forEach(function(hand, hand_idx) {
        if (!hand['valid']) return;
        // apply all offsets, transforms etc.
        const hand_joints = hand['joints'].map(function(joint) {
            const j = new Vector3(...joint);
            let v = new Vector3();
            v.subVectors(j, global_offset);
            return v;
        })
        // create new joint spheres
        hand_joints.forEach(function(joint, joint_idx) {
            let geom = new SphereGeometry(joint_radius_m);
            geom.translate(...joint.toArray());
            let m = new Mesh(geom, joint_materials[hand_idx]);
            m.name = 'joint_' + hand_idx + '_' + joint_idx;
            hands.add(m);
        });
        // create new bones
        hand_line_ids.forEach(function(joint_idxs) {
            const jidx0 = joint_idxs[0];
            const jidx1 = joint_idxs[1];
            const j0 = hand_joints[jidx0];
            const j1 = hand_joints[jidx1];
            let v = new Vector3();
            v.subVectors(j1, j0);
            let geom = new CylinderGeometry(bone_radius_m, bone_radius_m,
                v.length());
            geom.translate(0, geom.parameters.height/2.0, 0);
            let m = new Mesh(geom, bone_material);
            m.name = 'bone_' + hand_idx + '_' + jidx0 + '_' + jidx1;
            m.quaternion.setFromUnitVectors(new Vector3(0, 1, 0),
                v.normalize());
            m.position.set(...hand_joints[jidx0].toArray());
            hands.add(m);
        })
    });
}


function clearHands() {
    for (let geom of hands.children) {
        geom.parent.remove(geom);
        geom.geometry.dispose();
    }
    hands.children.length = 0;
}


function finalizeLoading() {
    while (!(geometryLoaded && handsCreated && textureLoaded)) {
        continue;
    }
    debugger;


}


function resizeCanvasToDisplaySize() {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== width || canvas.height !== height) {
        // you must pass false here or three.js sadly fights the browser
        renderer.setSize(width, height, false);
        const aspect = width / height;
        // camera.aspect = aspect;  -- for PerspectiveCamera
        camera.left = -aspect * camera.top;
        camera.right = aspect * camera.top;
        camera.updateProjectionMatrix();

        rendererWidth = width;
        rendererHeight = height;
        scaleInsetSize = Math.round(scaleInsetFrac * Math.min(rendererWidth, rendererHeight));
        var x = Math.round((rendererWidth-scaleInsetSize)/2.0);
        var y = Math.round((rendererHeight-scaleInsetSize)/2.0);
        scaleCamera.setViewOffset(rendererWidth, rendererHeight, x, y,
            scaleInsetSize, scaleInsetSize);
        scaleCamera.left = -aspect * scaleCamera.top;
        scaleCamera.right = aspect * scaleCamera.top;
        scaleCamera.updateProjectionMatrix();
    }
}


function render() {
    dLight.position.copy(camera.position);
    renderer.setViewport(0, 0, rendererWidth, rendererHeight);
    renderer.setScissor(0, 0, rendererWidth, rendererHeight);
    renderer.render( scene, camera );

    renderer.clearDepth();
    sdLight.position.copy(scaleCamera.position);
    let x = rendererWidth - scaleInsetSize;
    let y = rendererHeight - scaleInsetSize;
    renderer.setViewport(x, y, scaleInsetSize, scaleInsetSize);
    renderer.setScissor(x, y, scaleInsetSize, scaleInsetSize);
    renderer.render(scaleScene, scaleCamera);
}


function animate() {
    resizeCanvasToDisplaySize();
    controls.update();
    scaleControls.update();
    // const Z1 = controls.target.distanceTo(controls.object.position);
    // scale = Z1 / Z0 * scaleObjectSize;
    const Z1 = controls.object.zoom;
    scale = Z0 / Z1 * scaleObjectSize;
    let dispScale = document.getElementById("displayScale");
    dispScale.innerHTML = "Cube Size: " + (scale*100).toFixed(1) + " cm";
    // console.log(scale);
    render();
    requestAnimationFrame( animate );
}

export { App, instructionChanged, objectNameChanged, sessionNameChanged }
