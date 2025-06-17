# SemanticMapAdvanced - User Guide

## Overview

The `SemanticMapAdvanced` component is a powerful interactive map solution that allows you to display geographic data with rich semantic information. It provides advanced visualization capabilities, interactive controls, and customizable styling options.

## Basic Integration

To integrate the SemanticMapAdvanced component into your HTML page, you need to include both the map component and its controls:

```html
<div class="container">
  <!-- The map component -->
  <semantic-map-advanced
    id="my-map"
    query="SELECT ?lat ?lng ?wkt ?subject ?name WHERE { ... }"
    tuple-template="<div>{{name.value}}</div>"
    fix-zoom-level="12"
    provider="osm"
    target-controls='["my-controls"]'
    year-filtering="true">
  </semantic-map-advanced>

  <!-- The controls component -->
  <semantic-map-controls
    id="my-controls"
    target-map-id="my-map"
    features-taxonomies="name,type,category"
    features-color-taxonomies="type"
    features-options-enabled="true"
    timeline='{"mode":"normal","min":1800,"max":2023,"default":2023}'>
  </semantic-map-controls>
</div>
```

## Component Attributes

### SemanticMapAdvanced Attributes

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Unique identifier for the map component |
| `query` | string | Yes | SPARQL Select query that retrieves geographic data |
| `tuple-template` | string | No | Template for marker popups |
| `no-result-template` | string | No | Template displayed when query returns no results |
| `fix-zoom-level` | number | No | Fixed zoom level (0-18) |
| `fix-center` | JSON Array | No | Fixed center coordinates as [lng, lat] |
| `map-options` | JSON Object | No | Map configuration options |
| `provider` | string | No | Map tile provider (e.g., "osm") |
| `provider-options` | JSON Object | No | Provider-specific options |
| `target-controls` | JSON Array | No | IDs of control components to sync with |
| `feature-selection-targets` | JSON Array | No | Targets for feature selection events |
| `year-filtering` | boolean | No | Enable filtering by year (default: false) |
| `vector-levels` | JSON Array | No | Possible levels of features in the map |
| `selected-feature-style` | JSON Object | No | Style configuration for selected features |

### SemanticMapControls Attributes

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Unique identifier for the controls component |
| `target-map-id` | string | Yes | ID of the target map component |
| `features-taxonomies` | string | No | Comma-separated list of taxonomies for features |
| `features-color-taxonomies` | string | No | Comma-separated list of taxonomies for coloring |
| `features-options-enabled` | boolean | No | Whether feature options are enabled (default: false) |
| `filters-initialization` | JSON Object | No | Initial filter state |
| `show-filters` | boolean | No | Whether to show filters (default: false) |
| `timeline` | JSON Object | No | Timeline configuration |
| `features-colors-palette` | JSON Object/String | No | Color palette for features |
| `locked` | boolean | No | Whether timeline is locked (default: false) |
| `tour` | boolean | No | Whether tour mode is enabled (default: false) |
| `render-template` | string | No | Template reference for rendering |
| `fallback-template` | string | No | Fallback template |
| `details-map-template` | string | No | Template for details panel |
| `base-map-template` | string | No | Template for base maps panel |
| `buildings-template` | string | No | Template for buildings panel |
| `template-mapping` | JSON Object | No | Mapping of data kinds to templates |

## SPARQL Query Format

The `query` attribute expects a SPARQL SELECT query that projects geographic data. The query should include at least one of the following:

1. `?lat` and `?lng` variables for point coordinates
2. `?wkt` variable with WKT geometry literals

Additional variables can be included for feature properties:

- `?subject`: IRI of the corresponding resource
- `?description`: Short textual description
- `?link`: IRI for linking
- `?color`: Custom color for the feature

Example query:

