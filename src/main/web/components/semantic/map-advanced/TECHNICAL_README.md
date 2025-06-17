# SemanticMapAdvanced - Technical Documentation

## Overview

The `SemanticMapAdvanced` component is a sophisticated mapping solution built on OpenLayers that provides advanced visualization capabilities for geographic and semantic data. It enables the display of various types of geographic features (points, polygons, etc.) with customizable styling, interactive controls, and multiple visualization modes.

## Architecture

The component consists of two main parts:

1. **SemanticMapAdvanced**: The core map component that renders the OpenLayers map and handles feature display, interactions, and visualization modes.
2. **SemanticMapControls**: A companion component that provides a user interface for controlling map layers, styling features, and activating visualization modes.

These components communicate through a custom event system, allowing them to be used together or independently.

## File Structure

- **SemanticMapAdvanced.ts**: Main map component implementation
- **SemanticMapControls.tsx**: UI controls component implementation
- **SemanticMapEvents.ts**: Event definitions for map-to-controls communication
- **SemanticMapControlsEvents.ts**: Event definitions for controls-to-map communication
- **TilesLayer.ts**: Component for defining tile layers
- **SemanticMapLoading.scss**: Styling for loading indicators
- **SemanticMapControls.scss**: Styling for the controls component

## Core Classes and Interfaces

### SemanticMapAdvanced

#### Props (SemanticMapAdvancedConfig)

| Property | Type | Description |
|----------|------|-------------|
| `query` | string | SPARQL Select query that projects geographic data |
| `tupleTemplate` | string | Template for marker popups |
| `noResultTemplate` | string | Template displayed when query returns no results |
| `fixZoomLevel` | number | Optional fixed zoom level (0-18) |
| `fixCenter` | Array<number> | Optional fixed center coordinates |
| `mapOptions` | MapOptions | Map configuration options |
| `id` | string | Component ID for event communication |
| `provider` | Source | Map tile provider (e.g., "osm") |
| `providerOptions` | ProviderOptions | Provider-specific options |
| `targetControls` | Array<string> | IDs of control components to sync with |
| `featureSelectionTargets` | Array<string> | Targets for feature selection events |
| `yearFiltering` | boolean | Enable filtering by year |
| `vectorLevels` | Array | Possible levels of features in the map |
| `selectedFeatureStyle` | object | Style configuration for selected features |

#### State (MapState)

| Property | Type | Description |
|----------|------|-------------|
| `tupleTemplate` | Data.Maybe<HandlebarsTemplateDelegate> | Compiled template for popups |
| `errorMessage` | Data.Maybe<string> | Error message if any |
| `noResults` | boolean | Whether query returned no results |
| `isLoading` | boolean | Loading state |
| `baseMapLoaded` | boolean | Whether base map has loaded |
| `overlayVisualization` | string | Current visualization mode |
| `featureColor` | string | Default feature color |
| `mapLayers` | Array<any> | Map layers |
| `maskIndex` | number | Index for visualization mask |
| `featuresLabel` | string | Property to use for feature labels |
| `featuresColorTaxonomy` | string | Property to use for feature coloring |
| `groupColorAssociations` | object | Color associations for feature groups |
| `year` | string | Current year for filtering |
| `yearFiltering` | boolean | Whether year filtering is enabled |
| `registeredControls` | Array<any> | Registered control components |
| `selectedFeature` | Feature | Currently selected feature |
| `vectorLevels` | object | Configuration for vector levels |

#### Key Methods

| Method | Description |
|--------|-------------|
| `createMap()` | Initializes the OpenLayers map |
| `addMarkersFromQuery()` | Executes SPARQL query and adds markers to the map |
| `initializeMarkerPopup()` | Sets up popup functionality for markers |
| `updateLayers()` | Updates map layers with new geometries |
| `setOverlayVisualization()` | Sets the current visualization mode |
| `applyFeaturesFilteringFromControls()` | Applies filters from controls to features |
| `updateFeatureColorsByGroups()` | Updates feature colors based on group associations |
| `highlightFeaturesByIris()` | Highlights features by their subject IRIs |
| `zoomToFeature()` | Zooms the map to a specific feature |
| `activateMeasurementTool()` | Activates the measurement tool |
| `deactivateMeasurementTool()` | Deactivates the measurement tool |

### SemanticMapControls

#### Props

| Property | Type | Description |
|----------|------|-------------|
| `targetMapId` | string | ID of the target map component |
| `id` | string | Component ID for event communication |
| `featuresTaxonomies` | string | Comma-separated list of taxonomies for features |
| `featuresColorTaxonomies` | string | Comma-separated list of taxonomies for coloring |
| `featuresOptionsEnabled` | boolean | Whether feature options are enabled |
| `filtersInitialization` | Filters | Initial filter state |
| `showFilters` | boolean | Whether to show filters |
| `timeline` | Timeline | Timeline configuration |
| `featuresColorsPalette` | string | Color palette for features |
| `locked` | boolean | Whether timeline is locked |
| `tour` | boolean | Whether tour mode is enabled |
| `renderTemplate` | string | Template reference for rendering |
| `fallbackTemplate` | string | Fallback template |
| `detailsMapTemplate` | string | Template for details panel |
| `baseMapTemplate` | string | Template for base maps panel |
| `buildingsTemplate` | string | Template for buildings panel |
| `templateMapping` | object | Mapping of data kinds to templates |

#### State

