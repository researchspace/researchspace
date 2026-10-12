import Feature from 'ol/Feature';
import Geometry from 'ol/geom/Geometry';
import GeometryCollection from 'ol/geom/GeometryCollection';
import Style from 'ol/style/Style';
import Text from 'ol/style/Text';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import CircleStyle from 'ol/style/Circle';
import { asArray } from 'ol/color';
import { FlatStyleLike } from 'ol/style/flat';

/**
 * Rendering state of the features of semantic-map-advanced.
 *
 * Everything the old per-feature `setStyle()` loops computed on every change is now derived once:
 * - years are parsed when the features are created (`prepareFeatureYears`);
 * - colors and group visibility are resolved once per group and written on the features as plain
 *   numbers (`FeatureAppearanceResolver.applyTo`), so that the WebGL style can read them as attributes;
 * - year filter and selection dimming are style variables (`year`, `yearOn`, `dim`), so changing
 *   them never touches the features.
 *
 * The canvas renderers (point markers, labels, highlight overlay and the non-WebGL fallback) read
 * the same precomputed values and share a small set of cached `Style` objects.
 */

/**
 * Feature properties holding precomputed rendering values. Each one becomes a vertex attribute of
 * the WebGL programs, and WebGL only guarantees a few of them (OpenLayers already uses most), so
 * the values are packed into four numbers. Names must be valid GLSL identifiers (no double underscore).
 */
export const RENDER_PROPS = {
  /** Color as 0xRRGGBB (24 bits, exact in a float32). */
  rgb: 'sma_rgb',
  /**
   * yearStatus + 4 * groupHidden + 8 * alpha255, where yearStatus is 0 = not subject to the year
   * filter (no `bob`), 1 = valid range, 2 = unparsable (hidden while filtering).
   */
  flags: 'sma_flags',
  bob: 'sma_bob',
  eoe: 'sma_eoe',
};

/** End year used for features without `eoe` (open-ended range). Exactly representable as float32. */
const OPEN_END_YEAR = 1e9;

const GEOMETRY_OPACITY_BOOST = 1.8;
const DIMMED_ALPHA = 0.1;
const HIGHLIGHT_FILL_ALPHA = 0.8;
const POLYGON_STROKE_WIDTH = 1.25;
const MARKER_GLYPH = '';

export type RGBA = [number, number, number, number];

export interface YearFilter {
  on: boolean;
  year: number;
}

export interface ColorContext {
  defaultColor: string;
  /** Taxonomy used to hide toggled-off groups (set whenever controls send a color taxonomy). */
  hideTaxonomy: string | null;
  /** Taxonomy used to color the features (not set for 'default' / ''). */
  colorTaxonomy: string | null;
  associations: { [group: string]: any };
}

export interface LayerOpacityOverrides {
  fillOpacity?: number;
  strokeOpacity?: number;
}

interface GroupAppearance {
  hidden: boolean;
  color: RGBA;
}

/**
 * Parses the `bob`/`eoe` bindings of a feature once, with the same rules the year filter always used:
 * the year is the part before the first '-', an unparsable `bob` or `eoe` hides the feature while
 * filtering, a missing `eoe` means "still existing".
 */
export function prepareFeatureYears(feature: Feature<Geometry>): void {
  const bob = feature.get('bob');
  const eoe = feature.get('eoe');
  let status = 0;
  let bobYear = 0;
  let eoeYear = OPEN_END_YEAR;

  if (bob && typeof bob.value === 'string') {
    bobYear = parseInt(bob.value.split('-')[0]);
    if (Number.isNaN(bobYear)) {
      status = 2;
      bobYear = 0;
    } else {
      status = 1;
      if (eoe && typeof eoe.value === 'string' && eoe.value.trim() !== '') {
        eoeYear = parseInt(eoe.value.split('-')[0]);
        if (Number.isNaN(eoeYear)) {
          status = 2;
          eoeYear = OPEN_END_YEAR;
        }
      }
    }
  }

  feature.set(RENDER_PROPS.bob, bobYear, true);
  feature.set(RENDER_PROPS.eoe, eoeYear, true);
  writeFlags(feature, status, readGroupHidden(feature), readAlpha255(feature));
}

