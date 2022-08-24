<script setup>
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Color,
  AxesHelper,
  Clock,
  DirectionalLight,
  Vector2,
  CameraHelper,
  CubeTextureLoader,
  sRGBEncoding,
  BufferGeometry,
  PointsMaterial,
  Points,
  BufferAttribute,
  Group,
  Raycaster,
  Mesh,
  SphereGeometry,
  MeshStandardMaterial,
  InstancedBufferGeometry,
  InstancedBufferAttribute,
  MeshBasicMaterial,
  PlaneBufferGeometry,
  ShaderMaterial,
  LoadingManager,
  Vector3,
  Object3D,
} from "three";
import { onMounted, ref, render, watchEffect } from "vue";
import gsap from "gsap";
import STLLoader from "./loaders/STLLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GUI } from "dat.gui";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import sensorsData from "../assets/bim/sensorsData";

/**************************************
 ******** Loaders
 *************************************/
const onLoad = () => {
  gsap.delayedCall(0.5, () => {
    document.querySelector("#loading-text").style.opacity = 0;
    document.querySelector("#loading-bar").style.transform = "scaleX(0)";
    document.querySelector("#loading-bar").classList.add("ended");

    setTimeout(
      () => {
        document.querySelector("#loading-container").style.display = "none";
        document.querySelector("#overlay-absolute").style.display = "initial";
      },

      2000
    );

    gsap.to(overlayMat.uniforms.uAlpha, { duration: 2, value: 0 });
  });
};

const onProgress = (iteUrl, itemsLoaded, itemsTotal) => {
  document.querySelector("#loading-bar").style.transform = `scaleX(${
    itemsLoaded / itemsTotal
  })`;
};

const onError = () => {};

const loadingManager = new LoadingManager(onLoad, onProgress, onError);

const gltfLoader = new GLTFLoader(loadingManager);
const cubeTexureLoader = new CubeTextureLoader(loadingManager);

/**************************************
 ******** GUI
 *************************************/
const gui = new GUI();
const sceneSetup = gui.addFolder("Scene Setup");
const sunSetup = gui.addFolder("Sun Setup");
const sensorsLayers = gui.addFolder("sensors");

/**************************************
 ******** Parameters
 *************************************/
const params = {
  color: "#fff",
  sunColor: "#fff",
  bounceColor: "#fff",
  ambientColor: "#fff",
  shine: 10,
  cubeColor: 0,
};

/**************************************
 ******** Scene
 *************************************/
const scene = new Scene();

/**************************************
 ******** Environment
 *************************************/
const environment = cubeTexureLoader.load([
  "assets/HDRI/_1/px.png",
  "assets/HDRI/_1/nx.png",
  "assets/HDRI/_1/py.png",
  "assets/HDRI/_1/ny.png",
  "assets/HDRI/_1/pz.png",
  "assets/HDRI/_1/nz.png",
]);

const backgroundParams = {
  visible_env: true,
  background_color: "#9ba3b0",
};

scene.background = backgroundParams.visible_env
  ? environment
  : backgroundParams.background_color;
scene.environment = environment;

// GUI
sceneSetup
  .add(backgroundParams, "visible_env")
  .name("Visible ENV")
  .onChange(() => {
    scene.background = backgroundParams.visible_env
      ? environment
      : new Color(backgroundParams.background_color);
  });

sceneSetup.addColor(backgroundParams, "background_color").onChange(() => {
  scene.background = new Color(backgroundParams.background_color);
});

/**************************************
 ******** Camera
 *************************************/
const camera = new PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(30, 20, 70);

/**************************************
 ******** Z Up
 *************************************/
Object3D.DefaultUp = new Vector3(0, 0, 1);
camera.up.set(0, 0, 1);

const sun = new DirectionalLight(params.sunColor, 3);
sun.position.set(-50, 30, 50);
sun.castShadow = true;

sun.shadow.mapSize = new Vector2(4096, 4096);
sun.shadow.camera.far = 300;
sun.shadow.camera.left = -50;
sun.shadow.camera.right = 50;
sun.shadow.camera.top = 50;
sun.shadow.camera.bottom = -50;

scene.add(sun);