```sparql
PREFIX geo: <http://www.opengis.net/ont/geosparql#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?subject ?wkt ?name ?type ?year_built ?bob ?eob ?boe ?eoe WHERE {
  ?subject a <http://example.org/Building> ;
           geo:hasGeometry/geo:asWKT ?wkt ;
           rdfs:label ?name ;
           <http://example.org/type> ?type ;
           <http://example.org/yearBuilt> ?year_built .
  
  # For temporal filtering
  OPTIONAL {
    ?subject <http://example.org/beginOfBegin> ?bob ;
             <http://example.org/endOfBegin> ?eob ;
             <http://example.org/beginOfEnd> ?boe ;
             <http://example.org/endOfEnd> ?eoe .
  }
}
```

## Common Use Cases

### Basic Map with Markers

```html
<semantic-map-advanced
  id="basic-map"
  query="SELECT ?lat ?lng ?subject ?name WHERE { ... }"
  tuple-template="<div>{{name.value}}</div>"
  provider="osm">
</semantic-map-advanced>
```

### Map with Custom Tile Layers

```html
<semantic-map-advanced
  id="custom-tiles-map"
  query="SELECT ?lat ?lng ?subject ?name WHERE { ... }">
  
  <!-- Define custom tile layers -->
  <tiles-layer
    level="basemap"
    name="OpenStreetMap"
    identifier="osm-standard"
    url="https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    author="OpenStreetMap Contributors"
    year="2023">
  </tiles-layer>
  
  <tiles-layer
    level="overlay"
    name="Historical Map"
    identifier="historical-1900"
    url="https://example.org/tiles/{z}/{x}/{y}.png"
    author="Historical Society"
    year="1900">
  </tiles-layer>
</semantic-map-advanced>
```

### Map with Feature Styling and Timeline

```html
<semantic-map-advanced
  id="styled-map"
  query="SELECT ?wkt ?subject ?name ?type ?bob ?eob ?boe ?eoe WHERE { ... }"
  year-filtering="true"
  target-controls='["styled-map-controls"]'>
</semantic-map-advanced>

<semantic-map-controls
  id="styled-map-controls"
  target-map-id="styled-map"
  features-taxonomies="name,type"
  features-color-taxonomies="type"
  features-options-enabled="true"
  features-colors-palette='{"Residential":"rgba(255,0,0,0.5)","Commercial":"rgba(0,0,255,0.5)","Industrial":"rgba(255,255,0,0.5)"}'
  timeline='{"mode":"normal","min":1800,"max":2023,"default":1950}'>
</semantic-map-controls>
```

### Map with Custom Templates for Feature Details

```html
<semantic-map-advanced
  id="template-map"
  query="SELECT ?wkt ?subject ?name ?type WHERE { ... }"
  target-controls='["template-controls"]'>
</semantic-map-advanced>

<semantic-map-controls
  id="template-controls"
  target-map-id="template-map"
  render-template="{{> building-details}}"
  template-mapping='{"Building":"{{> building-details}}","Person":"{{> person-details}}"}'>
  
  <!-- Define templates -->
  <template id="building-details">
    <div class="building-details">
      <h3>{{selectedFeature.get 'name' 'value'}}</h3>
      <p>Type: {{selectedFeature.get 'type' 'value'}}</p>
      <button onclick="document.dispatchEvent(new CustomEvent('feature-close-clicked'))">Close</button>
    </div>
  </template>
  
  <template id="person-details">
    <div class="person-details">
      <h3>{{generalizedData.data.name}}</h3>
      <p>Occupation: {{generalizedData.data.occupation}}</p>
      <button onclick="document.dispatchEvent(new CustomEvent('feature-close-clicked'))">Close</button>
    </div>
  </template>
</semantic-map-controls>
```

## Visualization Modes

The SemanticMapControls component provides several visualization modes:

### Spyglass Mode

Allows viewing one layer through another using a circular lens. Useful for comparing historical maps with current maps.

```html
<semantic-map-controls
  id="spyglass-controls"
  target-map-id="spyglass-map">
  <!-- The spyglass button is included in the controls sidebar -->
</semantic-map-controls>
```

### Swipe Mode

Allows comparing two layers using a swipe interface. Useful for before/after comparisons.