function readFlags(feature: Feature<Geometry>): number {
  const flags = feature.get(RENDER_PROPS.flags);
  // default: visible, opaque
  return typeof flags === 'number' ? flags : 8 * 255;
}

function readYearStatus(feature: Feature<Geometry>): number {
  return readFlags(feature) % 4;
}

function readGroupHidden(feature: Feature<Geometry>): boolean {
  return Math.floor(readFlags(feature) / 4) % 2 === 1;
}

function readAlpha255(feature: Feature<Geometry>): number {
  return Math.floor(readFlags(feature) / 8);
}

function writeFlags(feature: Feature<Geometry>, yearStatus: number, groupHidden: boolean, alpha255: number): void {
  feature.set(RENDER_PROPS.flags, yearStatus + (groupHidden ? 4 : 0) + 8 * alpha255, true);
}

/** Writes the rendering color of a feature (silently: renderers pick it up on their next rebuild). */
export function setFeatureColor(feature: Feature<Geometry>, color: RGBA | number[], groupHidden?: boolean): void {
  const r = Math.round(color[0]) & 255;
  const g = Math.round(color[1]) & 255;
  const b = Math.round(color[2]) & 255;
  const alpha = color[3] === undefined ? 1 : Math.min(1, Math.max(0, color[3]));
  feature.set(RENDER_PROPS.rgb, r * 65536 + g * 256 + b, true);
  writeFlags(
    feature,
    readYearStatus(feature),
    groupHidden === undefined ? readGroupHidden(feature) : groupHidden,
    Math.round(alpha * 255)
  );
}

/** Rendering color of a feature as written by `setFeatureColor`. */
export function getFeatureColor(feature: Feature<Geometry>): RGBA {
  const rgb = feature.get(RENDER_PROPS.rgb);
  const packed = typeof rgb === 'number' ? rgb : 0x808080;
  return [Math.floor(packed / 65536), Math.floor(packed / 256) % 256, packed % 256, readAlpha255(feature) / 255];
}

export function parseYearFilter(yearFiltering: boolean, year: string): YearFilter {
  if (!yearFiltering || !year) {
    return { on: false, year: 0 };
  }
  const selectedYear = parseInt(String(year).split('-')[0]);
  if (Number.isNaN(selectedYear)) {
    return { on: false, year: 0 };
  }
  return { on: true, year: selectedYear };
}

export function isShownByYear(feature: Feature<Geometry>, filter: YearFilter): boolean {
  if (!filter.on) {
    return true;
  }
  const status = readYearStatus(feature);
  if (status === 2) {
    return false;
  }
  if (status !== 1) {
    return true;
  }
  return feature.get(RENDER_PROPS.bob) <= filter.year && filter.year <= feature.get(RENDER_PROPS.eoe);
}

export function isShownByGroup(feature: Feature<Geometry>): boolean {
  return !readGroupHidden(feature);
}

/** Applies the old `boostColorOpacity` rule and returns the color as numbers. */
export function toBoostedRgba(color: string, fallback: RGBA): RGBA {
  if (typeof color === 'string') {
    const rgba = color.match(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/i);
    if (rgba) {
      const alpha = Math.min(1, Math.max(0, parseFloat(rgba[4]) * GEOMETRY_OPACITY_BOOST));
      return [parseInt(rgba[1], 10), parseInt(rgba[2], 10), parseInt(rgba[3], 10), alpha];
    }
    const rgb = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
    if (rgb) {
      return [parseInt(rgb[1], 10), parseInt(rgb[2], 10), parseInt(rgb[3], 10), 1];
    }
    try {
      const parsed = asArray(color);
      return [parsed[0], parsed[1], parsed[2], parsed[3]];
    } catch (e) {
      // invalid color string: fall through
    }
  }
  return fallback;
}

