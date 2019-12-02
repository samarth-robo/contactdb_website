if ( WEBGL.isWebGLAvailable() === false ) {
    document.body.appendChild( WEBGL.getWebGLErrorMessage() );
}

var camera, scene, renderer, controls, dLight, aLight, material, mesh, loader, meshName;
var scaleScene, scaleCamera, Z0, scale, scaleInsetFrac = 0.25, scaleInsetSize, scaleControls;
var sdLight, saLight;
var scaleObjectSize = 0.01;
const zoomSpeed = 0.1, rotateSpeed = 0.25;
var rendererWidth, rendererHeight;
var objectName='ps_controller', sessionName='39', instruction='use';
var datapoints;
var thumbnailHeight = 40;
let hands = new THREE.Group();
var DEV = true;
const hand_line_ids = [
    [0, 1], [0, 5], [0, 9], [0, 13], [0, 17],
    [1, 2], [2, 3], [3, 4],
    [5, 6], [6, 7], [7, 8],
    [9, 10], [10, 11], [11, 12],
    [13, 14], [14, 15], [15, 16],
    [17, 18], [18, 19], [19, 20],
]
const joint_radius_m = 4e-3;
const bone_radius_m = 2.5e-3;
const bone_material = new THREE.MeshStandardMaterial({color: new THREE.Color("rgb(224, 172, 105)")});
const joint_materials = [new THREE.MeshStandardMaterial({color: new THREE.Color("rgb(0, 255, 0)")}),
    new THREE.MeshStandardMaterial({color: new THREE.Color("rgb(255, 0, 0)")})];

init();

function updateObjectNames() {
    // update the object names menu
    var thumbArea = document.getElementById("thumbArea");
    thumbArea.innerHTML = "";
    var selectedObject = Object.keys(datapoints[instruction])[0];
    for (var o in datapoints[instruction]) {
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
        inp.setAttribute("onchange", "objectNameChanged(this.value)");
        var label = document.createElement("label");
        label.className = "btn btn-outline-primary";
        label.setAttribute("data-toggle", "tooltip");
        label.setAttribute("title", o);
        label.appendChild(inp);
        label.appendChild(img);
        thumbArea.appendChild(label);
    }
    $('[data-toggle="tooltip"]').tooltip();
    document.getElementById(selectedObject + "Button").click();
}


function updateSessionNames() {
    // update the session names menu
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
    menu.onchange(menu.value);
}


function updateMenus(instructionSelected, objectNameSelected) {
    if (instructionSelected) {
        updateObjectNames();
    } else if (objectNameSelected) {
        updateSessionNames();
    }
}


function instructionChanged(value) {
    instruction = value;
    updateMenus(true, false);
    updateMesh();
}
function objectNameChanged(value) {
    objectName = value;
    updateMenus(false, true);
    updateMesh();
}
function sessionNameChanged(value) {
    sessionName = value;
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

    iMenu = document.getElementById('instructionsMenu');
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
    renderer = new THREE.WebGLRenderer( { antialias: true, canvas: document.querySelector("canvas") } );
    renderer.autoClear = false;
    renderer.setScissorTest(true);

    // camera = new THREE.PerspectiveCamera(60, 2, 0.01, 0.41);
    camera = new THREE.OrthographicCamera(-0.2, 0.2, 0.2, -0.2, 0.01, 0.41);
    camera.position.set(0, -0.16, 0.1);
    camera.zoom = 2;
    var cameraTarget = new THREE.Vector3(0, 0, 0);
    camera.lookAt(cameraTarget);

    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0xFFFFFF );

    loader = new THREE.PLYLoader();

    // Lights
    dLight = new THREE.DirectionalLight(0xFFFFFF);
    dLight.position.copy(camera.position);
    scene.add(dLight);

    aLight = new THREE.AmbientLight(0xFFFFFF, 1.7);
    scene.add(aLight);

    // controls = new THREE.TrackballControls(camera, renderer.domElement);
    controls = new THREE.OrthographicTrackballControls(camera, renderer.domElement);
    controls.rotateSpeed = rotateSpeed;
    controls.zoomSpeed   = zoomSpeed;
    controls.addEventListener('change', render);

    material = new THREE.MeshStandardMaterial( { color: 'white', vertexColors: THREE.VertexColors } );

    // add a fixed size object for a sense of scale
    var geom = new THREE.BoxGeometry(scaleObjectSize, scaleObjectSize, scaleObjectSize);
    var mat  = new THREE.MeshStandardMaterial({color: 0x007bff});
    var scaleObject = new THREE.Mesh(geom, mat);
    var wireframe = new THREE.WireframeGeometry(geom);
    var line = new THREE.LineSegments(wireframe, new THREE.LineBasicMaterial({color: 'black'}));
    sdLight = new THREE.DirectionalLight(0xFFFFFF);
    sdLight.position.copy(camera.position);
    saLight = new THREE.AmbientLight(0xFFFFFF, 1.7);
    line.depthTest = false;
    scaleScene = new THREE.Scene();
    scaleScene.add(scaleObject);
    scaleScene.add(line);
    scaleScene.add(sdLight);
    scaleScene.add(saLight);
    // scaleCamera = new THREE.PerspectiveCamera(60, 2, 0.01, 0.41);
    scaleCamera = new THREE.OrthographicCamera(-0.2, 0.2, 0.2, -0.2, 0.01, 0.41);
    scaleCamera.position.set(0, -0.16, 0.1);
    scaleCamera.lookAt(cameraTarget);
    scaleCamera.zoom = 2;
    // scaleControls = new THREE.TrackballControls(scaleCamera, renderer.domElement);
    scaleControls = new THREE.OrthographicTrackballControls(scaleCamera, renderer.domElement);
    scaleControls.rotateSpeed = rotateSpeed;
    scaleControls.zoomSpeed   = zoomSpeed;
    scaleControls.noPan = true;
    scaleControls.noZoom = true;

    // Z0 = controls.target.distanceTo(controls.object.position);
    Z0 = controls.object.zoom;
}


