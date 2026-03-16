import { floatColor } from "sigma/utils";
import vertexShaderSource from "sigma/rendering/webgl/shaders/edge.arrowHead.vert.glsl";
import fragmentShaderSource from "sigma/rendering/webgl/shaders/edge.arrowHead.frag.glsl";
import { AbstractEdgeProgram } from "sigma/rendering/webgl/programs/common/edge";

const POINTS = 3,
  ATTRIBUTES = 9,
  STRIDE = POINTS * ATTRIBUTES;

export default class EdgeArrowHeadProgram extends AbstractEdgeProgram {
  // Locations
  positionLocation;
  colorLocation;
  normalLocation;
  radiusLocation;
  barycentricLocation;
  matrixLocation;
  sqrtZoomRatioLocation;
  correctionRatioLocation;

  constructor(gl) {
    super(gl, vertexShaderSource, fragmentShaderSource, POINTS, ATTRIBUTES);

    // Locations
    this.positionLocation = gl.getAttribLocation(this.program, "a_position");
    this.colorLocation = gl.getAttribLocation(this.program, "a_color");
    this.normalLocation = gl.getAttribLocation(this.program, "a_normal");
    this.radiusLocation = gl.getAttribLocation(this.program, "a_radius");
    this.barycentricLocation = gl.getAttribLocation(this.program, "a_barycentric");

    // Uniform locations
    const matrixLocation = gl.getUniformLocation(this.program, "u_matrix");
    if (matrixLocation === null) throw new Error("EdgeArrowHeadProgram: error while getting matrixLocation");
    this.matrixLocation = matrixLocation;

    const sqrtZoomRatioLocation = gl.getUniformLocation(this.program, "u_sqrtZoomRatio");
    if (sqrtZoomRatioLocation === null)
      throw new Error("EdgeArrowHeadProgram: error while getting sqrtZoomRatioLocation");
    this.sqrtZoomRatioLocation = sqrtZoomRatioLocation;

    const correctionRatioLocation = gl.getUniformLocation(this.program, "u_correctionRatio");
    if (correctionRatioLocation === null)
      throw new Error("EdgeArrowHeadProgram: error while getting correctionRatioLocation");
    this.correctionRatioLocation = correctionRatioLocation;

    this.bind();
  }

  bind() {
    const gl = this.gl;

    // Bindings
    gl.enableVertexAttribArray(this.positionLocation);
    gl.enableVertexAttribArray(this.normalLocation);
    gl.enableVertexAttribArray(this.radiusLocation);
    gl.enableVertexAttribArray(this.colorLocation);
    gl.enableVertexAttribArray(this.barycentricLocation);

    gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, ATTRIBUTES * Float32Array.BYTES_PER_ELEMENT, 0);
    gl.vertexAttribPointer(this.normalLocation, 2, gl.FLOAT, false, ATTRIBUTES * Float32Array.BYTES_PER_ELEMENT, 8);
    gl.vertexAttribPointer(this.radiusLocation, 1, gl.FLOAT, false, ATTRIBUTES * Float32Array.BYTES_PER_ELEMENT, 16);
    gl.vertexAttribPointer(
      this.colorLocation,
      4,
      gl.UNSIGNED_BYTE,
      true,
      ATTRIBUTES * Float32Array.BYTES_PER_ELEMENT,
      20,
    );

    // TODO: maybe we can optimize here by packing this in a bit mask
    gl.vertexAttribPointer(
      this.barycentricLocation,
      3,
      gl.FLOAT,
      false,
      ATTRIBUTES * Float32Array.BYTES_PER_ELEMENT,
      24,
    );
  }

  computeIndices() {
    // nothing to do
  }

  process(
    sourceData,
    targetData,
    data,
    hidden,
    offset,
  ) {
    if (hidden) {
      for (let i = offset * STRIDE, l = i + STRIDE; i < l; i++) this.array[i] = 0;

      return;
    }

    const thickness = data.size * 3 || 1, // Adjust arrow size here
      radius = targetData.size || 1,
      x1 = sourceData.x,
      y1 = sourceData.y,
      x2 = targetData.x,
      y2 = targetData.y,
      color = floatColor(data.color);

    // Computing normals
    const dx = x2 - x1,
      dy = y2 - y1;

    let len = dx * dx + dy * dy,
      n1 = 0,
      n2 = 0;

    if (len) {
      len = 1 / Math.sqrt(len);

      n1 = -dy * len * thickness;
      n2 = dx * len * thickness;
    }

    let i = POINTS * ATTRIBUTES * offset;

    const array = this.array;

    // First point
    array[i++] = x2;
    array[i++] = y2;
    array[i++] = -n1;
    array[i++] = -n2;
    array[i++] = radius;
    array[i++] = color;
    array[i++] = 1;
    array[i++] = 0;
    array[i++] = 0;

    // Second point
    array[i++] = x2;
    array[i++] = y2;
    array[i++] = -n1;
    array[i++] = -n2;
    array[i++] = radius;
    array[i++] = color;
    array[i++] = 0;
    array[i++] = 1;
    array[i++] = 0;

    // Third point
    array[i++] = x2;
    array[i++] = y2;
    array[i++] = -n1;
    array[i++] = -n2;
    array[i++] = radius;
    array[i++] = color;
    array[i++] = 0;
    array[i++] = 0;
    array[i] = 1;
  }

  render(params) {
    if (this.hasNothingToRender()) return;

    const gl = this.gl;

    const program = this.program;
    gl.useProgram(program);

    // Binding uniforms
    gl.uniformMatrix3fv(this.matrixLocation, false, params.matrix);
    gl.uniform1f(this.sqrtZoomRatioLocation, Math.sqrt(params.ratio));
    gl.uniform1f(this.correctionRatioLocation, params.correctionRatio);

    // Drawing:
    gl.drawArrays(gl.TRIANGLES, 0, this.array.length / ATTRIBUTES);
  }
}