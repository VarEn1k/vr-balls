import * as THREE from "three";
import {Controller} from "./Controller";
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader";
import {SpotLightVolumetricMaterial} from "../utils/SpotLightVolumetricMaterial";
import forkPack from "../../assets/Fork.glb";

export class ForkController extends Controller {
    spotlights = {}
     
    constructor(renderer, index, scene, movableObjects, highlight) {
        super(renderer, index)
        this.scene = scene
        this.movableObjects = movableObjects
        this.highlight = highlight
        this.build(index)
    }
    build (index) {
        this.workingMatrix = new THREE.Matrix4()

        const self = this

        let controller = this.renderer.xr.getController(index)

        this.controller.addEventListener( 'connected', function (event) {
            self.buildForkController.call(self, event.data, this)
        })

        this.controller.addEventListener( 'disconnected', function () {
            while(this.children.length > 0) {
                this.remove(this.children[0])
                const controllerIndex = self.controllers.indexOf(this)
                self.controllers[controllerIndex] = null
            }
        })

        this.scene.add(controller)
    }

    buildForkController(index) {
        let geometry, material, loader

        const self = this

        if (data.targetRayMode === 'tracked-pointer') {
            loader = new GLTFLoader()
            loader.load(forkPack, (gltf) => {
                    const fork = gltf.scene
                    const scale = 0.05
                    fork.scale.set(scale, scale, scale)
                    fork.rotation.set(0, Math.PI / -180 * 90 , 0)
                   this.controller.add(fork)
                    const spotlightGroup = new THREE.Group()
                    self.spotlights[this.controller.uuid] = spotlightGroup

                    const spotlight = new THREE.SpotLight(0xFFFFFF, 2, 12, Math.PI / 15, 0.3)
                    spotlight.position.set(0, 0, 0)
                    spotlight.target.position.set(0, 0, -1)
                    spotlightGroup.add(spotlight.target)
                    spotlightGroup.add(spotlight)
                    this.controller.add(spotlightGroup)

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
}
