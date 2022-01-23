import {fetchProfile} from "three/examples/jsm/libs/motion-controllers.module";

const DEFAULT_PROFILES_PATH = 'webxr-input-profiles';
const DEFAULT_PROFILE = 'generic-trigger';

export class Controller {
  controller
  renderer
  buttonStates

  constructor(renderer, index) {
    if (!renderer) {
      throw Error("Invalid renderer value: " + JSON.stringify(renderer))
    }
    this.renderer = renderer
    this.controller = this.renderer.xr.getController(index)
    this.controller.addEventListener('connected', this.onConnected)
  }



  onConnected( event, self ){
    const info = {};

    fetchProfile( event.data, DEFAULT_PROFILES_PATH, DEFAULT_PROFILE ).then( ( { profile, assetPath } ) => {
      console.log( JSON.stringify(profile));

      info.name = profile.profileId;
      info.targetRayMode = event.data.targetRayMode;

      Object.entries( profile.layouts ).forEach( ( [key, layout] ) => {
        const components = {};
        Object.values( layout.components ).forEach( ( component ) => {
          components[component.rootNodeName] = component.gamepadIndices;
        });
        info[key] = components;
      });

      self.createButtonStates( info.right );

      console.log( JSON.stringify(info) );

    } );
  }

  createButtonStates(components) {
    const buttonStates = {}
    this.gamepadIndices = components
    Object.keys(components).forEach(key => {
      if (key.includes('touchpad') || key.includes('thumbstick')) {
        buttonStates[key] = { button: 0, xAxis: 0, yAxis: 0 }
      } else {
        buttonStates[key] = 0
      }
    })
    this.buttonStates = buttonStates
  }

  handle() {
    throw Error("abstract method")
  }
}