const sunCamHelper = new CameraHelper(sun.shadow.camera);
sunCamHelper.visible = false;
scene.add(sunCamHelper);

// GUI
sunSetup.add(sunCamHelper, "visible").name("Sun Shaper");
sunSetup.add(sun.position, "x").name("Sun X").min(-200).max(200).step(0.001);
sunSetup.add(sun.position, "y").name("Sun Y").min(-200).max(200).step(0.001);
sunSetup.add(sun.position, "z").name("Sun Z").min(-200).max(200).step(0.001);

// const sunHelper = new DirectionalLightHelper(sun, 1)
// scene.add(sunHelper)

/**************************************
 ******** Renderer
 *************************************/
const viewportSize = {
  x: 1280,
  y: 720,
};
const renderer = new WebGLRenderer();
renderer.shadowMap.enabled = true;
renderer.setSize(viewportSize.x, viewportSize.y);
renderer.physicallyCorrectLights = true;

renderer.outputEncoding = sRGBEncoding;

/**************************************
 ******** Controls
 *************************************/
const orbitControls = new OrbitControls(camera, renderer.domElement);
// orbitControls.autoRotate = true
orbitControls.enableDamping = true;
orbitControls.dampingFactor = 0.1;

/**************************************
 ******** Overlay
 *************************************/

const overlayGeo = new PlaneBufferGeometry(2, 2, 1, 1);
const overlayMat = new ShaderMaterial({
  transparent: true,
  uniforms: {
    uAlpha: { value: 1 },
  },
  vertexShader: `
  void main() {
    gl_Position = vec4( position, 1.0);
  }
  `,
  fragmentShader: `
    uniform float uAlpha;

    void main() {
    gl_FragColor = vec4( 1.0, 1.0, 1.0, uAlpha );
  }
  `,
});
const overlay = new Mesh(overlayGeo, overlayMat);
scene.add(overlay);

/**************************************
 ******** Color Ramp
 *************************************/
//Color Ramp Class
class ColorRamp {
  //Takes a list of colors
  constructor(list) {
    this.list = list;
    this.color = new Color();
  }

  //Returns color at position t
  at(t) {
    //Find indexes
    let start = Math.floor(t * this.list.length);
    let end = (start + 1) % this.list.length;

    //Amount between two colors
    let tt = t * this.list.length - start;

    //Copy and interpolate, return color
    this.color.copy(this.list[start]);
    this.color.lerp(this.list[end], tt);
    return this.color;
  }
}

//Create Ramp Instance (https://coolors.co/c8ffbe-edffab-ba9593-89608e-623b5a)
var ramp = new ColorRamp([
  new Color("#1922B3"),
  new Color("#5134E6"),
  new Color("#AA39F0"),
  new Color("#CE42F1"),
  new Color("#F673F4"),
  new Color("#FBC2F9"),
]);

/**************************************
 ******** Range conversion
 *************************************/

const rangeConverter = (
  oldValue,
  { oldMin = 0, oldMax = 4000, newMin = 0, newMax = 0.5 }
) => {
  const oldRange = oldMax - oldMin;
  const newRange = newMax - newMin;
  const newValue = ((oldValue - oldMin) * newRange) / oldRange + newMin;

  return newValue;
};

/**************************************
 ******** Cursor
 *************************************/
let cursor = new Vector2(0, 0);

// cursor.x = (clientX / viewportSize.x) * 2 - 1

/**************************************
 ******** Entire Scene Group
 *************************************/
const entireScene = new Group();
scene.add(entireScene);

/**************************************
 ******** Terrain
 *************************************/
const terrainParams = {
  visible: true,
};

gltfLoader.load("assets/bim/terrain.glb", (terrain) => {
  terrain.scene.traverse((object) => {
    if (object.isMesh) {
      object.receiveShadow = true;
    }
  });

  // GUI
  sceneSetup
    .add(terrainParams, "visible")
    .name("Terrain")
    .onChange(() =>
      terrain.scene.traverse((object) => {
        if (object.isMesh) {
          object.visible = terrainParams.visible;
        }
      })
    );

  entireScene.add(terrain.scene);
});

/**************************************
 ******** Base Building
 *************************************/
const baseBuildingParams = {
  visible: true,
};