function init() {
    // read datapoints information and create dropdown menus
    var datapointsName;
    if (DEV) {
        datapointsName = 'http://localhost:8000/debug_data/contactpose/datapoints.json'
    } else {
        datapointsName = './datapoints.json';
    }
    $.getJSON(datapointsName, {}, createMenus);
}


function updateMesh() {
    var newMeshName, newAnnotationsName;
    if (DEV) {
        newMeshName = 'http://localhost:8000/debug_data/contactpose/full39_use_ps_controller.ply'
        newAnnotationsName = 'http://localhost:8000/debug_data/contactpose/full39_use_ps_controller.json'
    } else {
        newMeshName = './contactpose/meshes/full' + sessionName + '_' + 
            instruction + '_' + objectName + '.ply';
        newAnnotationsName = '.contactpose/annotations/full' + sessionName +
            '_' + instruction + '_' + objectName + '.json';
    }
    if (newMeshName != meshName) {
        var dispStatus = document.getElementById("displayStatus");
        dispStatus.innerHTML = "Status: <font color='red'>Loading</font>";
        meshName = newMeshName;
        loader.load(meshName, onGeometryLoad);
        $.getJSON(newAnnotationsName, {}, createHands);
    }
}


function onGeometryLoad ( geometry ) {
    geometry.center();
    geometry.computeFaceNormals();
    geometry.computeVertexNormals();

    if (mesh == null) {
        mesh = new THREE.Mesh( geometry, material );
        mesh.name = 'object';
        scene.add(mesh);
    } else {
        mesh.geometry.dispose();
        mesh.geometry = geometry;
    }
    var dispStatus = document.getElementById("displayStatus");
    dispStatus.innerHTML = "Status: Loaded <font color='green'>" + objectName + ", " + instruction + ", #" + sessionName + "</font>";
}


function createHands(annotations) {
    // remove all geoms
    for (geom of hands.children) {
        geom.geometry.dispose();
        hands.remove(geom);
    }
    scene.remove(hands);

    annotations['hands'].forEach(function(hand, hand_idx) {
        if (!hand['valid']) return;
        // create new joint spheres
        hand['joints'].forEach(function(joint, joint_idx) {
            let geom = new THREE.SphereGeometry(radius=joint_radius_m);
            geom.translate(...joint);
            let m = new THREE.Mesh(geom, joint_materials[hand_idx]);
            m.name = 'joint_' + hand_idx + '_' + joint_idx;
            hands.add(m);
        });
        // create new bones
        hand_line_ids.forEach(function(joint_idxs) {
            const jidx0 = joint_idxs[0];
            const jidx1 = joint_idxs[1];
            const j0 = new THREE.Vector3(...hand['joints'][jidx0]);
            const j1 = new THREE.Vector3(...hand['joints'][jidx1]);
            let v = new THREE.Vector3();
            v.subVectors(j1, j0);
            let geom = new THREE.CylinderGeometry(bone_radius_m, bone_radius_m,
                v.length());
            geom.translate(0, geom.parameters.height/2.0, 0);
            let m = new THREE.Mesh(geom, bone_material);
            m.name = 'bone_' + hand_idx + '_' + jidx0 + '_' + jidx1;
            m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0),
                v.normalize());
            m.position.set(...hand['joints'][jidx0]);
            hands.add(m);
        })
    });
    scene.add(hands);
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
        scaleCamera.setViewOffset(rendererWidth, rendererHeight, x, y, scaleInsetSize, scaleInsetSize);
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
    x = rendererWidth - scaleInsetSize;
    y = rendererHeight - scaleInsetSize;
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
    var dispScale = document.getElementById("displayScale");
    dispScale.innerHTML = "Cube Size: " + (scale*100).toFixed(1) + " cm";
    // console.log(scale);
    render();
    requestAnimationFrame( animate );
}
