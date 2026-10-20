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
| `labels-min-zoom` | number | No | Draw feature labels only above this zoom level (default: all zoom levels). Useful with many features, since labels are drawn on the CPU |
| `features-fill-opacity` | number | No | Fill opacity (0-1) of the features loaded by `query`, replacing the opacity of their colors |
| `features-stroke-opacity` | number | No | Stroke opacity (0-1) of the features loaded by `query` |

### SemanticMapControls Attributes

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Unique identifier for the controls component |
| `target-map-id` | string | Yes | ID of the target map component |
| `features-taxonomies` | string | No | Comma-separated list of taxonomies for features |
| `features-color-taxonomies` | string | No | Comma-separated list of taxonomies for coloring |
| `features-taxonomies-labels` | JSON Object | No | Display names of the taxonomies in "Label by" and "Color by", e.g. `{"specie_pro":"Property type (1835)"}`; others show their own name |
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
| `styling-enabled` | boolean | No | Initial state of the "Enable Feature Styling" toggle, which also shows the colors legend (default: false) |
| `spatial-filter-default` | boolean | No | Initial state of the "filter by zoom" checkbox (default: true) |
| `temporal-filter-default` | boolean | No | Initial state of the "filter by time" checkbox (default: false) |
| `sync-filter-default` | boolean | No | Initial state of the "sync with time" checkbox (default: false) |
| `spatial-filter-label` | string | No | Label of the spatial filter checkbox (default: "Filter by zoom") |
| `temporal-filter-label` | string | No | Label of the temporal filter checkbox (default: "Filter by time") |
| `sync-filter-label` | string | No | Label of the sync checkbox (default: "Sync with time") |
| `time-filter-mode` | string | No | `snapshot` (default), `cumulative` or `exact` — see "Historical Map Filters" |
| `snap-filter-default` | boolean | No | Initial state of the "snap to map years" button (default: true) |
| `snap-filter-label` | string | No | Label of the snap button on the timeline (default: "Snap to map years") |
| `snap-tolerance-years` | number | No | How close the slider must come to a marker to snap (default: 3) |

## SPARQL Query Format

The `query` attribute expects a SPARQL SELECT query that projects geographic data. The query should include at least one of the following:

1. `?lat` and `?lng` variables for point coordinates
2. `?wkt` variable with WKT geometry literals

Additional variables can be included for feature properties:

- `?subject`: IRI of the corresponding resource
- `?id`: Unique id of the geometry, when a resource has several of them (e.g. one per epoch, with its own `?bob`/`?eoe`). Defaults to `?subject`; rows repeating an id are ignored. Selection, highlight, zoom and recoloring still work by `?subject`, on all its geometries
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
| `snapYears` | number[] | Extra snap points besides the years of the historical maps (e.g. the epochs of the features). Drawn as dots on the timeline, without a map preview |
| `snapOnly` | boolean | When true the slider can only rest on the snap points (map years and `snapYears`): each point sits at its place in time and is labelled with its year (labels that would overlap are left out, the current year and the two ends always show), dragging jumps to the nearest point and the arrow keys step from one point to the next, the snap button is hidden and auto-play steps from one point to the next (default: false) |

## Historical Map Filters

When the map carries historical-map overlays (tile layers with `level="overlay"`), the layers panel
shows three checkboxes above the layer list. They only appear when at least one overlay exists.

The three checkboxes sit under the **Maps** divider, since they scope the map list below them.

| Checkbox | Effect |
|----------|--------|
| **Filter by zoom** | Lists only the sources whose island point (`?lat`/`?lng`) or geometry (`?wkt`) falls inside the current viewport. List only — it does not change what the map draws. |
| **Filter by time** | Lists only the sources that match the timeline year according to `time-filter-mode`. List only. |
| **Sync with time** | The timeline year **drives the actual visibility** of the overlays on the map: scrubbing the timeline switches historical maps on and off. |

`time-filter-mode` decides what "matches the year" means, and is shared by "Filter by time" and
"Sync with time":

- `snapshot` (default) — per `?group`, only the most recent source with year ≤ the selected year.
  With `?group` bound to the island, each island shows its own period map.
- `cumulative` — every source with year ≤ the selected year.
- `exact` — only sources whose year equals the selected year.

Notes on "Sync with time":

- It honours "Filter by zoom": with that checkbox on, only overlays inside the current viewport are
  switched on, so panning and zooming re-apply the sync too. A source with no spatial data passes
  the spatial test unconditionally and can therefore be shown while off-screen.
- Sources **without a year** are never touched by the sync and stay under manual control.
- The per-layer toggles remain clickable while the sync is on, but the timeline takes them back on
  the next year change; their tooltip says so.
