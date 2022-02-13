import * as THREE from 'three/build/three.module.js'
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js'
import {VRButton} from "three/examples/jsm/webxr/VRButton"
import {BoxLineGeometry} from "three/examples/jsm/geometries/BoxLineGeometry"
import {XRControllerModelFactory} from "three/examples/jsm/webxr/XRControllerModelFactory";
import forkPack from "../assets/Fork.glb"
import flashLightPack from "../assets/flash-light.glb"
import lolGlb from "/assets/Beach_Scene.glb"
import balloon from "/assets/Steampunk_Dirigible_with_Ship.glb"
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader";
import {controllers} from "three/examples/jsm/libs/dat.gui.module";
import {SpotLightVolumetricMaterial} from "./utils/SpotLightVolumetricMaterial";
import {FlashLightController} from "./controllers/FlashLightController";
import {StandardController} from "./controllers/StandardController";
import {ForkController} from "./controllers/ForkController";
import {DragController} from "./controllers/DragController";
import {CanvasUI} from "./utils/CanvasUI";
import {fetchProfile} from "three/examples/jsm/libs/motion-controllers.module";
import rock from "/assets/maxresdefault.jpg"

class App {
  constructor() {
    const container = document.createElement('div')
    document.body.appendChild(container)

    // this.camera = new THREE.PerspectiveCamera(60,
    //     window.innerWidth / window.innerHeight, 0.1, 100)
    // this.camera.position.set(0, 0, 4)
    this.camera = new THREE.PerspectiveCamera(50,
        window.innerWidth / window.innerHeight, 0.1, 100)
    this.camera.position.set( 0.1, 1.6, 3 )

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x505050)

    // const ambient = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 0.3)
    const ambient = new THREE.HemisphereLight( 0x606060, 0x404040, 1)
    this.scene.add(ambient)

    const light = new THREE.DirectionalLight(0xffffff)
    // light.position.set(0.2, 1, 1)
    light.position.set( 1, 1, 1 ).normalize()
    this.scene.add(light)

    this.renderer = new THREE.WebGLRenderer({antialias: true})
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.outputEncoding = THREE.sRGBEncoding
    container.appendChild(this.renderer.domElement)


    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.target.set(0, 1.6, 0)
    this.controls.update()

    this.raycaster = new THREE.Raycaster()
    this.workingMatrix = new THREE.Matrix4()
    this.workingVector = new THREE.Vector3()

    this.controllers = []
    this.spotlights = {}

    //this.initSceneCube()
    this.initScene()
    this.initBoxes()
    this.forDebugOnly()
    this.loadGltf()
    this.setupVR()

    this.clock = new THREE.Clock()

    this.renderer.setAnimationLoop(this.render.bind(this))

    window.addEventListener('resize', this.resize.bind(this))
  }

  random( min, max ){
    return Math.random() * (max-min) + min;
  }

  initSceneCube() {
    const geometry = new THREE.BoxBufferGeometry()
    const material = new THREE.MeshStandardMaterial({color: 0xFF0000})

    this.mesh = new THREE.Mesh(geometry, material)

    this.scene.add(this.mesh)

    const geometrySphere = new THREE.SphereGeometry( .7, 32, 16 )
    const materialSphere = new THREE.MeshBasicMaterial( { color: 0xffff00 } )
    const sphere = new THREE.Mesh( geometrySphere, materialSphere )
    this.scene.add( sphere )

    // sphere.position.set(1.5, 0, 0)
  }


  forDebugOnly() {
    const geometrySphere = new THREE.SphereGeometry( .5, 32, 16 )
    const materialSphere = new THREE.MeshBasicMaterial( { color: 0xffff00 } )
    const sphere = new THREE.Mesh( geometrySphere, materialSphere )
    sphere.position.set(0, 1.5, -2)
    this.scene.add( sphere )
  }


  initScene() {
    this.radius = 0.08

    this.movableObjects = new THREE.Group();
    this.scene.add( this.movableObjects);

    this.room = new THREE.LineSegments(
        new BoxLineGeometry(6, 6, 6, 10, 10, 10),
        new THREE.LineBasicMaterial({color: 0x808080})
    )
    this.room.geometry.translate(0, 3, 0)
    //this.scene.add(this.room)

    const geometry = new THREE.IcosahedronBufferGeometry(this.radius, 2)

    for (let i = 0; i < 0; i++) {

      const object = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color: Math.random() * 0xffffff } ))

      object.position.x = this.random(-2, 2)
      object.position.y = this.random(0, 2)
      object.position.z = this.random(-2, 2)

      //this.room.add(objects)
      this.movableObjects.add(object)
    }


    this.highlight = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
      color: 0xFFFFF, side: THREE.BackSide}))
    this.highlight.scale.set(1.2, 1.2, 1.2)
    this.scene.add(this.highlight)


    this.loadAsset(balloon, .5, .5, 1, scene => {
      const self = this
      const scale = 1
      scene.scale.set(scale, scale, scale)
      self.balloon = scene
    })
  }


  initBoxes() {
    this.scene.background = new THREE.Color(0xA0A0A0)
    this.scene.fog = new THREE.Fog(0xA0A0A0, 50,100)
    // ground
    const ground = new THREE.Mesh(
        new THREE.PlaneBufferGeometry(200, 200),
        new THREE.MeshPhongMaterial({color: 0x999999, depthWrite: false}))
    ground.rotation.x = -Math.PI / 2
    this.scene.add(ground)

    var grid = new THREE.GridHelper(100, 40, 0x000000, 0x000000)
    grid.material.opacity = 0.2
    grid.material.transparent = true
    this.scene.add(grid)

    const geometry = new THREE.BoxGeometry(5,4,5)
    const texture = new THREE.TextureLoader().load(rock)
    const material = new THREE.MeshPhongMaterial({map: texture})

    const edges = new THREE.EdgesGeometry(geometry)
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({color: 0x000000, linewidth: 2}))

    this.colliders = []

    for (let x=-100; x < 100; x += 10) {
      for (let z=-100; z < 100; z += 10) {
        if (x == 0 && z == 0) {
          continue
        }
        const box = new THREE.Mesh(geometry, material)
        box.position.set(x, 2.5, z)
        const edge = line.clone()
        edge.position.copy(box.position)
        this.scene.add(box)
        this.scene.add(edge)
        this.colliders.push(box)
      }
    }
  }