| Property | Type | Description |
|----------|------|-------------|
| `overlayOpacity` | number | Opacity of overlay layers |
| `swipeValue` | number | Value for swipe visualization |
| `overlayVisualization` | string | Current visualization mode |
| `loading` | boolean | Loading state |
| `color` | any | Current color |
| `mapLayers` | Array<any> | Map layers |
| `maskIndex` | number | Index for visualization mask |
| `filters` | Filters | Current filter state |
| `selectedFeaturesLabel` | string | Property to use for feature labels |
| `featuresColorTaxonomy` | string | Property to use for feature coloring |
| `featuresColorGroups` | string[] | Groups for feature coloring |
| `groupColorAssociations` | object | Color associations for feature groups |
| `displayColorPicker` | object | State of color pickers |
| `year` | number | Current year for filtering |
| `yearMarks` | number[] | Year marks for timeline |
| `registeredMap` | string | ID of registered map |
| `groupDisabled` | object | Disabled state of groups |
| `selectedFeature` | any | Currently selected feature |
| `activePanel` | string | Currently active panel |
| `isPlaying` | boolean | Whether timeline is playing |
| `generalizedData` | GeneralizedEventData | Generalized data for rendering |

#### Key Methods

| Method | Description |
|--------|-------------|
| `triggerRegisterToMap()` | Registers the controls with the map |
| `triggerUnregisterToMap()` | Unregisters the controls from the map |
| `triggerSendLayers()` | Sends layer information to the map |
| `triggerSendYear()` | Sends year information to the map |
| `triggerSendFeaturesColorsAssociationsToMap()` | Sends color associations to the map |
| `triggerVisualization()` | Triggers visualization mode change |
| `togglePanel()` | Toggles a panel open/closed |
| `toggleVisualizationMode()` | Toggles a visualization mode on/off |
| `handleTimelinePlay()` | Handles timeline play/pause |
| `handleColorPickerChange()` | Handles color picker changes |
| `generateColorPalette()` | Generates a color palette for features |

## Event System

The components communicate through a custom event system defined in `SemanticMapEvents.ts` and `SemanticMapControlsEvents.ts`. Key events include:

### Map-to-Controls Events

| Event | Description |
|-------|-------------|
| `SemanticMapBoundingBoxChanged` | Fired when the map's bounding box changes |
| `SemanticMapUpdateFeatureColor` | Updates feature colors |
| `SemanticMapSendSelectedFeature` | Sends selected feature to controls |
| `SemanticMapRequestControlsRegistration` | Requests controls to register with the map |
| `SemanticMapClearSelectedFeature` | Clears the selected feature |

### Controls-to-Map Events

| Event | Description |
|-------|-------------|
| `SemanticMapControlsOverlayVisualization` | Sets visualization mode |
| `SemanticMapControlsOverlaySwipe` | Sets swipe value |
| `SemanticMapControlsFeatureColor` | Sets feature color |
| `SemanticMapControlsSendMapLayersToMap` | Sends layer information to the map |
| `SemanticMapControlsSendMaskIndexToMap` | Sends mask index to the map |
| `SemanticMapControlsSendFeaturesLabelToMap` | Sends feature label property to the map |
| `SemanticMapControlsSendFeaturesColorTaxonomyToMap` | Sends color taxonomy to the map |
| `SemanticMapControlsSendGroupColorsAssociationsToMap` | Sends color associations to the map |
| `SemanticMapControlsSendYear` | Sends year to the map |
| `SemanticMapControlsRegister` | Registers controls with the map |
| `SemanticMapControlsUnregister` | Unregisters controls from the map |
| `SemanticMapControlsToggleMeasurement` | Toggles measurement tool |
| `SemanticMapControlsHighlightFeatures` | Highlights features based on a SPARQL pattern |

## Integration with OpenLayers

The component uses OpenLayers for map rendering and interaction. Key OpenLayers classes used include:

- `Map`: Main map class
- `View`: Map view configuration
- `TileLayer`: For base maps and overlays
- `VectorLayer`: For feature layers
- `Feature`: For map features
- `Style`: For feature styling
- `Overlay`: For popups and tooltips
- `Draw`, `Modify`, `Snap`: For editing interactions
- `Cluster`: For clustering features

## Advanced Features

### Visualization Modes

The component supports several visualization modes:

- **Normal**: Standard map view
- **Spyglass**: Allows viewing one layer through another using a circular lens
- **Swipe**: Allows comparing two layers using a swipe interface
- **Measurement**: Allows measuring distances on the map

### Feature Styling

Features can be styled based on properties:

- Color by taxonomy
- Label by taxonomy
- Custom color associations for groups
- Highlight selected features

### Timeline

The component supports timeline functionality for temporal data:

- Year-based filtering
- Timeline slider
- Animation mode
- Year marks for navigation

### Feature Selection

Features can be selected by clicking, which:

- Highlights the feature
- Displays feature information in a popup
- Sends feature information to controls
- Can trigger SPARQL queries for related data

## Performance Optimizations

The component includes several optimizations for handling large datasets:

- Feature clustering for point data
- Dynamic cluster distance based on zoom level
- Style caching to reduce style creation overhead
- Visible feature tracking to optimize rendering
- Debounced updates for viewport changes
- Optimized feature filtering

## Integration Example

```typescript
<SemanticMapAdvanced
  id="my-map"
  query="SELECT ?lat ?lng ?wkt ?subject ?name WHERE { ... }"
  tupleTemplate="<div>{{name.value}}</div>"
  fixZoomLevel={12}
  mapOptions={{ crs: "EPSG:3857" }}
  provider="osm"
  targetControls={["my-controls"]}
  yearFiltering={true}
/>

<SemanticMapControls
  id="my-controls"
  targetMapId="my-map"
  featuresTaxonomies="name,type,category"
  featuresColorTaxonomies="type"
  featuresOptionsEnabled={true}
  timeline={{
    mode: "normal",
    min: 1800,
    max: 2023,
    default: 2023
  }}
/>