gltfLoader.load("assets/bim/baseBuilding.glb", (baseBuilding) => {
  baseBuilding.scene.traverse((object) => {
    if (object.isMesh) {
      object.receiveShadow = true;
      object.castShadow = true;
    }
  });

  // GUI
  sceneSetup
    .add(baseBuildingParams, "visible")
    .name("Base Building")
    .onChange(() =>
      baseBuilding.scene.traverse((object) => {
        if (object.isMesh) {
          object.visible = baseBuildingParams.visible;
        }
      })
    );

  entireScene.add(baseBuilding.scene);
});

/**************************************
 ******** Surrounding Buildings
 *************************************/
const surroundingParams = {
  visible: true,
};

gltfLoader.load(
  "assets/bim/surroundingBuildings.glb",
  (surroundingBuildings) => {
    // GUI
    sceneSetup
      .add(surroundingParams, "visible")
      .name("Surroundings")
      .onChange(() =>
        surroundingBuildings.scene.traverse((object) => {
          if (object.isMesh) {
            object.visible = surroundingParams.visible;
          }
        })
      );

    entireScene.add(surroundingBuildings.scene);
  }
);

/**************************************
 ******** Trees
 *************************************/
const treesParams = {
  visible: true,
};

gltfLoader.load("assets/bim/trees.glb", (trees) => {
  // GUI
  sceneSetup
    .add(treesParams, "visible")
    .name("Trees")
    .onChange(() =>
      trees.scene.traverse((object) => {
        if (object.isMesh) {
          object.visible = treesParams.visible;
        }
      })
    );

  entireScene.add(trees.scene);
});

/**************************************
 ******** Window Glasses
 *************************************/
const glassesParams = {
  visible: true,
};

gltfLoader.load("assets/bim/glasses.glb", (glasses) => {
  // GUI
  sceneSetup
    .add(glassesParams, "visible")
    .name("Glasses")
    .onChange(() =>
      glasses.scene.traverse((object) => {
        if (object.isMesh) {
          object.visible = glassesParams.visible;
        }
      })
    );

  entireScene.add(glasses.scene);
});

/**************************************
 ******** Particles
 *************************************/
const sensorsGroup = new Group();
// Placement
const sensorsGeo = new BufferGeometry();
// const sensorsGeo = new InstancedBufferGeometry()
const count = sensorsData.length;
sensorsGeo.instanceCount = sensorsData.length;

const sensorPositions = new Float32Array(count * 3);
const sensorColors = new Float32Array(count * 3);

let flatPositions = [];
let rgbFlatColors = [];

sensorsData.forEach(({ utmX, utmY, utmZ, sun_hours }) => {
  flatPositions.push(utmX);
  flatPositions.push(utmY);
  flatPositions.push(utmZ);

  rgbFlatColors.push(ramp.at(rangeConverter(sun_hours, {})).r);
  rgbFlatColors.push(ramp.at(rangeConverter(sun_hours, {})).g);
  rgbFlatColors.push(ramp.at(rangeConverter(sun_hours, {})).b);
});

for (let i = 0; i < count * 3; i++) {
  sensorPositions[i] = flatPositions[i];
  sensorColors[i] = rgbFlatColors[i];
}

sensorsGeo.setAttribute("position", new BufferAttribute(sensorPositions, 3));
sensorsGeo.setAttribute("color", new BufferAttribute(sensorColors, 3));

// sensorsGeo.setAttribute(
//   'position',
//   new InstancedBufferAttribute(sensorPositions, 3)
// )
// sensorsGeo.setAttribute('color', new InstancedBufferAttribute(sensorColors, 3))

// Material
const sensorsMat = new PointsMaterial({
  size: 0.5,
  sizeAttenuation: true,
  vertexColors: true,
});

// const sensors = new Mesh(sensorsGeo, new MeshBasicMaterial())
const sensors = new Points(sensorsGeo, sensorsMat);

sensorsGroup.add(sensors);
sensorsGroup.rotateX(Math.PI * -0.5);

entireScene.add(sensorsGroup);

// GUI
sensorsLayers.add(sensorsGroup, "visible").name("Sun Hours");

/**************************************
 ******** Y Rotation Fix
 *************************************/
