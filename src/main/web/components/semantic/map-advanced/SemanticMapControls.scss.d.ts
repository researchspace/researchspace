declare namespace SemanticMapControlsScssNamespace {
  export interface ISemanticMapControlsScss {
    mapLayersFiltersContainer: string;
    mapLayersFilters: string;
    draggableLayer: string;
    draggableMaskLayer: string;
    timeSliderContainer: string;
    mapLayersTitle: string;
    mapControlsSeparator: string;
    layerTitle: string;
    layerLabel: string;
    layersContainer: string;
    featuresOptionsContainer: string;
    featuresOptionsTitle: string;
    mapOptionsSectionTitle: string;
    layerThumbnail: string;
    togglesColumn: string;
    togglesColumnLeft: string;
    togglesColumnRight: string;
    layerCheck: string;
    layerMaskIcon: string;
    visualizationModeRadio: string;
    toggle3dBtn: string;
    opacitySlider: string;
    featuresOptionsDiv: string;
    yearLabel: string;
    colorsLegend: string;
    filtersLabel: string;
    timelineSlider: string;
    
    // New styles for the sidebar and panels
    mapControlsContainer: string;
    mapControlsSidebar: string;
    mapControlsButton: string;
    mapControlsButtonActive: string;
    mapControlsPanel: string;
    mapControlsPanelHeader: string;
    mapControlsPanelTitle: string;
    mapControlsPanelCloseButton: string;
    mapControlsPanelCloseX: string;
    
    // Feature template styles
    featureTemplateContainer: string;
    featureTemplateCloseButton: string;
    
    // Measurement tool styles
    'ol-tooltip': string;
    'ol-tooltip-measure': string;
    'ol-tooltip-static': string;
    hidden: string;
  }
}

declare const SemanticMapControlsScssModule: SemanticMapControlsScssNamespace.ISemanticMapControlsScss;

export = SemanticMapControlsScssModule;
