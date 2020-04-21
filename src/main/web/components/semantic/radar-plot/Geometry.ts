/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2019, metaphacts GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { minBy, maxBy, orderBy } from 'lodash';

export interface Vector {
  x: number;
  y: number;
}
export namespace Vector {
  export function add(a: Vector, b: Vector) {
    return { x: a.x + b.x, y: a.y + b.y };
  }
  export function subtract(a: Vector, b: Vector) {
    return { x: a.x - b.x, y: a.y - b.y };
  }
  export function scale(v: Vector, s: number) {
    return { x: v.x * s, y: v.y * s };
  }
  export function lerp(a: Vector, b: Vector, s: number) {
    const m = 1 - s;
    return {
      x: m * a.x + s * b.x,
      y: m * a.y + s * b.y,
    };
  }
  export function length(v: Vector) {
    return Math.sqrt(v.x * v.x + v.y * v.y);
  }
  export function normalize(v: Vector) {
    const inverseLength = 1 / length(v);
    return { x: v.x * inverseLength, y: v.y * inverseLength };
  }
  export function cross(a: Vector, b: Vector): number {
    return a.x * b.y - a.y * b.x;
  }
  export function fromAngle(angle: number) {
    return { x: Math.cos(angle), y: Math.sin(angle) };
  }
}

export namespace Scalar {
  export function lerp(a: number, b: number, s: number) {
    return a * (1 - s) + b * s;
  }
}

export function ellipsePointFromDirection(direction: Vector, radius: Vector): Vector {
  const { x: nx, y: ny } = direction;
  const { x: rx, y: ry } = radius;
  const sx = nx / rx;
  const sy = ny / ry;
  const scale = Math.sqrt(1 / (sx * sx + sy * sy));
  return { x: nx * scale, y: ny * scale };
}

/**
 * A strictly monotonic function [0..1] -> [0..1] mapping plot angles to divide
 * ellipse area into arcs of roughly the same size.
 *
 * This is basically an approximation to an inverse of EllipticE[e, phi]
 * (elliptic integral of the second kind).
 */
export function approximateUniformEllipticAngle(k: number, rx: number, ry: number) {
  if (rx < ry) {
    return k < 0.5
      ? approximateUniformEllipticAngle(k + 0.5, ry, rx) - 0.5
      : approximateUniformEllipticAngle(k - 0.5, ry, rx) + 0.5;
  }
  // assert: rx >= ry && k in [0..1]
  const inner = (k - 0.5) * 2;
  const exp = Math.sign(inner) * Math.pow(Math.abs(inner), ry / rx);
  return (1 + exp) * 0.5;
}

/**
 * Approximates perimeter S[rx, ry] of an ellipse with semi-axes rx, ry
 * using naive approximation (arithmetic mean of the two semi-axes).
 *
 * @see http://www.ebyte.it/library/docs/math05a/EllipsePerimeterApprox05.html
 */
export function approximateEllipsePerimeter(rx: number, ry: number) {
  return Math.PI * (rx + ry);
}

/**
 * Computes convex null of points using Graham's scan.
 */
export function convexHullOf(points: ReadonlyArray<Vector>): Vector[] {
  const maxY = maxBy(points, (p) => p.y).y;
  // left-most point from highest by Y
  const pivot = minBy(
    points.filter((p) => p.y === maxY),
    (p) => p.x
  );
  const angleFromPivot = (target: Vector) => {
    const direction = Vector.subtract(target, pivot);
    return Math.atan2(-direction.y, direction.x);
  };
  const orderedPoints = orderBy(points, angleFromPivot);
  orderedPoints.splice(orderedPoints.indexOf(pivot), 1);

  const stack: Vector[] = [pivot, orderedPoints.shift()];
  for (const p of orderedPoints) {
    let isRightTurn: boolean;
    do {
      const top = stack[stack.length - 1];
      const nextToTop = stack[stack.length - 2];
      const topSegment = Vector.subtract(top, nextToTop);
      const suggestedSegement = Vector.subtract(p, nextToTop);
      isRightTurn = Vector.cross(topSegment, suggestedSegement) > 0;
      if (isRightTurn) {
        stack.pop();
      }
    } while (isRightTurn);
    stack.push(p);
  }

  return stack;
}
