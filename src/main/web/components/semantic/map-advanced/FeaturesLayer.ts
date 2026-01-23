import { Props } from 'react';
import { Component, ComponentContext } from 'platform/api/components';

/**
 * Configuration for features-layer component
 * This is a declarative component for defining vector/feature layers
 * inside semantic-map-advanced
 */
export interface FeaturesLayerConfig {
  /**
   * Required: Unique identifier for the layer
   */
  identifier: string;

  /**
   * Required: Display name shown in map controls
   */
  name: string;

  /**
   * Optional: Type of geometry - 'geometry', 'markers', 'points'
   * Default: 'geometry'
   */
  type?: string;

  /**
   * Optional: Stacking order, higher values appear on top
   * Default: 1
   */
  'z-index'?: string | number;

  /**
   * Required: SPARQL query for this layer's data
   * Query should return: ?subject, ?wkt, and optionally temporal fields (?bob, ?eoe)
   */
  query: string;

  /**
   * Optional: Initial visibility state
   * Default: true
   */
  visible?: boolean | string;

  /**
   * Optional: Initial opacity 0-1
   * Default: 1
   */
  opacity?: number | string;
}

export type FeaturesLayerProps = FeaturesLayerConfig & Props<any>;

/**
 * FeaturesLayer component for declaring vector data layers in semantic-map-advanced
 * 
 * This is a declarative component - it renders nothing itself, but is read by the
 * parent SemanticMapAdvanced component to configure feature layers.
 * 
 * @example
 * ```html
 * <semantic-map-advanced id="my-map" ...>
 *   <features-layer
 *     identifier="buildings"
 *     name="Buildings"
 *     type="geometry"
 *     z-index="3"
 *     query="SELECT ?subject ?wkt ?bob ?eoe WHERE { ... }"
 *     visible="true"
 *     opacity="0.8">
 *   </features-layer>
 * </semantic-map-advanced>
 * ```
 */
export class FeaturesLayer extends Component<FeaturesLayerProps, any> {
  constructor(props: FeaturesLayerProps, context: ComponentContext) {
    super(props, context);
  }

  public componentDidMount() {
    // This component is declarative only - no mounting logic needed
  }

  public render() {
    // Renders nothing - parent component reads this as a child to extract configuration
    return null;
  }
}

export default FeaturesLayer;
