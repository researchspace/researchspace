declare namespace SemanticMapControlsScssNamespace {
  export interface ISemanticMapControlsScss {
    // Geometry layers section
    geometryLayersSection: string;
    layersSectionTitle: string;
    geometryLayersList: string;
    geometryLayerItem: string;
    geometryLayerItemHidden: string;
    geometryLayerContent: string;
    geometryLayerName: string;
    geometryLayerControls: string;
    geometryLayerToggle: string;
    geometryLayerOpacity: string;
    geometryOpacitySlider: string;
    // Separator
    layersSectionSeparator: string;
    layersSectionSeparatorLine: string;
    layersSectionSeparatorText: string;
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
    
    // Styling panel toggle and options
    stylingToggleContainer: string;
    stylingToggleLabel: string;
    toggleSwitch: string;
    toggleSwitchOn: string;
    toggleSwitchHandle: string;
    stylingOptionsSection: string;
    stylingOptionGroup: string;
    stylingOptionTitle: string;
    labelBackgroundToggle: string;
    checkboxLabel: string;
    radioGroup: string;
    radioLabel: string;
    paletteControlsContainer: string;
    paletteButton: string;
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
  colorsLegendExternal: string;
  colorsLegendWithPanel: string;
  disabledColorGroup: string;
  colorPickerContainer: string;
  colorPickerFadeOut: string;
    filtersLabel: string;
    timelineSlider: string;
    
    // New styles for the sidebar and panels
    mapControlsContainer: string;
    mapControlsSidebar: string;
    mapControlsButton: string;
    mapControlsDivider: string;
    mapControlsButtonActive: string;
    mapControlsPanel: string;
    mapControlsPanelOpening: string;
    mapControlsPanelClosing: string;
    mapControlsPanelHeader: string;
    mapControlsPanelTitle: string;
    mapControlsPanelCloseButton: string;
    mapControlsPanelCloseX: string;
    
    // New styles for the draggable layer layout
    draggableLayerContainer: string;
    leftColumnContainer: string;
    layerContentContainer: string;
    thumbnailContainer: string;
    layerThumbnailStyle: string;
    layerInfoContainer: string;
    layerDateContainer: string;
    layerTitleContainer: string;
    togglesColumnRightStyle: string;
    opacitySliderContainer: string;
    opacitySliderLabel: string;
    
    // Additional utility classes
    cursorPointer: string;
    maskIconInactive: string;
    
    // Swipe button styles
    swipeButton: string;
    swipeButtonHidden: string;

    // Feature template styles
    featureTemplateContainer: string;
    featureTemplateCloseButton: string;
    
    // Default details container
    defaultDetailsContainer: string;
    
    // Visualization mode notification
    visualizationModeNotification: string;
    
    // Measurement tool styles
    'ol-tooltip': string;
    'ol-tooltip-measure': string;
    'ol-tooltip-static': string;
    hidden: string;
  }
}

declare const SemanticMapControlsScssModule: SemanticMapControlsScssNamespace.ISemanticMapControlsScss;

export = SemanticMapControlsScssModule;