- Switching the sync off **restores** the visibility the overlays had when it was switched on.
- The query must supply `?year` (numeric, or `YYYY-...`) and, for `snapshot`, a `?group` that is
  stable per place — the island IRI in VeNiSS. If `?group` is missing it falls back to `?location`
  and then to `?identifier`, which makes `snapshot` behave like `cumulative`.

## Timeline Year Markers

While "Sync with time" or "Filter by time" is on, the timeline shows a dot for every year that has
a historical map, so it is obvious where along the bar the maps actually change. Hovering a dot
opens a preview with the thumbnail, the year as recorded (forms like `1800 ca.` and `1860-1870` are
kept verbatim) and the island, and clicking it jumps straight to that year.

- The dots follow "Filter by zoom", so they describe the islands currently in view. They are never
  narrowed by the temporal filter — that would hide exactly the information they exist to show.
- One dot per year, always distinct — dots are never merged. A year covering several islands, such
  as 1982, shows all its thumbnails side by side in a single preview.
- Some years fall within a pixel or two of each other (1800 and 1801 on a 1500-2026 bar), which
  would stack their dots and make the left one unclickable. Such dots are nudged apart by the
  minimum that keeps them separable, so they can sit a few pixels away from their exact year; each
  run is re-centred on its true midpoint to keep that drift as small as possible.
- Years outside the timeline range, and maps with no year, get no dot.

A **Snap to map years** button sits on the timeline itself, just above the slider, and appears with
the dots. It is **on by default**. With it the slider is magnetic: it sticks to a marker when dragged within `snap-tolerance-years` of
it, while years in between stay selectable — which matters because features are filtered by their
own `bob`/`eoe` dates independently of the maps. Unchecking it leaves the dots visible and the drag
completely free. Timeline auto-play (`tour`) is never snapped.

Note that the snap is immediate rather than elastic, so the years within the tolerance of a marker
cannot be selected while it is on. With the default range that band is only two or three pixels
wide and a mouse cannot reliably hit it anyway, but stepping with the arrow keys will jump over it
— uncheck the box when a specific year in that band is needed.

Historical maps declared as `<tiles-layer level="overlay">` in the template get their marker from
their `year` attribute; an optional `group` attribute (default: `location`, then `identifier`) tells
the snapshot mode which maps show the same place. The timeline options `snapYears` and `snapOnly`
add artificial snap points and restrict the slider to the snap points.

## Related Entities Panel

Declare one `<related-entities-class>` per class of entity you want listed, as children of
`<semantic-map-controls>`. The panel appears in the sidebar as soon as at least one is declared.
Everything domain-specific lives in these elements, so the map component itself stays free of any
project vocabulary.

```html
<semantic-map-controls ...>
  <related-entities-class id="sources" label="Sources" icon="fa fa-file-text-o" limit="300"
      query='SELECT ?entity ?year WHERE { ... FILTER(?__spatial__) } ORDER BY ?year'
      spatial-pattern='?entity ex:place ?p . ?p ex:lat ?lat . FILTER(?lat >= ?__minLat__ ...)'>
    <template id='row'>...</template>
    <template id='detail'>...</template>
  </related-entities-class>
</semantic-map-controls>
```

| Attribute | Required | Description |
|-----------|----------|-------------|
| `id` | Yes | Tab key, unique among siblings |
| `label` | Yes | Tab label |
| `icon` | No | Icon class for the tab |
| `query` | Yes | SELECT projecting `?entity` and a numeric `?year`, ordered by `?year` |
| `spatial-pattern` | No | Patterns spliced in at `FILTER(?__spatial__)` while the spatial filter is on |
| `limit` | No | Row cap (default 200) |

`<semantic-map-controls>` itself takes `related-min-zoom`: below that map zoom the panel shows a
prompt instead of querying, which keeps a zoomed-out view from launching a region-wide query. The
threshold is read from the map's own zoom level, broadcast as `SemanticMap.SendViewportZoom`.

**The query contract.** Project `?entity` (the IRI) and `?year`. The year must already be a
**number**: a dataset may encode dates in several incompatible ways, and normalising them is the
query author's job — rows whose year is missing or unparseable are dropped, since they have no
place in a chronological feed. Every other projected binding is passed to the row and detail
templates. End with `ORDER BY ?year`, or the row cap returns an arbitrary window.

**The viewport.** The current map extent is substituted into these reserved variables wherever the
query or the spatial pattern uses them, in both projections because different data needs different
ones:

- `?__minX__` `?__minY__` `?__maxX__` `?__maxY__` — EPSG:3857, as expected by SQL/geometry services
- `?__minLon__` `?__minLat__` `?__maxLon__` `?__maxLat__` — WGS84 degrees, for graph-side comparisons

