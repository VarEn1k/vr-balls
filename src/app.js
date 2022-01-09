import * as THREE from 'three/build/three.module.js'
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js'
import {VRButton} from "three/examples/jsm/webxr/VRButton"
import {BoxLineGeometry} from "three/examples/jsm/geometries/BoxLineGeometry"
import {XRControllerModelFactory} from "three/examples/jsm/webxr/XRControllerModelFactory";
import forkPack from "../assets/Fork.glb"
import flashLightPack from "../assets/flash-light.glb"
import officeChairGlb from "/assets/Cute Cartoon Character.glb"
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader";
import {controllers} from "three/examples/jsm/libs/dat.gui.module";
import {SpotLightVolumetricMaterial} from "./utils/SpotLightVolumetricMaterial";


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
    //this.workingVector = new THREE.Vector3()

    this.controllers = []
    this.spotlights = {}

    // this.initSceneCube()
    this.initScene()
    this.forDebugOnly()
    this.loadGltf()
    this.setupVR()

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

    this.movebleObjects = new THREE.Group();
    this.scene.add( this.movebleObjects);

    this.room = new THREE.LineSegments(
        new BoxLineGeometry(6, 6, 6, 10, 10, 10),
        new THREE.LineBasicMaterial({color: 0x808080})
    )
    this.room.geometry.translate(0, 3, 0)
    this.scene.add(this.room)

    const geometry = new THREE.IcosahedronBufferGeometry(this.radius, 2)

    for (let i = 0; i < 8; i++) {

      const objects = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color: Math.random() * 0xffffff } ))

      objects.position.x = this.random(-2, 2)
      objects.position.y = this.random(0, 2)
      objects.position.z = this.random(-2, 2)

      this.room.add(objects)

    }
    this.highlight = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
      color: 0xFFFFF, side: THREE.BackSide}))
    this.highlight.scale.set(1.2, 1.2, 1.2)
    this.scene.add(this.highlight)
  }

  loadGltf() {
    const self = this
    const loader = new GLTFLoader()
    loader.load(
        officeChairGlb,
        (gltf) => {
          self.chair = gltf.scene
          self.chair.scale.set(.4,.4,.4)
          //self.chair.scale.set(1,1,1)
          // self.chair.scale = new THREE.Vector3(.2,.2,.2)
          self.scene.add(gltf.scene)
          // self.loadingBar.visible = false
          self.renderer.setAnimationLoop(self.render.bind(self))

          self.chair.position.x = 1;
          self.chair.position.y = 1;
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

    let i = 0
    this.forkController(i++)
    this.buildStandardController(i++)
    // this.flashLightController(i++)
    //this.buildStandardController(i++)
  }

  forkController(index) {
    const self = this
    let controller = this.renderer.xr.getController(index)

    controller.addEventListener( 'connected', function (event) {
      self.buildForkController.call(self, event.data, this)
    })

    controller.addEventListener( 'disconnected', function () {
      while(this.children.length > 0) {
        this.remove(this.children[0])
        const controllerIndex = self.controllers.indexOf(this)
        self.controllers[controllerIndex] = null
      }
    })
    controller.handle = () => {}

    this.controllers[index] = controller
    this.scene.add(controller)
  }

  flashLightController(index) {
    const self = this

    function onSelectStart() {
      this.userData.selectPressed = true
      if (self.spotlights[this.uuid]) {
        self.spotlights[this.uuid].visible = true
      } else {
        this.children[0].scale.z = 10
      }
    }

    function onSelectEnd () {
      self.highlight.visible = false
      this.userData.selectPressed = false
      if (self.spotlights[this.uuid]) {
        self.spotlights[this.uuid].visible = false
      } else {
        this.children[0].scale.z = 0
      }
    }

    let controller = this.renderer.xr.getController(index)
    controller.addEventListener( 'selectstart', onSelectStart );
    controller.addEventListener( 'selectend', onSelectEnd );
    controller.addEventListener( 'connected', function (event) {
      self.buildFlashLightController.call(self, event.data, this)
    })
    controller.addEventListener( 'disconnected', function () {
      while(this.children.length > 0) {
        this.remove(this.children[0])
        const controllerIndex = self.controllers.indexOf(this)
        self.controllers[controllerIndex] = null
      }
    })
    controller.handle = () => this.handleFlashLightController(controller)

    this.controllers[index] = controller
    this.scene.add(controller)
  }

  buildForkController(data, controller) {
    let geometry, material, loader

    const self = this

    if (data.targetRayMode === 'tracked-pointer') {
      loader = new GLTFLoader()
      loader.load(forkPack, (gltf) => {
        const fork = gltf.scene
        const scale = 0.05
        fork.scale.set(scale, scale, scale)
        fork.rotation.set(0, Math.PI / -180 * 90 , 0)
        controller.add(fork)
        const spotlightGroup = new THREE.Group()
        self.spotlights[controller.uuid] = spotlightGroup

        const spotlight = new THREE.SpotLight(0xFFFFFF, 2, 12, Math.PI / 15, 0.3)
        spotlight.position.set(0, 0, 0)
        spotlight.target.position.set(0, 0, -1)
        spotlightGroup.add(spotlight.target)
        spotlightGroup.add(spotlight)
        controller.add(spotlightGroup)

        spotlightGroup.visible = false

        geometry = new THREE.CylinderBufferGeometry(0.03, 1, 5, 32, true)
        geometry.rotateX(Math.PI / 2)
        material = new SpotLightVolumetricMaterial()
        const cone = new THREE.Mesh(geometry, material)
        cone.translateZ(-2.6)
        spotlightGroup.add(cone)

    }, null,
          (error) => console.error(`An error happened: ${error}`)
      )
   }
  }

  buildFlashLightController(data, controller) {
    let geometry, material, loader

    const self = this

    if (data.targetRayMode === 'tracked-pointer') {
      loader = new GLTFLoader()
          loader.load(flashLightPack, (gltf) => {
            const flashLight = gltf.scene.children[2]
            const scale = 0.6
            flashLight.scale.set(scale, scale, scale)
            controller.add(flashLight)
            const spotlightGroup = new THREE.Group()
            self.spotlights[controller.uuid] = spotlightGroup

            const spotlight = new THREE.SpotLight(0xFFFFFF, 2, 12, Math.PI / 15, 0.3)
            spotlight.position.set(0, 0, 0)
            spotlight.target.position.set(0, 0, -1)
            spotlightGroup.add(spotlight.target)
            spotlightGroup.add(spotlight)
            controller.add(spotlightGroup)

            spotlightGroup.visible = false

            geometry = new THREE.CylinderBufferGeometry(0.03, 1, 5, 32, true)
            geometry.rotateX(Math.PI / 2)
            material = new SpotLightVolumetricMaterial()
            const cone = new THREE.Mesh(geometry, material)
            cone.translateZ(-2.6)
            spotlightGroup.add(cone)
      },
              null,
              (error) => console.error(`An error happened: ${error}`)
          )

    } else if (data.targetRayMode == 'gaze'){
      geometry = new THREE.RingBufferGeometry(0.02, 0.04, 32).translate(0, 0, -1);
      material = new THREE.MeshBasicMaterial({opacity: 0.5, transparent: true});
      controller.add(new THREE.Mesh(geometry, material))
    }
  }

  buildStandardController(index) {
    const controllerModelFactory = new XRControllerModelFactory()
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1)
    ])
    const line = new THREE.Line(geometry)
    line.name = 'line'
    line.scale.z = 0

    const controller = this.renderer.xr.getController(index)

    controller.add(line.clone())
    controller.userData.selectPressed = false

    const grip = this.renderer.xr.getControllerGrip(index)
    grip.add(controllerModelFactory.createControllerModel(grip))
    this.scene.add(grip)

    const self = this

    function onSelectStart() {
      this.children[0].scale.z = 10
      this.userData.selectPressed = true
      }


    function onSelectEnd () {
      this.children[0].scale.z = 0
      self.highlight.visible = false
      this.userData.selectPressed = false
    }