```html
<semantic-map-controls
  id="swipe-controls"
  target-map-id="swipe-map">
  <!-- The swipe button is included in the controls sidebar -->
</semantic-map-controls>
```

### Measurement Mode

Allows measuring distances on the map.

```html
<semantic-map-controls
  id="measurement-controls"
  target-map-id="measurement-map">
  <!-- The measurement button is included in the controls sidebar -->
</semantic-map-controls>
```

## Timeline Configuration

The timeline feature allows filtering features based on temporal data. Configure it using the `timeline` attribute:

```html
<semantic-map-controls
  id="timeline-controls"
  target-map-id="timeline-map"
  timeline='{"mode":"normal","min":1800,"max":2023,"default":1950,"locked":false,"tour":true}'>
</semantic-map-controls>
```

Timeline configuration options:

| Option | Type | Description |
|--------|------|-------------|
| `mode` | string | "normal" for continuous slider, "marked" for discrete marks |
| `min` | number | Minimum year value |
| `max` | number | Maximum year value |
| `default` | number | Default year value |
| `locked` | boolean | Whether timeline is locked (default: false) |
| `tour` | boolean | Whether tour mode is enabled (default: false) |

## Feature Styling

Features can be styled based on properties using the controls component:

```html
<semantic-map-controls
  id="styling-controls"
  target-map-id="styling-map"
  features-taxonomies="name,type,category"
  features-color-taxonomies="type"
  features-options-enabled="true"
  features-colors-palette='{"Residential":"rgba(255,0,0,0.5)","Commercial":"rgba(0,0,255,0.5)"}'>
</semantic-map-controls>
```

## Event Handling

The component fires several events that you can listen to:

```javascript
// Listen for feature selection
document.addEventListener('SemanticMap.SendSelectedFeature', function(event) {
  console.log('Selected feature:', event.detail.data);
});

// Listen for bounding box changes
document.addEventListener('SemanticMap.BoundingBoxChanged', function(event) {
  console.log('Bounding box changed:', event.detail.data);
});

// Listen for component loaded event
document.addEventListener('ComponentLoaded', function(event) {
  if (event.detail.source === 'my-map') {
    console.log('Map loaded with data:', event.detail.data);
  }
});

// Programmatically clear selected feature
document.dispatchEvent(new CustomEvent('feature-close-clicked'));
```

## Styling

The component can be styled using CSS:

```css
/* Set the height and width of the map */
semantic-map-advanced {
  height: 600px;
  width: 100%;
}

/* Style the controls sidebar */
.map-controls-sidebar {
  background-color: #f5f5f5;
}

/* Style the map controls buttons */
.map-controls-button {
  background-color: white;
  border: 1px solid #ddd;
}

.map-controls-button-active {
  background-color: #007bff;
  color: white;
}

/* Style the feature popup */
.ol-popup {
  background-color: white;
  box-shadow: 0 1px 4px rgba(0,0,0,0.2);
  padding: 15px;
  border-radius: 10px;
  border: 1px solid #cccccc;
  max-width: 300px;
}
```

## Best Practices

1. **Query Optimization**: Limit the number of features returned by your SPARQL query to improve performance.

2. **Use Feature Clustering**: For large datasets, the component automatically uses clustering for point data, which improves performance.

3. **Provide Meaningful Templates**: Use templates to provide rich, interactive information in popups and panels.

4. **Layer Organization**: Organize your layers logically, with base maps at the bottom and overlays on top.

5. **Responsive Design**: Set the map container to use relative dimensions (percentages) for responsive layouts.

6. **Feature Selection**: Implement feature selection handlers to provide additional information or functionality when features are selected.

7. **Timeline Configuration**: Configure the timeline to match your data's temporal range for optimal filtering.

8. **Color Palette**: Use a consistent color palette for feature styling to improve visual clarity.

9. **Custom Templates**: Use custom templates for feature details to provide rich, interactive information.

10. **Event Handling**: Listen for component events to integrate the map with other components on your page.
