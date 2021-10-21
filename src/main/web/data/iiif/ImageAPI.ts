/**
 * ResearchSpace
 * Copyright (C) 2015-2020, © Trustees of the British Museum
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import * as Kefir from 'kefir';
import * as request from 'superagent';
import * as URI from 'urijs';

export interface ImageRequestParams {
  imageId: string;
  region?: Region;
  size?: Size;
  rotation?: Rotation;
  quality?: Quality;
  format: string;
}

export abstract class Region {
  abstract toString(): string;
}
export namespace Region {
  export class Full extends Region {
    toString() {
      return 'full';
    }
  }
  abstract class Rectangular extends Region {
    constructor(public x: number, public y: number, public width: number, public height: number) {
      super();
    }
    toString() {
      return `${this.x},${this.y},${this.width},${this.height}`;
    }
  }
  export class Absolute extends Rectangular {}
  export class Percent extends Rectangular {
    toString() {
      return 'pct:' + super.toString();
    }
  }
  export const full = new Full();
}

export abstract class Size {
  abstract toString(): string;
}
export namespace Size {
  export class Full extends Size {
    toString() {
      return 'full';
    }
  }
  abstract class Rectangular extends Size {
    constructor(public width: number, public height: number) {
      super();
    }
    toString() {
      return `${this.width ? this.width : ''},${this.height ? this.height : ''}`;
    }
  }
  export class Absolute extends Rectangular {}
  export class BestFit extends Rectangular {
    toString() {
      return '!' + super.toString();
    }
  }
  export class Percent extends Size {
    constructor(public scale: number) {
      super();
    }
    toString() {
      return `pct:${this.scale}`;
    }
  }
  export const full = new Full();
}

export abstract class Rotation {
  abstract toString(): string;
}
export namespace Rotation {
  abstract class Degrees extends Rotation {
    constructor(public angle: number) {
      super();
    }
    toString() {
      return `${this.angle}`;
    }
  }
  export class Clockwise extends Degrees {}
  export class MirrorThenClockwise extends Degrees {
    toString() {
      return '!' + super.toString();
    }
  }
  export const zero = new Clockwise(0);
}

export enum Quality {
  Color,
  Gray,
  Bitonal,
  Default,
}

export function constructImageUri(serverAndPrefix: string, params: ImageRequestParams) {
  const region = params.region || Region.full;
  const size = params.size || Size.full;
  const rotation = params.rotation || Rotation.zero;
  const quality = Quality[params.quality || Quality.Default].toLowerCase();
  const format = params.format;
  let r = `${serverAndPrefix}/${params.imageId}/${region}/${size}/${rotation}/${quality}`;
  if (params.format !== 'auto') {
    r = r + '.' + format;
  }
  return r;
}

export function constructInformationRequestUri(serverAndPrefix: string, imageId: string) {
  return constructServiceRequestUri(serverAndPrefix, imageId) + `/info.json`;
}

export function constructServiceRequestUri(serverAndPrefix: string, imageId: string) {
  return serverAndPrefix + '/' + encodeURIComponent(imageId);
}

export interface ImageBounds {
  width: number;
  height: number;
}

export function queryImageBounds(serverAndPrefix: string, imageId: string) {
  const uri = constructInformationRequestUri(serverAndPrefix, imageId);
  return Kefir.fromNodeCallback<ImageBounds>((cb) => {
    request
      .get(uri)
      .accept('application/ld+json')
      .end((err, res) => {
        if (err) {
          cb(err);
        } else {
          const json = JSON.parse(res.text);
          cb(err, json);
        }
      });
  }).toProperty();
}

/*
 * Incoming config.iiifServerUrl could be absolute or relative
 * (due to no client-side configuration and ease of deployment).
 * When generating manifests we need to use absolute URI,
 * so we're ensuring to have absolute URL after this point.
 */
export function getIIIFServerUrl(relativeOrAbsoluteUrl: string): string {
  return URI(relativeOrAbsoluteUrl).absoluteTo(window.location.href).toString();
}