function rgbaString(c: RGBA, alpha: number = c[3]): string {
  return `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
}

function isPointGeometry(geometry: Geometry | undefined): boolean {
  const type = geometry && geometry.getType();
  return type === 'Point' || type === 'MultiPoint';
}

/** Geometry that decides how a feature is drawn: the first part of a GeometryCollection, as before. */
function getStyledGeometry(feature: Feature<Geometry>): Geometry | undefined {
  const geometry = feature.getGeometry();
  if (geometry instanceof GeometryCollection) {
    return geometry.getGeometries()[0];
  }
  return geometry;
}

const firstGeometryOfCollection = (feature: Feature<Geometry>) => getStyledGeometry(feature);

export function isPointFeature(feature: Feature<Geometry>): boolean {
  return isPointGeometry(getStyledGeometry(feature));
}

/**
 * Resolves color and visibility of each taxonomy group once, then writes them on the features.
 */
export class FeatureAppearanceResolver {
  private key: string | null = null;
  private context: ColorContext | null = null;
  private groups: { [group: string]: GroupAppearance } = {};
  private defaultAppearance: GroupAppearance = { hidden: false, color: [128, 128, 128, 0.9] };

  /** Returns true when the context differs from the previous one (feature attributes must be rewritten). */
  update(context: ColorContext): boolean {
    const key = JSON.stringify([
      context.defaultColor,
      context.hideTaxonomy,
      context.colorTaxonomy,
      context.associations,
    ]);
    if (key === this.key) {
      return false;
    }
    this.key = key;
    this.context = context;
    this.groups = {};
    this.defaultAppearance = {
      hidden: false,
      color: toBoostedRgba(context.defaultColor, [128, 128, 128, 0.9]),
    };
    return true;
  }

  applyTo(features: Feature<Geometry>[]): void {
    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      const appearance = this.resolve(feature);
      setFeatureColor(feature, appearance.color, appearance.hidden);
    }
  }

  private resolve(feature: Feature<Geometry>): GroupAppearance {
    const context = this.context;
    if (!context || (!context.hideTaxonomy && !context.colorTaxonomy)) {
      return this.defaultAppearance;
    }
    const hideValue = context.hideTaxonomy ? feature.get(context.hideTaxonomy) : undefined;
    const colorValue = context.colorTaxonomy ? feature.get(context.colorTaxonomy) : undefined;
    const hideGroup = hideValue !== undefined ? hideValue.value : undefined;
    const colorGroup = colorValue && colorValue.value ? colorValue.value : undefined;
    const cacheKey = `${hideValue !== undefined ? hideGroup : '\u0000'}\u0001${colorGroup !== undefined ? colorGroup : '\u0000'}`;

    let appearance = this.groups[cacheKey];
    if (!appearance) {
      appearance = {
        hidden: hideValue !== undefined && this.isGroupHidden(hideGroup),
        color: colorGroup !== undefined ? this.groupColor(colorGroup) : this.defaultAppearance.color,
      };
      this.groups[cacheKey] = appearance;
    }
    return appearance;
  }

  /** A group toggled off in the controls has a fully transparent color. */
  private isGroupHidden(group: any): boolean {
    const associations = this.context.associations;
    if (!(group in associations)) {
      return false;
    }
    const color = associations[group];
    if (typeof color === 'string' && color.startsWith('rgba')) {
      const alpha = color.match(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)/);
      return !!alpha && parseFloat(alpha[1]) === 0;
    }
    return typeof color === 'object' && color !== null && color.rgb && color.rgb.a === 0;
  }

  private groupColor(group: string): RGBA {
    const { associations, defaultColor } = this.context;
    const groupColor = associations[group];
    if (group in associations && groupColor !== defaultColor) {
      if (typeof groupColor === 'string') {
        return toBoostedRgba(groupColor, this.defaultAppearance.color);
      } else if (groupColor && groupColor.rgb) {
        const rgb = groupColor.rgb;
        return toBoostedRgba(`rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`, this.defaultAppearance.color);
      }
    }
    return this.defaultAppearance.color;
  }
}

/**
 * Shared, cached canvas styles. Styles are keyed by their visual parameters, so thousands of
 * features reuse a handful of `Style` objects instead of allocating new ones on every frame.
 */
export class CanvasStyleCache {
  private styles: { [key: string]: Style } = {};

  clear(): void {
    this.styles = {};
  }

  /**
   * Base style of a feature: polygon/line fill and stroke, or the map-marker glyph for points.
   * Returns null when the feature is filtered out.
   */
  featureStyle(
    feature: Feature<Geometry>,
    yearFilter: YearFilter,
    dimmed: boolean,
    overrides: LayerOpacityOverrides,
    pointLabel: string
  ): Style | null {
    if (!isShownByGroup(feature) || !isShownByYear(feature, yearFilter)) {
      return null;
    }
    const c = getFeatureColor(feature);
    const isCollection = feature.getGeometry() instanceof GeometryCollection;

    if (isPointFeature(feature)) {
      const style = this.cached(`pt|${c.join(',')}|${isCollection}`, () =>
        new Style({
          geometry: isCollection ? firstGeometryOfCollection : undefined,
          text: new Text({
            text: MARKER_GLYPH,
            font: 'normal 22px FontAwesome',
            textBaseline: 'bottom',
            fill: new Fill({ color: rgbaString(c) }),
          }),
        })
      );
      // The label, when selected, replaces the marker glyph (historical behaviour).
      style.getText().setText(pointLabel || MARKER_GLYPH);
      return style;
    }

    const fillAlpha = dimmed ? DIMMED_ALPHA : overrides.fillOpacity !== undefined ? overrides.fillOpacity : c[3];
    const strokeAlpha = dimmed ? DIMMED_ALPHA : overrides.strokeOpacity !== undefined ? overrides.strokeOpacity : c[3];
    return this.cached(`pg|${c.join(',')}|${fillAlpha}|${strokeAlpha}|${isCollection}`, () =>
      new Style({
        geometry: isCollection ? firstGeometryOfCollection : undefined,
        fill: new Fill({ color: rgbaString(c, fillAlpha) }),
        stroke: new Stroke({ color: rgbaString(c, strokeAlpha), width: POLYGON_STROKE_WIDTH }),
      })
    );
  }

  /** Label of a polygon/line feature (point labels are drawn by `featureStyle`). */
  labelStyle(feature: Feature<Geometry>, yearFilter: YearFilter, label: string, background: boolean): Style | null {
    if (!label || isPointFeature(feature) || !isShownByGroup(feature) || !isShownByYear(feature, yearFilter)) {
      return null;
    }
    const isCollection = feature.getGeometry() instanceof GeometryCollection;
    const style = this.cached(`lb|${background}|${isCollection}`, () => {
      const textOptions: any = {
        font: '12px Calibri,sans-serif',
        overflow: true,
        fill: new Fill({ color: '#000' }),
        stroke: new Stroke({ color: '#fff', width: 3 }),
      };
      if (background) {
        textOptions.backgroundFill = new Fill({ color: 'rgba(255, 255, 255, 0.8)' });
        textOptions.backgroundStroke = new Stroke({ color: 'rgba(0, 0, 0, 0.1)', width: 1 });
        textOptions.padding = [2, 4, 2, 4];
      }
      return new Style({
        geometry: isCollection ? firstGeometryOfCollection : undefined,
        text: new Text(textOptions),
      });
    });
    style.getText().setText(label);
    return style;
  }

  /** Style of a highlighted (selected) feature, drawn on the highlight overlay. */
  highlightStyle(feature: Feature<Geometry>, pointLabel: string): Style {
    const c = getFeatureColor(feature);
    const geometry = getStyledGeometry(feature);
    const type = geometry && geometry.getType();
    const isCollection = feature.getGeometry() instanceof GeometryCollection;
    const geometryOption = isCollection ? firstGeometryOfCollection : undefined;

    if (type === 'Polygon' || type === 'MultiPolygon') {
      return this.cached(`hl-pg|${c.join(',')}|${isCollection}`, () =>
        new Style({
          geometry: geometryOption,
          fill: new Fill({ color: rgbaString(c, HIGHLIGHT_FILL_ALPHA) }),
          stroke: new Stroke({ color: rgbaString(c), width: 2 }),
        })
      );
    }
    if (type === 'Point' || type === 'MultiPoint') {
      const style = this.cached(`hl-pt|${c.join(',')}|${isCollection}`, () =>
        new Style({
          geometry: geometryOption,
          image: new CircleStyle({
            radius: 10,
            fill: new Fill({ color: 'rgba(255, 165, 0, 1.0)' }),
            stroke: new Stroke({ color: '#FFFFFF', width: 3 }),
          }),
          text: new Text({
            text: MARKER_GLYPH,
            font: 'normal 22px FontAwesome',
            textBaseline: 'bottom',
            fill: new Fill({ color: rgbaString(c) }),
          }),
        })
      );
      style.getText().setText(pointLabel || MARKER_GLYPH);
      return style;
    }
    return this.cached(`hl-ln|${isCollection}`, () =>
      new Style({
        geometry: geometryOption,
        stroke: new Stroke({ color: '#FFFFFF', width: 1 }),
      })
    );
  }

  private cached(key: string, create: () => Style): Style {
    let style = this.styles[key];
    if (!style) {
      style = create();
      this.styles[key] = style;
    }
    return style;
  }
}

/** Initial values of the variables used by `buildWebglFeatureStyle`. */
export function webglStyleVariables(yearFilter: YearFilter, dimmed: boolean) {
  return { year: yearFilter.year, yearOn: yearFilter.on ? 1 : 0, dim: dimmed ? 1 : 0 };
}

/**
 * GPU style for polygons and lines. Filtering (groups, years) and dimming are evaluated in the
 * shaders, so the year slider, the timeline and the selection only update uniforms.
 * Points are not drawn by this style (no circle/icon): they go to a canvas companion layer that
 * keeps the map-marker glyph.
 */
export function buildWebglFeatureStyle(overrides: LayerOpacityOverrides): FlatStyleLike {
  const P = RENDER_PROPS;
  const flags = ['get', P.flags];
  const yearStatus = ['%', flags, 4];
  const groupHidden = ['==', ['%', ['floor', ['/', flags, 4]], 2], 1];
  const featureAlpha = ['/', ['floor', ['/', flags, 8]], 255];
  const rgb = ['get', P.rgb];
  const red = ['floor', ['/', rgb, 65536]];
  const green = ['%', ['floor', ['/', rgb, 256]], 256];
  const blue = ['%', rgb, 256];

  const yearOk = [
    'any',
    ['==', ['var', 'yearOn'], 0],
    ['==', yearStatus, 0],
    [
      'all',
      ['==', yearStatus, 1],
      ['<=', ['get', P.bob], ['var', 'year']],
      ['<=', ['var', 'year'], ['get', P.eoe]],
    ],
  ];
  const alpha = (override: number | undefined) => [
    'case',
    ['==', ['var', 'dim'], 1],
    DIMMED_ALPHA,
    override !== undefined ? override : featureAlpha,
  ];
  const color = (override: number | undefined) => ['color', red, green, blue, alpha(override)];
  return [
    {
      filter: ['all', ['!', groupHidden], yearOk],
      style: {
        'fill-color': color(overrides.fillOpacity),
        'stroke-color': color(overrides.strokeOpacity),
        'stroke-width': POLYGON_STROKE_WIDTH,
      },
    },
  ] as any;
}