controller.addEventListener('selectstart', onSelectStart);
    controller.addEventListener('selectend', onSelectEnd);

    controller.handle = () => this.handleController(controller)

    this.scene.add(controller)
    controllers[index] = controller
  }

  handleController(controller) {
    if (controller.userData.selectPressed) {
      controller.children[0].scale.z = 0.6
      this.workingMatrix.identity().extractRotation( controller.matrixWorld)

      this.raycaster.ray.origin.setFromMatrixPosition( controller.matrixWorld)

      this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.workingMatrix)

      const intersects = this.raycaster.intersectObjects(this.room.children)

      if (intersects.length > 0) {
        if (intersects[0].object.uuid !== this.highlight.uuid) {
          intersects[0].object.add(this.highlight)
        }
        this.highlight.visible = true
        controller.children[0].scale.z = intersects[0].distance
      } else {
        this.highlight.visible = false
      }
    }
  }

  handleFlashLightController(controller) {
    if (controller.userData.selectPressed) {
      this.workingMatrix.identity().extractRotation( controller.matrixWorld)

      this.raycaster.ray.origin.setFromMatrixPosition( controller.matrixWorld)

      this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.workingMatrix)

      const intersects = this.raycaster.intersectObjects(this.room.children)

      if (intersects.length > 0) {
        if (intersects[0].object.uuid != this.highlight.uuid) {
          intersects[0].object.add(this.highlight)
        }
        this.highlight.visible = true
        controller.children[0].scale.z = intersects[0].distance
      } else {
        this.highlight.visible = false
      }
    }
  }


  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  render() {
    if (this.mesh) {
      this.mesh.rotateX(0.005)
      this.mesh.rotateY(0.01)
    }
    if (this.controllers) {
      const self = this
      this.controllers.forEach((controllers) => {
        self.handleController(controllers)
      })
    }
    this.renderer.render(this.scene, this.camera)
  }
}

export {App}