They are only legal in **value positions**. Using one in `SELECT`, `BIND(... AS ?x)`, `VALUES` or
`GROUP BY` fails with an explicit error naming the class and the variable.

**The spatial filter.** Mark the place with `FILTER(?__spatial__)` and put the patterns in
`spatial-pattern`. When the filter is on they are spliced in; when it is off the placeholder is
removed and nothing replaces it, so the unfiltered query goes out smaller rather than carrying a
world-sized bounding box — which for a SQL service is a different execution plan entirely. The
fragment inherits the host query's `PREFIX` declarations.

**Templates.** `<template id='row'>` renders a feed row and `<template id='detail'>` the card
opened by clicking it; both receive that row's bindings. Each class renders with its own template
scope, so partials defined under one class do not leak into another.

**The feed is padded** by half its height at both ends, so the row the timeline points at is
centred even when it is the first or the last — the alternative is a scroll that clamps at the end
of the list and quietly shows the wrong row in the middle.

**Time.** The timeline year is never a query input — the feed holds every dated entity and the year
only scrolls it, so panning is the only thing that refetches. Rows sit at constant spacing
regardless of how far apart their years are; rows away from the centre fade out. The binding is
one-way: scrolling the feed by hand never moves the timeline.

## 3D Tilesets on the Timeline

The 3D view (the cube button) can show 3D Tiles that appear, change and disappear as the timeline
moves. Declare them with one `<tileset-3d-source>` child of `<semantic-map-advanced>`; the map
reads it once, the first time the 3D view is opened.

### When it loads: `min-zoom` and the view

Nothing is fetched until the 3D view needs it, so opening 3D over a wide area stays light:

- Below `min-zoom` (the same zoom scale as the 2D map; in 3D it follows the camera) the source
  fetches nothing — no manifest, no query, no tileset — and hides whatever it loaded earlier.
  Without `min-zoom` it is read on the first switch to 3D, at any zoom.
- At or above it, the manifests are read and the temporal query runs, once. Each manifest then
  loads its tilesets only when its **extent** — the union of the footprints the query gives for
  its groups — comes into the frame, so with one manifest per area only the area being looked at
  is loaded. A manifest with no footprints loads on zoom alone.
- Within a manifest, the geometries the current year shows load first. The hidden ones are added
  once those are on screen (or after a few seconds), and then preload in the background, so moving
  along the timeline does not wait on the network.

Loaded tilesets stay in the scene for the life of the view; moving away only stops rendering them.

### The model

- An **item** is one loadable geometry: a `tileset.json` URL.
- A **group** is the thing whose appearance changes over time — an object, a building, a site.
  Each item belongs to one group.
- Each item has the **years it was observed in**. At year Y a group shows the item observed most
  recently, not after Y.

Items sharing an id are treated as **the same geometry**: it is loaded once and keeps all its
years. This is a contract the manifest producer must honour — the platform cannot compare bytes —
and it is what lets a manifest list a geometry once per year it was observed without the map
loading it again each time. When the listings differ, the URL of the earliest one is loaded.

### Manifests

One element covers any number of manifests: list them in `manifest-url` (comma-separated), or let
`manifest-query` return one `?url` per manifest — that is how a template enumerates manifests from
its own data. URLs may be host-relative (`/proxy/...`); a manifest that fails to load is skipped
and logged, the others still load.

The **normalised** shape needs no configuration:

```json
{ "items": [ { "id": "tower.v2", "group": "tower", "url": "tower/1900/tileset.json", "year": 1900 } ] }
```

`group` defaults to the id, relative URLs resolve against the manifest. Any **other** shape is read
through a field mapping:

| Attribute | Default | Meaning |
|-----------|---------|---------|
| `sections` | every top-level array | Which collections to read, comma-separated |
| `id-field` | `id` | The geometry id |
| `group-field` | `group` | The group; absent means the id itself |
| `year-field` | `year` | The year the geometry was observed |
| `url-field` | `url` | The tileset URL |
| `url-template` | — | Builds the URL from item fields, e.g. `{base}{path}/tileset.json` |
| `base-url` | — | Value of `{base}` in `url-template` |

### Existence over time: `temporal-query`

A manifest only knows when geometries were *observed*. When the application knows when objects
actually *existed*, `temporal-query` supplies it, and the group is shown only inside those
intervals:

| Binding | Required | Meaning |
|---------|----------|---------|
| `?identifier` | yes | A group id — or a descendant of one, see `identifier-separator` |
| `?start`, `?end` | no | Dates or years; unbound means open on that side |
| `?footprint` | no | WKT outline in `footprint-crs`, used for placeholders |
| `?tileset` | no | An item id to show for that interval, overriding the observed years |