entireScene.rotateY(Math.PI * -0.36);

/**************************************
 ******** Axes
 *************************************/
const axes = new AxesHelper(50);
scene.add(axes);

console.log(sensorsData[1107]);

/**************************************
 ******** Points of interest
 *************************************/
const pointsOfInterest = [
  {
    id: "pointID000",
    position: { x: 0, y: 0, z: 0 },
    info: "Information for point 000",
  },
  // {
  //   id: '111',
  //   position: { x: 32, y: 20, z: 10 },
  //   info: 'Information for point 111',
  // },
  // {
  //   id: '222',
  //   position: { x: 50, y: 12, z: 5 },
  //   info: 'Information for point 222',
  // },
];

/**************************************
 ******** POIs placement
 *************************************/
const POIsPlacement = () => {
  pointsOfInterest.forEach(({ id, position: { x, y, z }, info }) => {
    const cameraNormalPosition = new Vector3(x, y, z).clone();
    cameraNormalPosition.project(camera);

    let translateX = cameraNormalPosition.x * viewportSize.x * 0.5;
    let translateY = -cameraNormalPosition.y * viewportSize.y * 0.5;

    // keeping the POI in the 3D viewer boundary
    if (translateX > viewportSize.x / 2) translateX = viewportSize.x / 2;
    else if (translateX < -viewportSize.x / 2) translateX = -viewportSize.x / 2;

    if (translateY > viewportSize.y / 2) translateY = viewportSize.y / 2;
    else if (translateY < -viewportSize.y / 2) translateY = -viewportSize.y / 2;

    document.querySelector(
      `#${id}`
    ).style.transform = `translateX(${translateX}px) translateY(${translateY}px)`;
  });
};

/**************************************
 ******** Show Sensor Info
 *************************************/
const showSensorInfo = ({
  ID,
  cDif,
  sun_hours,
  direct_energy_intake,
  diffuse_energy_intake,
  global_energy_intake,
  utmX,
  utmY,
  utmZ,
}) => {
  // const cameraNormalPosition = new Vector3(utmX, utmY, utmZ).clone()
  // cameraNormalPosition.project(camera)

  // const translateX = cameraNormalPosition.x * viewportSize.x * 0.5
  // const translateY = -cameraNormalPosition.y * viewportSize.y * 0.5

  document.body.style.cursor = "help";

  const element = document.querySelector("#sensor-info");
  element.innerHTML = `
    <b style="font-size: larger; font-weight: bold">Sensor Info</b>
    <p>
      ID: <span class="sensor-value">${ID}</span>
    </p>
    <p>cDif: <span class="sensor-value">${cDif}</span></p>
    <p>Sun Hours: <span class="sensor-value">${sun_hours}</span></p>
    <p>Direct Energy Intake: <span class="sensor-value">${direct_energy_intake}</span></p>
    <p>Diffuse Energy Intake: <span class="sensor-value">${diffuse_energy_intake}</span></p>
    <p>Global Energy Intake: <span class="sensor-value">${global_energy_intake}</span></p>
    <p>UTM X: <span class="sensor-value">${utmX}</span></p>
    <p>UTM Y: <span class="sensor-value">${utmY}</span></p>
    <p>UTM Z: <span class="sensor-value">${utmZ}</span></p>
  `;
  element.style.opacity = 1;
  // element.style.transform = `translateX(${translateX}px) translateY(${translateY}px)`
};

const clock = new Clock();

/**************************************
 ******** Tick
 *************************************/
const tick = () => {
  // Time
  const elapsedTime = clock.getElapsedTime();

  // required if controls.enableDamping or controls.autoRotate are set to true
  orbitControls.update();

  // sunHelper.update()

  // Ray Caster
  const raycaster = new Raycaster();
  raycaster.params.Points.threshold = 0.1;
  raycaster.setFromCamera(cursor, camera);

  // document.querySelector('#sensor-info').style.opacity = 0
  document.body.style.cursor = "auto";

  const intersects = raycaster.intersectObject(sensors, false);
  intersects.forEach((intersect) => {
    showSensorInfo(sensorsData[intersect.index]);
  });

  POIsPlacement();

  /**************************************
   ******** Render
   *************************************/
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
};

