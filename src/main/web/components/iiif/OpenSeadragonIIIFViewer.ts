import * as React from 'react';
import * as D from 'react-dom-factories';
import * as OpenSeadragon from 'openseadragon';
import { Component } from 'platform/api/components';

export interface Props {
  iiifManifestUrl: string;
  showNavigationControl?: boolean;
}

interface State {
  error?: string;
}

export class OpenSeadragonIIIFViewer extends Component<Props, State> {
  private viewer: OpenSeadragon.Viewer;

  static defaultProps: Partial<Props> = {
    showNavigationControl: false,
  };

  constructor(props: Props, context: any) {
    super(props, context);
    this.state = {};
  }

  componentDidMount(): void {
    this.fetchAndProcessManifest();
  }

  async fetchAndProcessManifest() {
    try {
      const response = await fetch(this.props.iiifManifestUrl);
      const manifest = await response.json();

      if (this.isImageApiManifest(manifest)) {
        this.initializeViewer(manifest);
      } else if (this.isPresentationApiManifest(manifest)) {
        const canvases = this.getCanvases(manifest);
        if (canvases.length !== 0) {
          const imageServiceUrl = this.getImageServiceUrl(canvases[0], manifest);
          if (imageServiceUrl) {
            this.initializeViewer(imageServiceUrl);
          } else {
            this.setState({ error: 'Unable to find image service URL' });
          }
        } else {
          this.setState({ error: 'Manifest must at least one canvas' });
        }
      } else {
        this.setState({ error: 'Unsupported manifest format' });
      }
    } catch (error) {
      this.setState({ error: 'Failed to fetch or process manifest' });
    }
  }

  isImageApiManifest(manifest: any): boolean {
    const context = manifest['@context'];
    return Array.isArray(context) 
      ? context.some(c => typeof c === 'string' && c.startsWith('http://iiif.io/api/image'))
      : typeof context === 'string' && context.startsWith('http://iiif.io/api/image');
  }

  isPresentationApiManifest(manifest: any): boolean {
    const context = manifest['@context'];
    return Array.isArray(context) 
      ? context.some(c => typeof c === 'string' && c.startsWith('http://iiif.io/api/presentation'))
      : typeof context === 'string' && context.startsWith('http://iiif.io/api/presentation');
  }

  getCanvases(manifest: any): any[] {
    return manifest.sequences?.[0]?.canvases || manifest.items || [];
  }

  getImageServiceUrl(canvas: any, manifest: any): string | null {
    if (manifest['@context']?.includes('http://iiif.io/api/presentation/3/context.json')) {
      // IIIF Presentation API v3
      const service = canvas.items?.[0]?.items?.[0]?.body?.service?.[0];
      if (service && service.type === 'ImageService3') {
        return `${service.id}/info.json`;
      }
    } else if (manifest['@context']?.includes('http://iiif.io/api/presentation/2/context.json')) {
      // IIIF Presentation API v2
      const service = canvas.images?.[0]?.resource?.service;
      if (service && service['@context']?.includes('http://iiif.io/api/image/2/context.json')) {
        return `${service['@id']}/info.json`;
      }
    }
    return null;
  }

  initializeViewer(tileSource: string) {
    if (this.viewerElement) {
      this.viewer = OpenSeadragon({
        element: this.viewerElement,
        autoResize: true,
        showNavigationControl: this.props.showNavigationControl,
        homeFillsViewer: true,
        minZoomLevel: 0.1,  // Allow more zoom-out (smaller value = more zoom out)
        minZoomImageRatio: 0.1,  // Allow image to be smaller compared to viewer
      });

      this.viewer.addTiledImage({
        tileSource: tileSource,
        success: (event) => {
          const tiledImage = event.item;
            
          // Create a rectangle with the same aspect ratio as the image
          const contentSize = tiledImage.getContentSize();
          const aspectRatio = contentSize.x / contentSize.y;
          
          // Use the image's natural bounds
          const imageBounds = new OpenSeadragon.Rect(0, 0, 1, 1/aspectRatio);
          
          // Fit those bounds in the viewport
          this.viewer.viewport.fitBounds(imageBounds, true);
        }
      });
    }
  }

  render() {
    if (this.state.error) {
      return D.div({ className: 'error' }, this.state.error);
    }
    return D.div({
      ref: (el) => this.viewerElement = el,
      style: { width: '100%', height: '100%' }
    });
  }

  private viewerElement: HTMLElement | null = null;
}

export default OpenSeadragonIIIFViewer;