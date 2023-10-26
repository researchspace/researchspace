// BimViewer.tsx

import * as React from 'react';
import { useEffect } from 'react';
import { Canvas, extend, useFrame, useThree } from '@react-three/fiber';
import { IFCLoader } from 'web-ifc-three';
import * as THREE from 'three';
import { OrbitControls as ThreeOrbitControls } from 'three/examples/jsm/controls/OrbitControls';

interface BimViewerProps {
  ifcurl: string;
}

interface BimViewerState {
  ifcModel: THREE.Object3D | null;
}

interface OrbitControlsProps {
  zoomSpeed?: number;
  onControlsCreated?: (controls: ThreeOrbitControls) => void;
  cameraSetter: (camera: THREE.PerspectiveCamera) => void;
}

const OrbitControls: React.FC<OrbitControlsProps> = ({ zoomSpeed = 1, onControlsCreated, cameraSetter }) => {
  const { camera, gl, size } = useThree();

  useEffect(() => {
    cameraSetter(camera);
  }, [cameraSetter, camera]);

  useEffect(() => {
    const controls = new ThreeOrbitControls(camera, gl.domElement);
    controls.enableDamping = false;
    controls.dampingFactor = 1;
    controls.rotateSpeed = 0.5;
    controls.zoomSpeed = 0.5;

    if (onControlsCreated) {
      onControlsCreated(controls);
    }

    return () => {
      controls.dispose();
    };
  }, [camera, gl, onControlsCreated]);

  useFrame((state) => {
    state.camera.updateProjectionMatrix();
  });

  return null;
};

class BimViewer extends React.Component<BimViewerProps, BimViewerState> {
  private ifcLoader: IFCLoader;
  private camera: THREE.PerspectiveCamera | null;
  private scene: THREE.Group | null;
  // For debug purposes:
  private centerSphere: THREE.Mesh | null;
  private boundingBoxMesh: THREE.Mesh | null;
  private controls: ThreeOrbitControls | null;

  constructor(props: BimViewerProps) {
    super(props);
    this.ifcLoader = new IFCLoader();
    this.camera = null;
    this.scene = null;
    this.state = {
      ifcModel: null,
    };
  }

  componentDidMount() {
    console.log("BimViewer Mounted with url: " + this.props.ifcurl);
  }

  componentDidUpdate(prevProps: BimViewerProps) {
    if (prevProps.ifcurl !== this.props.ifcurl) {
      this.loadIfc();
    }
  }

  componentWillUnmount() {
    if (this.state.ifcModel) {
      this.state.ifcModel.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          object.material.dispose();
        }
      });
    }
  }

  setSceneRef = (node: THREE.Group | null) => {
    if (node) {
      this.scene = node;
      this.loadIfc();
    }
  };

  setCamera = (camera: THREE.PerspectiveCamera) => {
    this.camera = camera;
  };

  createBoundingBoxMesh(boundingBox: THREE.Box3) {
    if (this.boundingBoxMesh) {
      this.scene?.remove(this.boundingBoxMesh);
    }
  
    const size = boundingBox.getSize(new THREE.Vector3());
    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const material = new THREE.MeshBasicMaterial({ color: 0x0000ff, transparent: true, opacity: 0.3 });
    this.boundingBoxMesh = new THREE.Mesh(geometry, material);
    this.boundingBoxMesh.position.copy(boundingBox.getCenter(new THREE.Vector3()));
    this.scene?.add(this.boundingBoxMesh);
  }
  
  createCenterSphere(center: THREE.Vector3) {
    if (this.centerSphere) {
      this.scene?.remove(this.centerSphere);
    }
  
    const geometry = new THREE.SphereGeometry(20, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    this.centerSphere = new THREE.Mesh(geometry, material);
    this.centerSphere.position.copy(center);
    this.scene?.add(this.centerSphere);
  }
  

  loadIfc() {
    this.ifcLoader.load(
      this.props.ifcurl,
      (ifcModel: THREE.Object3D) => {
        if (this.state.ifcModel) {
          this.scene?.remove(this.state.ifcModel);
          this.state.ifcModel.traverse((object) => {
            if (object instanceof THREE.Mesh) {
              object.geometry.dispose();
              object.material.dispose();
            }
          });
        }
        this.scene?.add(ifcModel);
        this.setState({ ifcModel }, () => {
          this.fitCameraToModel();
        });
      },
      (progressEvent: ProgressEvent) => {
        console.log(
          `Loading progress: ${(progressEvent.loaded / progressEvent.total) * 100}%`
        );
      },
      (error: ErrorEvent) => {
        console.error('An error occurred while loading the IFC file:', error);
      }
    );
  }

  fitCameraToModel() {
    if (this.state.ifcModel && this.camera) {
      const boundingBox = new THREE.Box3().setFromObject(this.state.ifcModel);
      const center = boundingBox.getCenter(new THREE.Vector3());
      const size = boundingBox.getSize(new THREE.Vector3());
  
      // this.createCenterSphere(center);
      // this.createBoundingBoxMesh(boundingBox);
  
      if (this.controls) {
        this.controls.target.copy(center);
      }
  
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = this.camera.fov * (Math.PI / 180);
      const aspect = this.camera.aspect;
      const cameraZ = Math.abs(maxDim / (2 * Math.tan(fov / 2)));
  
      // Set the camera position
      this.camera.position.set(center.x, center.y, center.z + cameraZ * aspect);
      this.camera.position.y += 0.7 * maxDim; // Add a slight upward offset
      this.camera.lookAt(center);
      this.camera.updateProjectionMatrix();
  }
}
  

  
  render() {
    return (
    <Canvas>
      <group ref={this.setSceneRef} />
      <ambientLight />
      <directionalLight position={[5, 5, 5]} />
      <OrbitControls cameraSetter={this.setCamera}></OrbitControls>
    </Canvas>
    );
  }
}

export default BimViewer;