loadAsset(glbObject, x, y, z, sceneHandler) {
  const self = this
  const loader = new GLTFLoader()
  loader.load(glbObject, (gltf) => {
        const scene = gltf.scene
        self.scene.add(scene)
        scene.position.set(3, 3, 0)
        sceneHandler(scene)
      },
      null,
      (error) => console.error(`An error happened: ${error}`)
  )
}

  loadGltf() {
    const self = this
    const loader = new GLTFLoader()
    loader.load(
        lolGlb,
        (gltf) => {
          self.chair = gltf.scene
          self.chair.scale.set(.3,.3,.3)
          //self.chair.scale.set(1,1,1)
          // self.chair.scale = new THREE.Vector3(.2,.2,.2)
          self.scene.add(gltf.scene)
          // self.loadingBar.visible = false
          self.renderer.setAnimationLoop(self.render.bind(self))

          self.chair.position.x = 0;
          self.chair.position.y = 0.5;
        },
        null,
        // (xhr) => {
        //   self.loadingBar.progress = xhr.loaded/xhr.total
        // },

        err => {
          console.error(`An error happened: ${err}`)
        }
    )
  }

  setupVR() {
    this.renderer.xr.enabled = true
    document.body.appendChild( VRButton.createButton(this.renderer) )
    const self = this
    let i = 0

    this.dolly = new THREE.Object3D();
    this.dolly.position.z = 0;
    this.dolly.add( this.camera );
    this.scene.add( this.dolly );

    this.dummyCam = new THREE.Object3D();
    this.camera.add( this.dummyCam );

    this.controllers[i] = new FlashLightController(this.renderer, i++, this.scene, this.movableObjects, this.highlight, this.dolly)
    this.controllers[i] = new FlashLightController(this.renderer, i++, this.scene, this.movableObjects, this.highlight, this.dolly)
    // this.controllers[i] = new StandardController(this.renderer, i++, this.scene,
    //     this.movableObjects, this.highlight)
    //this.controllers[i] = new ForkController(this.renderer, i++, this.scene, this.movableObjects, this.highlight)
    //this.controllers[i] = new ForkController(this.renderer, i++, this.scene, this.movableObjects, this.highlight)

    //this.controllers[i] = new DragController(this.renderer, i++, this.scene, this.movableObjects, this.highlight)
    //this.controllers[i] = new DragController(this.renderer, i++, this.scene, this.movableObjects, this.highlight)

    //this.controllers[i] = new StandardController(this.renderer, i++, this.scene, this.movableObjects, this.highlight)
    //this.controllers[i] = new StandardController(this.renderer, i++, this.scene, this.movableObjects, this.highlight, this.dolly)


    if (this.controllers.length > 1){
      this.leftUi = this.createUI()
      this.leftUi.mesh.position.set(1, 1.5, -1)
      this.rightUi = this.createUI()
      this.rightUi.mesh.position.set(-.6, 1.5, -1)
    } else{
      this.leftUi = this.createUI()
    }

  };


  createUI(){
    const config = {
      panelSize: { height: 0.8 },
      height: 500,
      body: { type: "text" }
    }
    const ui = new CanvasUI( { body: "" }, config );
    ui.mesh.position.set(0, 1.5, -1);
    this.scene.add( ui.mesh );
    return ui;
  }

  updateUI(ui, buttonStates){
    if (!buttonStates) {
      return
    }

    const str = JSON.stringify(buttonStates, null, 2);
    if (!ui.userData || ui.userData.strStates === undefined
    || ( str != ui.userData.strStates)){
      ui.updateElement('body', str);
      ui.update();
      if (!ui.userData) {
       ui.userData = {}
      }
      this.strStates = str;
    }
  }


  showDebugText() {
    const dt = this.clock.getDelta()
    if (this.renderer.xr.isPresenting) {
      if(this.elapsedTime === undefined) {
        this.elapsedTime = 0
      }
      this.elapsedTime += dt
      if (this.elapsedTime > 0.3) {
        this.elapsedTime = 0
        if (this.controllers.length > 0)
        this.updateUI(this.leftUi,this.controllers[0].buttonStates)
      }
      if (this.controllers.length > 1)
        this.updateUI(this.rightUi,this.controllers[1].buttonStates)
    } else {
      //this.stats.update()
    }
  }


  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  controllerAction(dt) {
    if (!this.renderer.xr.isPresenting && this.controllers.length === 0) {
      return
    }
    if(this.balloon && this.controllers[0].buttonStates){
      const buttonStates = this.controllers[0].buttonStates
      if (buttonStates["xr_standard_thumbstick"].button){
        const scale = 10
        this.balloon.scale.set(scale, scale, scale)
      } else if (this.balloon) {
        const scale = 5
        this.balloon.scale.set(scale, scale, scale)
      }
      const xAxis = this.controllers[0].buttonStates["xr_standard_thumbstick"].xAxis
      const yAxis = this.controllers[0].buttonStates["xr_standard_thumbstick"].yAxis
      this.balloon.rotateY(0.1 * xAxis)
      this.balloon.translateZ(.02 * yAxis)
    }
    if (this.controllers[0].buttonStates && this.controllers[0]
        .buttonStates["xr_standard_trigger"]
    ) {
      const wallLimit = 1.3
      let pos = this.dolly.position.clone()
      pos.y += 1

      const speed = 2
      const quaternion = this.dolly.quaternion.clone()
      let worldQuaternion = new THREE.Quaternion()
      this.dummyCam.getWorldQuaternion(worldQuaternion)
      this.dolly.quaternion.copy(worldQuaternion)
      this.dolly.translateZ(-dt * speed)
      this.dolly.position.y = 0
      this.dolly.quaternion.copy(quaternion)

      this.dolly.getWorldDirection(this.workingVector)
      this.workingVector.negate()

      this.raycaster.set(pos, this.workingVector)
      const intersect = this.raycaster.intersectObjects(this.colliders)
      if (intersect.length > 0 && intersect[0].distance < wallLimit) {
      this.dolly.translateZ(dt * speed * 10)
    } else {
      this.dolly.translateZ(-dt * speed)
    }
    this.dolly.position.y = 0
    this.dolly.quaternion.copy(quaternion)
  }
}

  render() {
    const dt = this.clock.getDelta()
    if (this.mesh) {
      this.mesh.rotateX(0.005)
      this.mesh.rotateY(0.01)
    }
    if (this.controllers) {

      if (this.renderer.xr.isPresenting && this.controllers) {
        this.controllers.forEach(controller => controller.handle())
      }

    // if (this.controllers.length > 0 && this.controllers[0].buttonStates) {
    //   if (this.controllers[0].buttonStates["xr_standard_trigger"]) {
    //     const speed = 2
    //     const quaternion = this.dolly.quaternion.clone()
    //     let worldQuaternion = new THREE.Quaternion()
    //     this.dummyCam.getWorldQuaternion(worldQuaternion)
    //     this.dolly.quaternion.copy(worldQuaternion)
    //     this.dolly.translateZ(-dt * speed)
    //     this.dolly.position.y = 0
    //     this.dolly.quaternion.copy(quaternion)
    //   }
    this.showDebugText(dt)

    this.controllerAction(dt)
    }
    this.renderer.render(this.scene, this.camera)

    const self = this

    if (this.renderer.xr.isPresenting
        && this.balloon
        && this.controllers.length > 0
        && this.controllers[0].buttonStates
    ) {
      if(this.controllers[0]
              .buttonStates["xr_standard_thumbstick"].button) {
        this.balloon.rotateY(Math.PI / 180/10)
        const scale = 3
        this.balloon.scale.set(scale, scale, scale)
      } else {
        const scale = 1
        this.balloon.scale.set(scale, scale, scale)
      }
      const xAxis = this.controllers[0].buttonStates["xr_standard_thumbstick"].xAxis
      this.balloon.rotateX(Math.PI / 180 * xAxis * 10)
      const yAxis = this.controllers[0].buttonStates["xr_standard_thumbstick"].yAxis
      this.balloon.rotateY(Math.PI / 180 * yAxis * 10)
    }

    if (this.renderer.xr.isPresenting
        && this.balloon
        && this.controllers.length > 0
        && this.controllers[1].buttonStates
    ) {
      const buttonStates = this.controllers[1].buttonStates
      if(buttonStates["xr_standard_thumbstick"].button) {
        this.balloon.rotateY(Math.PI / 180/10)
        const scale = 3
        this.balloon.scale.set(scale, scale, scale)
      } else {
        const scale = 1
        this.balloon.scale.set(scale, scale, scale)
      }
    }

    this.showDebugText()
    this.renderer.render(this.scene, this.camera)
  }
}
export {App}