At year Y, for each group:

1. If the query has intervals for the group and none contains Y, the group is **hidden**.
2. If the containing interval names a `?tileset` of that group, **that item** is shown.
3. Otherwise the item observed most recently, not after Y, is shown (`selection="snapshot"`;
   `exact` shows only an item observed in Y itself).
4. If the group exists but nothing has been observed yet, `before-first-observation` decides:
   `placeholder` draws the interval's `?footprint` as a ghost (below), `earliest` shows the earliest geometry,
   `none` (default) shows nothing.
5. A group with no intervals at all follows the manifest alone.
6. With time filtering off (`year-filtering="false"`), every group shows its latest geometry.
   Showing all of them would stack every version of an object in the same place.

`identifier-separator` matches hierarchical identifiers. With `.`, an identifier with no group of
exactly that id is given to the group named by its longest prefix ending before a `.`:
`site_4.2` goes to `site_4` — but if `site_4.2` is itself a group, it stays there. The exact id
always wins, so an application can model some sub-phases as groups of their own. Without the
attribute only exact ids match. Normalising identifiers beyond that is the query's job.

`unmatched-identifiers="placeholder"` also draws the footprints of intervals that match no
group at all — objects the application knows existed but that were never modelled in 3D — so the
3D view shows everything the 2D one does.

Placeholders are "ghosts" of the footprint: open walls with no roof, `placeholder-height` metres
tall (default 8), in `placeholder-color` at the ground (its alpha is the opacity there; default
`rgba(150, 160, 175, 0.5)`) fading upward to `placeholder-top-opacity` (default 0.15). The real
height is unknown, so they are drawn to read as a presence rather than as a volume. `footprint-crs`
(default `EPSG:4326`) is the CRS of the WKT. One placeholder is drawn per identifier, even if the
data lists overlapping intervals for it. They are cheap: a hundred cost a few milliseconds.

### Height

`height-offset` raises every tileset along the local vertical, in metres; `height-offset-field`
reads it from a top-level manifest field instead. The default is 0. A manifest may carry a geoid
correction, but apply it only if the rest of the scene shares that vertical datum: the 3D view has
no terrain and drapes its imagery on the ellipsoid at height 0, so a datum correction lifts the
models off the imagery they belong on.

### Example

```html
<semantic-map-advanced id="map" year-filtering="true" ...>
  <tileset-3d-source
      manifest-url="/proxy/models/site/manifest.json"
      sections="objects"
      id-field="code" group-field="object" year-field="surveyed"
      base-url="/proxy/models/" url-template="{base}{path}/tileset.json"
      identifier-separator="."
      before-first-observation="placeholder"
      min-zoom="15"
      footprint-crs="EPSG:3857"
      temporal-query="SELECT ?identifier ?start ?end ?footprint WHERE { ... }">
  </tileset-3d-source>
</semantic-map-advanced>
```

`cesium-asset-urls` still loads plain `tileset.json` URLs, always shown; it no longer expands
manifests, and `cesium-asset-temporal` is ignored.

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

## Sharing the map state (app-state and stories)

Inside an `<app-state>`, the map and its controls can keep their state in the URL, so that a view can be shared and replayed by a story (`rs-story`):

```html
<app-state id="map-state" auto-sync="true">
  <semantic-map-controls id="map-controls" target-map-id="map"
    shared-state-vars="year,syncWithTime,layers,styling,hiddenGroups,panel" ...></semantic-map-controls>
  <semantic-map-advanced id="map" target-controls='["map-controls"]'
    shared-state-vars="view,basemap,selected,mode3d" ...></semantic-map-advanced>
</app-state>
```

| Component | Variable | Value |
|---|---|---|
| map | `view` | `{center: [x, y], zoom, rotation}` in EPSG:3857 |
| map | `basemap` | identifier of the visible basemap |
| map | `selected` | IRI of the selected subject |
| map | `mode3d` | `{enabled: boolean}` |
| controls | `year` | timeline year |
| controls | `syncWithTime` | whether the year drives the historical maps |
| controls | `layers` | `{visible: [identifiers, top first], opacity: {identifier: value}}` |
| controls | `styling` | `{enabled, colorBy, labelBy, labelBackground, colors}`; `colors` lists the categories whose color differs from the palette, as rgba strings |
| controls | `hiddenGroups` | legend categories switched off |
| controls | `panel` | open sidebar panel |

The state is recorded after user actions only. A stored state is applied once the map has loaded its data; a stored view replaces the initial fit. While "Sync with time" is on, the dated historical maps follow the year, and `layers` records the visibility they return to when the sync is switched off. The swipe/spyglass tools and the sun position are not shared yet.