/**************************************
 ******** On Mount
 *************************************/
onMounted(() => {
  document
    .querySelector("#webgl")
    .appendChild(renderer.domElement)
    .addEventListener("pointermove", ({ offsetX, offsetY }) => {
      cursor.x = (offsetX / viewportSize.x) * 2 - 1;
      cursor.y = -((offsetY / viewportSize.y) * 2 - 1);
    });

  tick();
});
</script>

<template>
  <!-- <h1>3D Viewer</h1> -->

  <div class="container">
    <main id="webgl">
      <div id="loading-container">
        <b id="loading-text">Leaftech</b>
        <div id="loading-bar"></div>
      </div>

      <div id="overlay-absolute">
        <div class="point" id="pointID000">
          <span class="label">Point Of Interest 01</span>
          <div class="info">
            At vero est diam sadipscing elitr et sit, lorem dolores et lorem
            kasd eos, ut ut et duo sed magna.
          </div>
        </div>
      </div>
    </main>

    <div id="sensor-info">
      <b style="font-size: larger; font-weight: bold">Sensor Info</b>
      <p>ID: <span class="sensor-value">${ID}</span></p>
      <p>cDif: <span class="sensor-value">${cDif}</span></p>
      <p>Sun Hours: <span class="sensor-value">${sun_hours}</span></p>
      <p>
        Direct Energy Intake:
        <span class="sensor-value">${direct_energy_intake}</span>
      </p>
      <p>
        Diffuse Energy Intake:
        <span class="sensor-value">${diffuse_energy_intake}</span>
      </p>
      <p>
        Global Energy Intake:
        <span class="sensor-value">${global_energy_intake}</span>
      </p>
      <p>UTM X: <span class="sensor-value">${utmX}</span></p>
      <p>UTM Y: <span class="sensor-value">${utmY}</span></p>
      <p>UTM Z: <span class="sensor-value">${utmZ}</span></p>
    </div>
  </div>
</template>

<style>
.container {
  display: grid;
  grid-template-rows: 1fr;
  grid-template-columns: auto 1fr;
  grid-gap: 2em;
  max-width: 83vw;
  margin-left: 2em;
  margin-top: 15vh;
}

h1 {
  color: black;
  font-weight: bold;
}

#webgl {
  position: relative;
}

#loading-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: absolute;
  top: 35%;
  width: 100%;
  z-index: 1;
}

#loading-bar {
  width: 100%;
  height: 5px;
  background-color: #3087df;
  transform: scaleX(0);
  transform-origin: top left;
  transition: transform 0.5s;
}

#loading-bar.ended {
  transform-origin: top right;
  transition: transform 0.5s ease-in-out;
  will-change: transform;
}

#loading-text {
  color: #3087df;
  font-weight: bold;
  font-size: 5em;
  font-family: "Exo", sans-serif;
  margin-bottom: 0.5em;
  transition: opacity 0.5s;
}

#overlay-absolute {
  display: none;
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

.point {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 1;
  color: #e9e9e9;
  font-size: 0.85em;
  pointer-events: none;
}

.label {
  border-radius: 5px;
  background-color: #00000080;
  padding: 0.35em;
  width: fit-content;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 2em;
  pointer-events: auto;
  cursor: help;
}

.label:hover ~ .info {
  opacity: 1;
}

.info {
  opacity: 0;
  border-radius: 5px;
  background-color: #00000080;
  padding: 0.5em;
  width: fit-content;
  display: flex;
  justify-content: center;
  align-items: center;
  max-width: 20em;
  margin-top: 0.75em;
  pointer-events: none;
  transition: opacity ease-in 0.1s;
}

#sensor-info {
  /* position: absolute; */
  /* top: 0.5em; */
  /* left: 0.5em; */
  /* opacity: 0; */
  width: 100%;
  border-radius: 5px;
  background-color: #ffffffcc;
  padding: 0.5em;
  display: flex;
  flex-direction: column;
  pointer-events: none;
  transition: opacity ease-in 0.1s;
  color: black;
  font-size: 0.7em;
  z-index: 1;
  font-weight: normal;
}

.sensor-value {
  color: #3087df;
  font-size: 0.75rem;
}
</style>
