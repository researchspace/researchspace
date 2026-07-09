/**
 * ResearchSpace
 * Copyright (C) 2022-2024, © Kartography Community Interest Company
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

import * as React from 'react';
import {
  ClassAttributes,
  ReactElement,
  Children,
  cloneElement,
} from 'react';
import * as Kefir from 'kefir';
import { debounce, includes } from 'lodash';
import * as Reactodia from '@reactodia/workspace';
import { blockingDefaultLayout, colaRemoveOverlaps, layoutPadded } from '@reactodia/workspace/layout-sync';

import { BuiltInEvents, trigger, listen, registerEventSource, unregisterEventSource } from 'platform/api/events';
import { Cancellation, WrappingError } from 'platform/api/async';
import { Component } from 'platform/api/components';
import { Rdf, turtle } from 'platform/api/rdf';
import {
  constructUrlForResourceSync,
  navigateToResource,
  navigationConfirmation,
} from 'platform/api/navigation';
import { isSimpleClick } from 'platform/api/navigation/components/ResourceLink';

import * as Forms from 'platform/components/forms';
import { CreateResourceDialog } from 'platform/components/ldp';
import { addToDefaultSet } from 'platform/api/services/ldp-set';
import { getOverlaySystem } from 'platform/components/ui/overlay';
import { addNotification, ErrorNotification } from 'platform/components/ui/notification';
import { Spinner } from 'platform/components/ui/spinner';
import { TemplateItem } from 'platform/components/ui/template';
import { isValidChild, universalChildren } from 'platform/components/utils';
import { getPreferredUserLanguage, selectPreferredLabel } from 'platform/api/services/language';
import { ConfigHolder } from 'platform/api/services/config-holder';
import { getLabels } from 'platform/api/services/resource-label';
import { componentHasType } from 'platform/components/utils';

import * as DiagramService from './data/DiagramService';
import { GraphBuilder } from './data/GraphBuilder';
import { SupportedConfigName, RDF_DATA_PROVIDER_NAME, createDataProvider } from './data/OntodiaDataProvider';
import { getRdfGraphBySparqlQuery } from './data/RdfExt';

import { Toolbar } from './Toolbar';

import { EntityForm, EntityFormProps } from './authoring/EntityForm';
import { FieldBasedMetadataApi } from './authoring/FieldBasedMetadataApi';
import { FieldBasedValidationApi } from './authoring/FieldBasedValidationApi';
import { FieldConfiguration, isObjectProperty } from './authoring/FieldConfigurationCommon';
import {
  OntodiaFieldConfiguration,
  OntodiaFieldConfigurationProps,
  extractFieldConfiguration,
} from './authoring/OntodiaFieldConfiguration';
import { OntodiaPersistenceResult } from './authoring/OntodiaPersistence';
import {
  getEntityMetadata,
  convertCompositeValueToElementModel,
  convertElementModelToCompositeValue,
} from './authoring/OntodiaPersistenceCommon';
import { FormBasedPersistence, FormBasedPersistenceProps } from './authoring/FormBasedPersistence';

import * as OntodiaEvents from './OntodiaEvents';

import enTranslation from './translations/en.reactodia-translation.json';
import './Ontodia.scss';

export interface EdgeStyle {
  markerSource?: Reactodia.LinkMarkerStyle;
  markerTarget?: Reactodia.LinkMarkerStyle;
  linkStyle?: LinkStyle;
  editable?: boolean;
}

export interface LinkStyle {
  connection?: {
    fill?: string;
    stroke?: string;
    'stroke-width'?: number;
    'stroke-dasharray'?: string;
  };
  label?: LinkLabel;
  properties?: LinkLabel[];
}

export interface LinkLabel {
  position?: number;
  title?: string;
  attrs?: {
    rect?: {
      fill?: string;
      stroke?: string;
      'stroke-width'?: number;
    };
    text?: {
      fill?: string;
      stroke?: string;
      'stroke-width'?: number;
      'font-family'?: string;
      'font-size'?: string | number;
      'font-weight'?: 'normal' | 'bold' | 'lighter' | 'bolder' | number;
      text?: readonly Rdf.Literal[];
    };
  };
}

export interface OntodiaConfig {
  /**
   * Used as source id for emitted events.
   */
  id?: string;

  /**
   * Diagram identifier to display saved diagram.
   */
  diagram?: string;
  /**
   * SPARQL query to store data that do not exist in the database
   */
  provisionQuery?: string;
  /**
   * SPARQL query to display data on layout.
   * If property diagram is defined, this property will be ignored.
   */
  query?: string;
  /**
   * Iri to be used as a single diagram element
   * If property diagram or query is defined, this will be ignored.
   */
  iri?: string;
  /**
   * Elements to display on initialization
   */
  iris?: string[];

  /**
   * Controls if component should re-request all links from data provider when showing existing
   * graph (via loading the diagram or executing CONSTRUCT query), if link is not found in the
   * data, it is shown as dashed. Setting this to false speeds up initialization and the links on
   * the diagram will be shown exactly as they were when the diagram was saved.
   * @default true
   */
  requestLinksOnInit?: boolean;

  /**
   * Sparql SELECT query to get images of elements.
   *
   * Parametrized with `VALUES(?element) {...}` and should contains the following bindings:
   *  - `?element`: IRI of element on graph;
   *  - `?image`: image of the element.
   */
  imageQuery?: string;
  /**
   * Array of link types to get images of elements.
   * If property imageQuery is defined, this property will be ignored.
   */
  imageIris?: string[];
  /**
   * Configs are predefined configs for particular data sets.
   * Config specifies data provider to run and elements customizations to apply.
   * Later customizations could be brought to the level of component configuration if needed.
   * @default 'default'
   */
  settings?: SupportedConfigName;
  /**
   * Sparql data provider settings to override default settings.
   * See definition of `SparqlDataProviderSettings`.
   */
  providerSettings?: Reactodia.SparqlDataProviderSettings;
  /**
   * Additional turtle data that will be parsed and attached to the saved diagram.
   */
  metadata?: string;
  /**
   * URI to navigate after diagram created.
   * Newly created diagram IRI will be appended as `diagram` query parameter.
   */
  navigateTo?: string;
  /**
   * Query parameters that will be appended to URL after diagram created.
   */
  queryParams?: { [key: string]: string };
  /**
   * When true saving the diagram is disabled and side panels are collapsed by default.
   */
  readonly?: boolean;

  /**
   * `true` if persisted component should be added to the default set of the current user
   *
   * @default false
   */
  addToDefaultSet?: boolean;

  /**
   * Custom templates of the elements
   */
  nodeTemplates?: { [type: string]: string };

  /**
   * Default custom template of the elements
   */
  defaultNodeTemplate?: string;

  /**
   * Custom images and colors of the elements
   */
  nodeStyles?: { [type: string]: { image: string; color: string } };

  /**
   * Custom styles of the links
   */
  edgeStyles?: { [linkTypeId: string]: EdgeStyle };

  /**
   * Default custom style of the links
   */
  defaultEdgeStyle?: EdgeStyle;

  /**
   * Links to group the nodes
   */
  groupBy?: { linkType: string; linkDirection: 'in' | 'out' }[];

  /**
   * Ids of repositories
   */
  repositories?: string[];

  /**
   * Custom options for the links
   */
  linkSettings?: ReadonlyArray<{
    property: string;
    visible: boolean;
    showLabel?: boolean;
  }>;

  /**
   * Disable side panels
   */
  hidePanels?: boolean;

  /**
   * Disable navigator panel
   */
  hideNavigator?: boolean;

  /**
   * Collapse navigator panel by default
   */
  collapseNavigator?: boolean;

  /**
   * Disable toolbar
   */
  hideToolbar?: boolean;

  /**
   * Set if zoom operation need ctrl or not
   */
  zoomRequireCtrl?: boolean;

  /**
   * Disable scrollbars
   */
  hideScrollBars?: boolean;

  /**
   * If true zoomToFit to call on each addElements event.
   */
  autoZoom?: boolean;

  /**
   * Disable navigation
   */
  hideHalo?: boolean;

  /**
   * Sparql query to get suggested properties of elements.
   */
  propertySuggestionQuery?: string;

  /**
   * Allow blank nodes in navigation queries. Significantly increases complexity of the queries
   * and may lead to unexpected query execution plans and timeouts in triple stores.
   *
   * @default false
   */
  acceptBlankNodes?: boolean;

  /**
   * Custom label for "Save diagram" button.
   */
  saveDiagramLabel?: string;

  /**
   * Custom label for "Save data" button.
   */
  persistChangesLabel?: string;

  /**
   * Sparql query to find a relationship between two elements.
   */
  findRelationshipQuery?: string;

  /**
   * Disable navigation confirmation dialog, resource links will be followed without confirmation.
   */
  hideNavigationConfirmation?: boolean;

  /**
   * Controls whether Ontodia should navigate to a newly saved diagram.
   */
  postSaving?: 'navigate' | 'none';

  /*
   * If true left panel is initially open.
   */
  leftPanelInitiallyOpen?: boolean;

  /*
   * If true right panel is initially open.
   */
  rightPanelInitiallyOpen?: boolean;
}

export type OntodiaPersistenceMode = FormBasedPersistenceProps;

export interface OntodiaProps extends OntodiaConfig, ClassAttributes<Ontodia> {
  onLoadWorkspace?: (workspace: Reactodia.Workspace) => void;
}

interface State {
  readonly label?: string;
  readonly fieldConfiguration?: FieldConfiguration;
  readonly configurationError?: any;
  readonly diagramIri?: string;
  readonly loading: boolean;
}

const DEBOUNCE_DELAY = 300;
const CUSTOM_LABEL = Reactodia.TemplateState.property('ontodia:customLabel').of<string>();

/**
 * This component will render Ontodia diagram,
 * load and save it from VocabPlatform.OntodiaDiagramContainer.
 * This component _MUST_ be wrapped in HTML element with defined height.
 *
 * Ontodia will listen to `SemanticContext` and will load and save diagram layouts into specified
 * repository. Hovewer, Data will always be loaded from default repository.
 *
 * @example
 * Display component with empty canvas:
 * ```
 * <ontodia></ontodia>
 * ```
 *
 * Load diagram from resource and display it:
 * ```
 * <ontodia diagram=[[this]]></ontodia>
 * ```
 *
 * Display diagram with result elements and links created by construct query:
 * ```
 * <ontodia
 *   query='
 *     CONSTRUCT { <[[this.value]]> ?p ?o }
 *     WHERE {
 *       <[[this.value]]> ?p ?o
 *       FILTER (ISIRI(?o))
 *     } LIMIT 50
 * '></ontodia>
 * ```
 *
 * Display diagram with only one element to start with
 * ```
 * <ontodia iri="http://www.cidoc-crm.org/cidoc-crm/E22_Human-Made_Object"></ontodia>
 * ```
 *
 * Specify a property to display image for elements:
 * ```
 * <ontodia
 * query='
 *   CONSTRUCT {
 *     ?inst ?propType1 ?propValue1.
 *   } WHERE {
 *     BIND (<http://www.cidoc-crm.org/cidoc-crm/E22_Human-Made_Object> as ?inst)
 *     OPTIONAL {?propValue1 ?propType1 ?inst.  FILTER(isURI(?propValue1)). }
 *   } LIMIT 100
 * ' image-iris='["http://collection.britishmuseum.org/id/ontology/PX_has_main_representation"]'>
 * </ontodia>
 * ```
 *
 * Specifying a query to resolve image URLs:
 * ```
 * <ontodia
 * query='
 *   CONSTRUCT {
 *     ?inst ?propType1 ?propValue1.
 *   } WHERE {
 *     BIND (<http://www.cidoc-crm.org/cidoc-crm/E22_Human-Made_Object> as ?inst)
 *     OPTIONAL {?propValue1 ?propType1 ?inst.  FILTER(isURI(?propValue1)). }
 *   } LIMIT 100
 * '
 * image-query='
 *   SELECT ?element ?image {
 *     ?element <http://collection.britishmuseum.org/id/ontology/PX_has_main_representation> ?image
 *   }
 * '
 * ></ontodia>
 * ```
 *
 * Using 'setting' property to apply combination of data provider and elements customization
 * ```
 * <ontodia image-query='
 *   PREFIX wdt: <http://www.wikidata.org/prop/direct/>
 *   SELECT ?element ?image {
 *     ?element wdt:P18|wdt:P41|wdt:P154 ?img.
 *     BIND(CONCAT(
 *       "https://commons.wikimedia.org/w/thumb.php?f=",
 *       STRAFTER(STR(?img), "Special:FilePath/"),
 *       "&w=200"
 *     ) as ?image)
 *   }' settings='wikidata'>
 * </ontodia>
 * ```
 */
export class Ontodia extends Component<OntodiaProps, State> {
  static defaultProps: Partial<OntodiaProps> = {
    navigateTo: 'http://www.researchspace.org/resource/assets/OntodiaView',
    queryParams: {},
    addToDefaultSet: false,
    nodeTemplates: {},
    edgeStyles: {},
    // disable blank nodes support to prevent too complex queries to be generated by default
    acceptBlankNodes: false,
    postSaving: 'navigate',
  };

  private readonly cancellation = new Cancellation();
  private readonly listener = new Reactodia.EventObserver();

  private metadataApi: FieldBasedMetadataApi;
  private validationApi: FieldBasedValidationApi;
  private parsedMetadata: Kefir.Property<ReadonlyArray<Rdf.Triple>>;
  private readonly renameLinkProvider: Reactodia.RenameLinkProvider;
  private readonly dialogSettingsProvider: Reactodia.DialogSettingsProvider;

  workspace: Reactodia.Workspace;
  private dataProvider: Reactodia.SparqlDataProvider | Reactodia.CompositeDataProvider;
  private nodeTemplates: { [type: string]: Reactodia.ElementTemplate } = {};
  private defaultNodeTemplate: Reactodia.ElementTemplate;

  private navigationListenerUnsubscribe?: () => void;

  constructor(props: OntodiaProps, context: any) {
    super(props, context);

    this.renameLinkProvider = {
      canRename: (link) => {
        const { edgeStyles, defaultEdgeStyle } = this.props;
        const template = edgeStyles[link.typeId] || defaultEdgeStyle;
        return Boolean(template && template.editable);
      },
      getLabel: (link) => {
          const {linkState} = link;
          return linkState.get(CUSTOM_LABEL);
      },
      setLabel: (link, label) => {
        link.setLinkState(link.linkState.set(
          CUSTOM_LABEL,
          label.length === 0 ? undefined : label
        ));
      }
    };

    this.dialogSettingsProvider = new PlatformDialogSettingsProvider();

    this.state = {
      diagramIri: props.diagram,
      loading: true,
    };
  }

  componentDidUpdate(prevProps: OntodiaProps) {
    const { diagram } = this.props;
    if (diagram !== prevProps.diagram) {
      this.setState({ diagramIri: diagram });
    }
  }

  private async loadFieldConfiguration(ct: AbortSignal) {
    const fieldConfigElement = Children.toArray(this.props.children).find((child) =>
      componentHasType(child, OntodiaFieldConfiguration)
    ) as ReactElement<OntodiaFieldConfigurationProps>;

    let fieldConfiguration: FieldConfiguration | undefined;
    let configurationError: unknown;
    try {
      fieldConfiguration = await extractFieldConfiguration(
        fieldConfigElement ? fieldConfigElement.props : undefined,
        ct
      );
    } catch (err) {
      // err also could be a CancellationError
      configurationError = err;
    }

    if (!ct.aborted) {
      if (fieldConfiguration) {
        if (fieldConfiguration.authoringMode) {
          this.metadataApi = new FieldBasedMetadataApi(fieldConfiguration.metadata);
          this.validationApi = new FieldBasedValidationApi(
            fieldConfiguration.metadata,
            fieldConfiguration.enforceConstraints
          );
        }
        this.setState({ fieldConfiguration });
      } else {
        this.setState({ configurationError });
      }
    }
  }

  render() {
    if (this.state.configurationError) {
      return <ErrorNotification errorMessage={this.state.configurationError} />;
    } else if (this.state.loading) {
      return <Spinner />;
    }

    const preferredLanguage = getPreferredUserLanguage();
    const globalLanguages = ConfigHolder.getUIConfig().preferredLanguages.map((lang) => {
      return { code: lang, label: lang };
    });
    const languages = globalLanguages.length > 0
      ? globalLanguages
      : [{ code: preferredLanguage, label: preferredLanguage }];

    const {
      autoZoom,
      readonly,
      // TODO: `groupBy` is deprecated and removed from Reactodia
      groupBy,
      hidePanels,
      hideNavigator,
      collapseNavigator,
      hideToolbar,
      hideHalo,
      hideScrollBars = true,
      saveDiagramLabel,
      persistChangesLabel,
      propertySuggestionQuery,
      zoomRequireCtrl = true,
      nodeStyles,
      leftPanelInitiallyOpen,
      rightPanelInitiallyOpen,
    } = this.props;
    const { fieldConfiguration } = this.state;
    return (
      <Reactodia.Workspace
        ref={this.initWorkspace}
        defaultLayout={blockingDefaultLayout}
        typeStyleResolver={nodeStyles ? this.resolveNodeStyles : undefined}
        metadataProvider={this.metadataApi}
        validationProvider={this.validationApi}
        renameLinkProvider={this.renameLinkProvider}
        dialogSettingsProvider={this.dialogSettingsProvider}
        defaultLanguage={preferredLanguage}
        selectLabelLanguage={selectLabelLanguage}
        // TODO: fix typings
        translations={[enTranslation as {} as Record<string, Record<string, string>>]}
        onWorkspaceEvent={key => {
          if (key === Reactodia.WorkspaceEventKey.editorAddElements) {
            if (autoZoom) {
              const {view} = this.workspace.getContext();
              const canvas = view.findAnyCanvas();
              canvas.zoomToFit();
            }
          }
        }}>
        <Reactodia.ClassicWorkspace
          colorScheme='light'
          leftColumn={hidePanels ? null : {defaultCollapsed: !(readonly ? false : leftPanelInitiallyOpen)}}
          rightColumn={hidePanels ? null : {defaultCollapsed: !(readonly ? false : rightPanelInitiallyOpen)}}
          canvas={{
            elementTemplateResolver: this.resolveElementTemplate,
            linkTemplateResolver: this.resolveLinkTemplate,
            showScrollbars: !hideScrollBars,
            zoomOptions: {
              min: 0.002,
              maxFit: 1,
              requireCtrl: zoomRequireCtrl,
            },
          }}
          toolbar={null}
          classTree={{
            draggableItems: false,
            placeCreatedEntity: this.placeCreatedEntity,
          }}
          connectionsMenu={{
            suggestProperties: propertySuggestionQuery ? this.suggestProperties : undefined,
          }}
          halo={hideHalo ? null : {
            children: (
              <>
                <Reactodia.SelectionActionGroup dock='nw' dockColumn={1} />
                <Reactodia.SelectionActionRemove dock='ne' />
                <Reactodia.SelectionActionExpand dock='s' />
                <Reactodia.SelectionActionAnchor dock='w' />
                <Reactodia.SelectionActionConnections dock='e' />
                <Reactodia.SelectionActionAddToFilter dock='se' />
                <Reactodia.SelectionActionAnnotate dock='se' dockColumn={1} />
                <Reactodia.SelectionActionEstablishLink dock='se' />
              </>
            )
          }}
          navigator={hideNavigator ? null : {
            expanded: collapseNavigator ? false : 'auto',
          }}
          visualAuthoring={{
            propertyEditor: this.renderPropertyEditor,
          }}
          zoomControl={null}>
          {hideToolbar ? null : (
            <Toolbar key='rs-toolbar'
              languages={languages}
              saveDiagramLabel={saveDiagramLabel}
              persistChangesLabel={persistChangesLabel}
              getWorkspace={this.getWorkspace}
              onSaveDiagram={readonly ? undefined : this.onSaveDiagramPressed}
              onSaveDiagramAs={() => this.openSaveModal()}
              onPersistChanges={
                fieldConfiguration.authoringMode ? this.onPersistAuthoredChanges : undefined
              }
              onPersistChangesAndSaveDiagram={() => this.onPersistChangesAndSaveDiagram()}
              validationProvider={this.validationApi}
              diagramIri={this.state.diagramIri}
              dropdownTemplate={this.getTemplate('{{> knowledge-map-dropdown}}')}
            />
          )}
        </Reactodia.ClassicWorkspace>
      </Reactodia.Workspace>
    );
  }

  componentDidMount() {
    this.loadFieldConfiguration(this.cancellation.signal).then(() =>
      this.setState({ loading: false })
    );

    this.parsedMetadata = this.parseMetadata();
    this.prepareElementTemplates();

    this.registerEventSources();
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
    this.listener.stopListening();
    if (this.navigationListenerUnsubscribe) {
      this.navigationListenerUnsubscribe();
    }

    this.unregisterEventSources();
  }

  private registerEventSources() {
    const { id } = this.props;
    registerEventSource({
      source: id,
      eventType: OntodiaEvents.DiagramChanged,
    });
    registerEventSource({
      source: id,
      eventType: OntodiaEvents.DiagramIsDirty,
    });
  }

  private unregisterEventSources() {
    const { id } = this.props;
    unregisterEventSource({
      source: id,
      eventType: OntodiaEvents.DiagramChanged,
    });
    unregisterEventSource({
      source: id,
      eventType: OntodiaEvents.DiagramIsDirty,
    });
  }

  private getWorkspace = () => this.workspace;

  private getRepositories = (): string[] => {
    const { repository = 'default' } = this.context.semanticContext;
    const { repositories = [repository] } = this.props;

    return repositories;
  };

  private prepareImages = (
    elementsInfo: Iterable<Reactodia.ElementModel>
  ): Promise<Map<Reactodia.ElementIri, string>> => {
    const { imageQuery, imageIris } = this.props;

    if (!imageQuery && !imageIris) {
      return DiagramService.fetchThumbnails(elementsInfo, this.context.semanticContext);
    } else if (imageQuery) {
      return DiagramService.prepareImages(elementsInfo, imageQuery);
    }
  };

  private prepareLabels = (resources: Set<string>): Promise<Map<string, Rdf.Literal[]>> => {
    const iris = Array.from(resources, Rdf.iri);
    const context = this.context.semanticContext;
    return getLabels(iris, { context })
      .map((labels) => {
        const result = new Map<string, Rdf.Literal[]>();
        labels.forEach((label, iri) => {
          const literal = Rdf.literal(label);
          result.set(iri.value, [literal]);
        });
        return result;
      })
      .toPromise();
  };

  /**
   * Initializes workspace
   */
  private initWorkspace = (workspace: Reactodia.Workspace) => {
    if (workspace) {
      const {
        onLoadWorkspace,
        imageIris,
        provisionQuery,
        acceptBlankNodes,
        settings: configName,
        hideNavigationConfirmation,
        imageQuery,
      } = this.props;
      const { fieldConfiguration } = this.state;

      if (fieldConfiguration) {
        const { editor } = workspace.getContext();
        editor.setAuthoringMode(fieldConfiguration.authoringMode);
      }

      this.workspace = workspace;
      if (onLoadWorkspace) {
        onLoadWorkspace(workspace);
      }

      // if there is no imageIris or only imageQuery is provided then
      // then we resolve thumbnail through the platform thumbnail service, otherwise
      // we use default thumbnail resolution mechanism from ontodia
      const prepareImages = (!imageIris && !imageQuery) || imageQuery ? this.prepareImages : undefined;
      const options: Reactodia.SparqlDataProviderOptions = {
        endpointUrl: '',
        prepareImages: prepareImages,
        prepareLabels: this.prepareLabels,
        imagePropertyUris: imageIris,
        queryMethod: 'POST',
        // TODO: `acceptBlankNodes` is not really needed? 
        // acceptBlankNodes: acceptBlankNodes,
      };
      const repositories = this.getRepositories();
      this.dataProvider = createDataProvider({
        configName,
        options,
        repositories,
        createRDFStorage: provisionQuery !== undefined,
        fields: fieldConfiguration.allFields,
        settings: this.props.providerSettings,
        forceFields: fieldConfiguration.datatypeFields,
      });
      if (this.validationApi) {
        this.validationApi.setDataProvider(this.dataProvider);
      }

      this.importLayout();

      if (!hideNavigationConfirmation) {
        this.registerNavigationConfirmation();
      }

      this.subscribeOnEvents();
      if (fieldConfiguration.authoringMode) {
        this.subscribeOnAuthoringEvents();
      }
    }
  };

  private subscribeOnEvents() {
    const { id } = this.props;
    const { model, editor, view } = this.workspace.getContext();

    const triggerEvent = debounce(() => {
      trigger({
        source: id,
        eventType: OntodiaEvents.DiagramChanged,
        data: {
          model: model,
          authoringState: editor.authoringState,
          temporaryState: editor.temporaryState,
        },
      });
    }, DEBOUNCE_DELAY);

    this.listener.listen(model.events, 'changeCells', triggerEvent);
    this.listener.listen(model.events, 'elementEvent', ({data}) => {
      const extended = data as Partial<Reactodia.EntityElementEvents>;
      if (extended.changeData) {
        triggerEvent();
      }
    });
    this.listener.listen(editor.events, 'changeAuthoringState', triggerEvent);
    this.listener.listen(editor.events, 'changeTemporaryState', triggerEvent);

    this.cancellation
      .map(
        listen({
          eventType: OntodiaEvents.FocusOnElement,
          target: id,
        })
      )
      .observe({
        value: ({ data }) => {
          if (data.iri) {
            const element = model.elements.find(el =>
              el instanceof Reactodia.EntityElement && el.iri === data.iri ||
              el instanceof Reactodia.EntityGroup && el.itemIris.has(data.iri)
            );
            if (element) {
              const canvas = view.findAnyCanvas()!;
              const box = Reactodia.boundsOf(element, canvas.renderingState);
              canvas.zoomToFitRect(box);
              model.setSelection([element]);
            }
          } else if (data.iris) {
            const elements = model.elements.filter(el =>
              el instanceof Reactodia.EntityElement && includes(data.iris, el.iri) ||
              el instanceof Reactodia.EntityGroup && el.items.some(item => includes(data.iris, item.data.id))
            );
            if (elements.length !== 0) {
              const canvas = view.findAnyCanvas()!;
              const box = Reactodia.getContentFittingBox(elements, [], canvas.renderingState);
              canvas.zoomToFitRect(box);
              model.setSelection(elements);
            }
          }
        },
      });

    this.cancellation
      .map(
        listen({
          eventType: OntodiaEvents.HighlightElements,
          target: id,
        })
      )
      .observe({
        value: ({ data }) => {
          const  {view } = this.workspace.getContext();
          let highlighter: Reactodia.CellHighlighter;
          if (data.iris) {
            const highlightedElements = new Set<string>();
            data.iris.forEach((iri) => highlightedElements.add(iri));
            highlighter = (item) => {
              if (item instanceof Reactodia.EntityElement) {
                return highlightedElements.has(item.iri);
              }
              if (item instanceof Reactodia.RelationLink) {
                const { sourceId, targetId } = item.data;
                return highlightedElements.has(sourceId) || highlightedElements.has(targetId);
              }
              throw Error('Unknown item type');
            };
          }
          view.setHighlighter(highlighter);
        },
      });
  }

  private subscribeOnAuthoringEvents() {
    const { id } = this.props;
    const { model, editor } = this.workspace.getContext();
    this.cancellation
      .map(
        listen({
          eventType: OntodiaEvents.CreateElement,
          target: id,
        })
      )
      .map((event): typeof event.data & { elementModel: Reactodia.ElementModel } => {
        const elementData = event.data.elementData as Reactodia.ElementModel;
        return {
          ...event.data,
          elementModel: {
            ...elementData,
            id: this.metadataApi.generateIriForModel(elementData),
          },
        };
      })
      .observe({
        value: ({ elementModel, targets }) => {
          const element = editor.createEntity(elementModel as Reactodia.ElementModel);
          targets.forEach(({ targetIri, linkTypeId }) => {
            const target = model.elements.find((el): el is Reactodia.EntityElement =>
              el instanceof Reactodia.EntityElement && el.iri === targetIri
            );
            if (target) {
              const linkModel: Reactodia.LinkModel = {
                linkTypeId: linkTypeId,
                sourceId: element.iri,
                targetId: target.iri,
                properties: {},
              };
              const link = new Reactodia.RelationLink({
                sourceId: element.id,
                targetId: target.id,
                data: linkModel,
              });
              editor.createRelation(link);
            }
          });
          const { view } = this.workspace.getContext();
          const canvas = view.findAnyCanvas();
          if (canvas) {
            const viewport = canvas.metrics.pane;
            element.setPosition(canvas.metrics.clientToPaperCoords(
              viewport.clientWidth / 2,
              viewport.clientHeight / 2
            ));
            canvas.renderingState.syncUpdate();
          }
          this.placeCreatedEntity(element);
        },
      });

    this.cancellation
      .map(
        listen({
          eventType: OntodiaEvents.EditElement,
          target: id,
        })
      )
      .observe({
        value: (event) => {
          const { targetIri, elementData } = event.data;
          editor.changeEntity(targetIri, elementData as Reactodia.ElementModel);
        },
      });

    this.cancellation
      .map(
        listen({
          eventType: OntodiaEvents.DeleteElement,
          target: id,
        })
      )
      .observe({
        value: (event) => {
          editor.deleteEntity(event.data.iri);
        },
      });
  }

  private importLayout() {
    const layoutImporting = Kefir.combine([Kefir.fromPromise(this.setLayout()), this.parsedMetadata]);
    this.cancellation.map(layoutImporting).observe({
      error: (configurationError) => this.setState({ configurationError }),
      end: () => {
        if (this.props.id) {
          trigger({ eventType: BuiltInEvents.ComponentLoaded, source: this.props.id });
        }
      },
    });
    if (this.props.id) {
      trigger({
        eventType: BuiltInEvents.ComponentLoading,
        source: this.props.id,
        data: layoutImporting.toProperty(),
      });
    }
  }

  private registerNavigationConfirmation() {
    const { model } = this.workspace.getContext();
    this.listener.listen(model.history.events, 'historyChanged', ({ hasChanges }) => {
      if (hasChanges && this.props.id) {
        trigger({
          eventType: OntodiaEvents.DiagramIsDirty,
          source: this.props.id,
          data: { hasChanges },
        });
      }
      if (hasChanges && !this.navigationListenerUnsubscribe) {
        const message = 'Changes you made to the map will not be saved.';
        this.navigationListenerUnsubscribe = navigationConfirmation(message);
      } else if (!hasChanges && this.navigationListenerUnsubscribe) {
        this.navigationListenerUnsubscribe();
        this.navigationListenerUnsubscribe = undefined;
      }
    });
  }

  private parseMetadata(): Kefir.Property<ReadonlyArray<Rdf.Triple>> {
    const { metadata } = this.props;
    if (metadata) {
      return this.cancellation.map(
        turtle.deserialize
          .turtleToTriples(this.props.metadata)
          .mapErrors((error) => new WrappingError(`Invalid metadata format`, error))
      );
    } else {
      return Kefir.constant([]);
    }
  }

  private onSaveDiagramPressed = () => {
    const { model } = this.workspace.getContext();
    const { diagramIri } = this.state;
    if (diagramIri) {
      const layout = model.exportLayout();
      const { label } = this.state;
      this.cancellation
        .map(
          this.parsedMetadata
            .flatMap((metadata) => DiagramService.updateDiagram(diagramIri, layout, label, metadata))
            .map((results) => {
              trigger({
                eventType: OntodiaEvents.DiagramSaved,
                source: this.props.id,
                data: { resourceIri: this.state.diagramIri },
              });
              trigger({
                eventType: 'Dashboard.ResourceChanged',
                source: this.props.id,
                data: { resourceIri: this.state.diagramIri },
              });
              trigger({
                eventType: OntodiaEvents.DiagramIsDirty,
                source: this.props.id,
                data: { hasChanges: false },
              });
              return results;
            })
        )
        .observe({
          value: () => {
            model.history.reset();
            addNotification({
              level: 'success',
              message: `Saved map ${label}`,
            });
          },
          error: (error) =>
            addNotification(
              {
                level: 'error',
                message: `Error saving map ${label}`,
              },
              error
            ),
        });
    } else {
      this.openSaveModal();
    }
  };

  private onPersistAuthoredChanges = () => {
    const { overlay } = this.workspace.getContext();
    overlay.showSpinnerWhile(this.persistAuthoredChanges());
  };

  private onPersistChangesAndSaveDiagram() {
    const { overlay } = this.workspace.getContext();
    overlay.showSpinnerWhile(this.persistAuthoredChanges().then(() => this.onSaveDiagramPressed()));
  }

  private persistAuthoredChanges(): Promise<void> {
    const { model, editor } = this.workspace.getContext();
    const { fieldConfiguration } = this.state;
    const persistence = makePersistenceFromConfig(fieldConfiguration.persistence);

    const existingModels = new Map<Reactodia.ElementIri, Reactodia.ElementModel>();
    model.elements.forEach((element) => {
      if (element instanceof Reactodia.EntityElement) {
        existingModels.set(element.iri, element.data);
      } else if (element instanceof Reactodia.EntityGroup) {
        for (const item of element.items) {
          existingModels.set(item.data.id, item.data);
        }
      }
    });

    const fetchModel = (iri: Reactodia.ElementIri): Kefir.Property<Reactodia.ElementModel> => {
      if (existingModels.has(iri)) {
        return Kefir.constant(existingModels.get(iri));
      }
      return Kefir.fromPromise(
        model.dataProvider.elements({ elementIds: [iri] }).then((result) => result.get(iri))
      ).toProperty();
    };

    return persistence
      .persist({
        entityMetadata: fieldConfiguration.metadata,
        state: editor.authoringState,
        fetchModel,
      })
      .map(this.onChangesPersisted)
      .toPromise();
  }

  private onChangesPersisted = (result: OntodiaPersistenceResult) => {
    const { model, editor, view } = this.workspace.getContext();

    for (const element of [...model.elements]) {
      if (!(element instanceof Reactodia.EntityElement)) {
        continue;
      }
      const changed = result.finalizedEntities.get(element.iri);
      if (changed) {
        element.setData(changed);
      } else if (changed === null) {
        model.removeElement(element.id);
      }
    }
    
    const changedResourcesIris = model.elements
      .filter((el): el is Reactodia.EntityElement => el instanceof Reactodia.EntityElement)
      .map(el => el.data.id);
    for (const link of [...model.links]) {
      if (!(link instanceof Reactodia.RelationLink)) {
        continue;
      }
      const event = editor.authoringState.links.get(link.data);
      if (event?.type === 'relationDelete') {
        model.removeLink(link.id);
      }
    }

    editor.setAuthoringState(Reactodia.AuthoringState.empty);
    model.setSelection([]);
    model.history.reset();

    view.findAnyCanvas()?.zoomToFit();
    trigger({
      source: this.props.id,
      eventType: OntodiaEvents.DiagramDataPersisted,
      data: {
        iris: changedResourcesIris
      },
    });

    trigger({
      source: this.props.id,
      eventType: OntodiaEvents.DiagramChanged,
      data: {
        model: model,
        authoringState: editor.authoringState,
        temporaryState: editor.temporaryState,
      },
    });
  };

  /**
   * Set diagram layout
   */
  private setLayout(): Promise<void> {
    return this.importProvisionData()
      .then(() => {
        const { query, iri, linkSettings, iris } = this.props;
        const { diagramIri } = this.state;
        let linkOptions = linkSettings as ReadonlyArray<Reactodia.SerializedLinkOptions>;

        if (diagramIri) {
          return this.setLayoutByDiagram(diagramIri);
        } else if (query) {
          return this.setLayoutBySparqlQuery(query, linkOptions);
        } else if (iri) {
          return this.setLayoutByIri(iri, linkOptions);
        } else if (iris) {
          return this.setLayoutByIris(iris, linkOptions);
        } else {
          return this.importModelLayout({
            diagram: {
              '@context': Reactodia.DiagramContextV1,
              '@type': 'Diagram',
              layoutData: {
                '@type': 'Layout',
                elements: [],
                links: [],
              },
              linkTypeOptions: linkOptions,
            }
          });
        }
      })
      .then(() => {
        const { model } = this.workspace.getContext();
        model.history.reset();
      });
  }

  /**
   * Sets diagram layout by sparql query
   */
  private setLayoutBySparqlQuery(
    query: string,
    linkSettings: ReadonlyArray<Reactodia.SerializedLinkOptions>
  ): Promise<void> {
    const { overlay, performLayout } = this.workspace.getContext();
    const repositories = this.getRepositories();
    const loadingLayout = getRdfGraphBySparqlQuery(query, repositories).then((graph) => {
      const layoutProvider = new GraphBuilder(this.dataProvider, linkSettings);
      return layoutProvider.getGraphFromRDFGraph(graph);
    });
    overlay.showSpinnerWhile(loadingLayout);

    return loadingLayout
      .then((res) =>
        this.importModelLayout({
          preloadedElements: res.preloadedElements,
          diagram: res.diagram,
        })
      )
      // wait for the layout so that its history batch is stored before
      // the caller resets the command history
      .then(() => performLayout({}));
  }

  private importProvisionData = (): Promise<void> => {
    const { provisionQuery } = this.props;

    if (!provisionQuery) {
      return Promise.resolve();
    }

    const repositories = this.getRepositories();

    return getRdfGraphBySparqlQuery(provisionQuery, repositories).then((graph) =>
      this.addGraphToRDFDataProvider(graph)
    );
  };

  private addGraphToRDFDataProvider = (graph: Rdf.Triple[]) => {
    const dataProviders = (this.dataProvider as Reactodia.CompositeDataProvider).providers;
    let rdfDataProvider: Reactodia.RdfDataProvider;

    for (const { name, provider } of dataProviders) {
      if (name !== RDF_DATA_PROVIDER_NAME) {
        continue;
      }

      rdfDataProvider = provider as Reactodia.RdfDataProvider;
    }

    if (rdfDataProvider) {
      rdfDataProvider.addGraph(graph);
    }
  };

  /**
   * Sets diagram layout by diagram id
   */
  private setLayoutByDiagram(diagram: string): Promise<void> {
    const { view, overlay } = this.workspace.getContext();
    const loadingLayout = DiagramService.getDiagramByIri(diagram, { repository: 'assets' });
    overlay.showSpinnerWhile(loadingLayout);

    return loadingLayout
      .then((res) => {
        this.setState({ label: res.label });
        return this.importModelLayout({
          diagram: res.diagram,
        });
      })
      .then(() => {
        const canvas = view.findAnyCanvas();
        canvas?.zoomToFit();
      });
  }

  private setLayoutByIri(
    iri: string,
    linkSettings: ReadonlyArray<Reactodia.SerializedLinkOptions>
  ): Promise<void> {
    return this.setLayoutByIris([iri], linkSettings).then(() => {
      const { model, view, getCommandBus } = this.workspace.getContext();
      const element = model.elements.find((el) =>
        el instanceof Reactodia.EntityElement && el.data.id === iri
      );
      if (element) {
        const canvas = view.findAnyCanvas();
        const bounds = Reactodia.boundsOf(element, canvas.renderingState);
        // shift canvas to the right to encompass newly opened connections menu
        canvas.centerTo({
          x: bounds.x + bounds.width / 2 + 500,
          y: bounds.y + bounds.height / 2,
        });
        getCommandBus(Reactodia.ConnectionsMenuTopic)
          .trigger('show', {
            targets: [element],
          });
      }
    });
  }
  private setLayoutByIris(
    iris: string[],
    linkSettings: ReadonlyArray<Reactodia.SerializedLinkOptions>
  ): Promise<void> {
    const { overlay, performLayout } = this.workspace.getContext();
    const layoutProvider = new GraphBuilder(this.dataProvider, linkSettings);
    const buildingGraph = layoutProvider.createGraph({
      elementIds: iris.map((iri) => iri as Reactodia.ElementIri),
      links: [],
    });
    overlay.showSpinnerWhile(buildingGraph);

    return buildingGraph.then((res) =>
      this.importModelLayout({
        preloadedElements: res.preloadedElements,
        diagram: {
          ...res.diagram,
          linkTypeOptions: linkSettings,
        },
      })
        // wait for the layout so that its history batch is stored before
        // the caller resets the command history
        .then(() => performLayout({}))
    );
  }

  /**
   * Imports layout to diagram model
   */
  private importModelLayout = (layout?: {
    preloadedElements?: ReadonlyMap<Reactodia.ElementIri, Reactodia.ElementModel>;
    diagram?: Reactodia.SerializedDiagram;
  }): Promise<void> => {
    const { model, translation } = this.workspace.getContext();
    const validateLinks = this.props.requestLinksOnInit === undefined ? true : this.props.requestLinksOnInit;
    const params = layout || {};
    return model.importLayout({
      dataProvider: this.dataProvider,
      locale: new PlatformLocaleProvider(
        { model, translation },
        this.state.fieldConfiguration
      ),
      preloadedElements: params.preloadedElements,
      diagram: params.diagram ? DiagramService.upgradeLegacyDiagram(params.diagram) : undefined,
      validateLinks: validateLinks,
    });
  };

  /**
   * Opens save modal
   */
  private openSaveModal = (): void => {
    const dialogRef = 'create-new-resource';
    const { model } = this.workspace.getContext();
    const layout = model.exportLayout();

    getOverlaySystem().show(
      dialogRef,
      <CreateResourceDialog
        onSave={(label) => this.onSaveModalSubmit(label, layout)}
        onHide={() => getOverlaySystem().hide(dialogRef)}
        show={true}
        title={this.props.saveDiagramLabel || 'Save knowledge map'}
        placeholder='Enter map name'
      />
    );
  };

  private renderPropertyEditor = (options: Reactodia.PropertyEditorOptions) => {
    if (options.type !== 'entity') {
      return (
        <Reactodia.DefaultPropertyEditor
          options={options}
          resolveInput={() => null}
        />
      );
    }
  
    const { editor } = this.workspace.getContext();
    const { fieldConfiguration } = this.state;
    const metadata = getEntityMetadata(options.target.data, fieldConfiguration.metadata);
    const isNewElement = Reactodia.AuthoringState.isAddedEntity(
      editor.authoringState,
      options.target.data.id
    );

    if (metadata) {
      const persistence = makePersistenceFromConfig(fieldConfiguration.persistence);
      const formBody =
        metadata.formChildren ||
        Forms.generateFormFromFields({
          fields: metadata.fields.filter((f) => !isObjectProperty(f, metadata)),
          overrides: fieldConfiguration.inputOverrides,
        });

      // TODO: fix types
      const EntityEditor = Reactodia.EntityEditor as
        React.ComponentType<Parameters<typeof Reactodia.EntityEditor>[0]>;
      return (
        <EntityEditor target={options.target}>
          {({data, updateData, applyChanges}) => {
            const model = convertElementModelToCompositeValue(data, metadata);
            const props: EntityFormProps = {
              acceptIriAuthoring: isNewElement || persistence.supportsIriEditing,
              fields: metadata.fieldByIri.toArray(),
              newSubjectTemplate: metadata.newSubjectTemplate,
              model,
              onSubmit: (newData) => {
                const editedModel = convertCompositeValueToElementModel(newData, metadata);
                // TODO: use after fix in the library
                // updateData(() => editedModel);
                // applyChanges();
                editor.changeEntity(options.target.data, editedModel);
                options.onClose();
              },
              onCancel: () => options.onClose(),
            };
            return <EntityForm {...props}>{formBody}</EntityForm>;
          }}
        </EntityEditor>
      );
    } else {
      return (
        <ErrorNotification
          errorMessage={
            `<ontodia-entity-metadata> is not defined for the ` + `'${options.target.data.types.join(', ')}' types`
          }
        />
      );
    }
  };

  private onSaveModalSubmit(label: string, layout: Reactodia.SerializedDiagram): Kefir.Property<{}> {
    const { model } = this.workspace.getContext();
    this.setState({ label });
    return this.cancellation
      .map(this.parsedMetadata.flatMap((metadata) => DiagramService.saveDiagram(label, layout, metadata)))
      .flatMap((res) => (this.props.addToDefaultSet ? addToDefaultSet(res, this.props.id) : Kefir.constant(res)))
      .flatMap((diagramIri) => {
        model.history.reset();
        if (this.props.postSaving === 'navigate') {
          const props = { ...this.props.queryParams, diagram: diagramIri.value };
          return navigateToResource(Rdf.iri(this.props.navigateTo), props);
        }
        this.setState({ diagramIri: diagramIri.value });
        return Kefir.constant(undefined);
      })
      .map((results) => {
        trigger({
          eventType: OntodiaEvents.DiagramSaved,
          source: this.props.id,
          data: { resourceIri: this.state.diagramIri },
        });
        trigger({
          eventType: OntodiaEvents.DiagramIsDirty,
          source: this.props.id,
          data: { hasChanges: false },
        });
        return results;
      })
      .mapErrors((error) => {
        addNotification({ level: 'error', message: `Error saving map ${label}` }, error);
        return error;
      })
      .toProperty();
  }

  private resolveElementTemplate: Reactodia.TypedElementResolver = (types, element) => {
    if (element instanceof Reactodia.EntityElement) {
      for (let type of types) {
        const template = this.nodeTemplates[type];
        if (template) {
          return template;
        }
      }

      return this.defaultNodeTemplate;
    } else {
      return undefined;
    }
  };

  private prepareElementTemplates = () => {
    const { nodeTemplates, defaultNodeTemplate } = this.props;

    Object.keys(nodeTemplates).forEach((type) => {
      const template = nodeTemplates[type];
      this.nodeTemplates[type] = this.getElementTemplate(template);
    });

    if (defaultNodeTemplate) {
      this.defaultNodeTemplate = this.getElementTemplate(defaultNodeTemplate);
    }
  };

  private getTemplate = (template: string): React.CElement<{}, TemplateItem> => {
    if(!template) return null;
    return <TemplateItem template={{ source: template }} />;
  }

  private getElementTemplate = (template: string): Reactodia.ElementTemplate => {
    return {
      supports: {
        ...Reactodia.StandardTemplate.supports,
        // allow the user to resize elements via the halo resize handles
        [Reactodia.TemplateProperties.ElementSize]: true,
      },
      renderElement: props => <TemplatedElement baseProps={props} template={template} />,
    };
  };

  private resolveLinkTemplate: Reactodia.TypedLinkResolver = (linkTypeId, link) => {
    if (link instanceof Reactodia.RelationLink) {
      const { edgeStyles, defaultEdgeStyle } = this.props;
      const template = edgeStyles[linkTypeId] || defaultEdgeStyle;

      if (!template) {
        return;
      }

      const {
        markerSource = Reactodia.DefaultLinkTemplate.markerSource,
        markerTarget = Reactodia.DefaultLinkTemplate.markerTarget,
        linkStyle = {},
      } = template;

      return {
        markerSource,
        markerTarget,
        renderLink: (props) => {
          const {connection, label, properties} = linkStyle;
          const propertyLabels = properties ? (
            <>
              {properties.map(p => (
                <LinkExtraProperty link={props.link}
                  label={p}
                  position={props.getPathPosition(p.position ?? 0.5)}
                />
              ))}
            </>
          ) : undefined;
          return (
            <Reactodia.StandardRelation {...props}
              pathProps={connection ? {
                fill: connection.fill,
                stroke: connection.stroke,
                strokeWidth: connection['stroke-width'],
                strokeDasharray: connection['stroke-dasharray'],
              } : undefined}
              primaryLabelProps={label ? {
                title: label.title,
                style: getLinkLabelStyle(label.attrs),
              } : undefined}
              propertyLabelStartLine={1 + (properties ? properties.length : 0)}
              prependLabels={propertyLabels}
            />
          );
        },
      };
    } else {
      return undefined;
    }
  };

  /**
   * Places a newly created element so it does not overlap the existing ones:
   * runs an overlap removal pass which minimally displaces elements
   * (same behavior as the legacy Ontodia fork had on entity creation).
   */
  private placeCreatedEntity = (
    element: Reactodia.EntityElement,
    dropEvent?: Reactodia.CanvasDropEvent
  ): Promise<void> => {
    const { performLayout } = this.workspace.getContext();
    return performLayout({
      canvas: dropEvent?.source,
      layoutFunction: removeOverlapsLayout,
      zoomToFit: false,
    });
  };

  private suggestProperties = (
    params: Reactodia.PropertySuggestionParams
  ): Promise<Reactodia.PropertyScore[]> => {
    const { propertySuggestionQuery } = this.props;
    const { model, translation: t } = this.workspace.getContext();

    if (!params.token) {
      const element = model.elements.find((el): el is Reactodia.EntityElement =>
        el instanceof Reactodia.EntityElement && el.iri === params.elementId
      );
      params.token = element ? model.locale.formatEntityLabel(element.data, model.language) : '';
    }

    return DiagramService.suggestProperties(params, propertySuggestionQuery)
      .then(scores => Object.values(scores));
  };

  private resolveNodeStyles = (types: string[]): Reactodia.TypeStyle => {
    const { nodeStyles } = this.props;
    for (const type in nodeStyles) {
      if (types.indexOf(type) >= 0) {
        const { image, color } = nodeStyles[type];
        return { icon: image, color };
      }
    }
    return undefined;
  };
}

function makePersistenceFromConfig(mode: OntodiaPersistenceMode = { type: 'form' }) {
  return new FormBasedPersistence(mode);
}

/**
 * Layout function which only resolves element overlaps by minimally displacing
 * the overlapping elements instead of recomputing the whole layout.
 */
const removeOverlapsLayout: Reactodia.LayoutFunction = (graph, state) => {
  const padded = layoutPadded(state, { x: 15, y: 15 });
  const withoutOverlaps = colaRemoveOverlaps(padded.state);
  return Promise.resolve(padded.unwrap(withoutOverlaps));
};

interface TemplateAuthoringHandlers {
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function mapTemplateComponent(component: JSX.Element, handlers: TemplateAuthoringHandlers): JSX.Element {
  function mapElement(element: JSX.Element): JSX.Element {
    if (!isValidChild(element)) {
      return element;
    }

    if (element.type === 'button') {
      switch (element.props.name) {
        case 'edit':
          return cloneElement(element, {
            disabled: !handlers.canEdit,
            onClick: handlers.onEdit,
          });
        case 'delete':
          return cloneElement(element, {
            disabled: !handlers.canDelete,
            onClick: handlers.onDelete,
          });
      }
      return element;
    }

    if ('children' in element.props) {
      return cloneElement(element, {}, universalChildren(Children.map(element.props.children, mapElement)));
    }

    return element;
  }

  return mapElement(component);
}

const selectLabelLanguage: Reactodia.LabelLanguageSelector = (labels, language) => {
  return selectPreferredLabel(labels, language);
};

interface TemplatedElementProps {
  baseProps: Reactodia.TemplateProps;
  template: string;
}

function TemplatedElement({ baseProps, template }: TemplatedElementProps) {
  const workspace = Reactodia.useWorkspace();
  const { model, editor } = workspace;
  const { element, elementState } = baseProps;
  const data = element instanceof Reactodia.EntityElement ? element.data : undefined;

  const inAuthoringMode = Reactodia.useObservedProperty(
    editor.events, 'changeMode', () => editor.inAuthoringMode
  );

  // re-render the template when labels for the element types or properties get loaded
  Reactodia.useKeyedSyncStore(Reactodia.subscribeElementTypes, data ? data.types : [], model);
  Reactodia.useKeyedSyncStore(Reactodia.subscribePropertyTypes, data ? Object.keys(data.properties) : [], model);

  // do not render the template while the element data is being loaded for the
  // first time, otherwise each element would be rendered twice: once with the
  // placeholder data and once with the loaded one (each time re-running any
  // queries the template makes)
  const loadingData = Reactodia.useObservedProperty(
    model.events, 'changeOperations',
    () => Boolean(
      data &&
      Reactodia.EntityElement.isPlaceholderData(data) &&
      model.operations.some(op => op.type === 'element' && op.targets.has(data.id))
    ),
    [data]
  );

  const authoredContext = Reactodia.useAuthoredEntity(data, inAuthoringMode && !loadingData);
  const authoredContextRef = React.useRef(authoredContext);
  authoredContextRef.current = authoredContext;
  const { canEdit, canDelete } = authoredContext;
  // keep the mapper identity stable unless the permissions change to avoid
  // re-rendering the whole card subtree on every unrelated update
  // (the handlers read the latest authoring context through the ref)
  const componentMapper = React.useMemo(
    () => inAuthoringMode
      ? (component: JSX.Element) => mapTemplateComponent(component, {
          canEdit: Boolean(canEdit),
          canDelete: Boolean(canDelete),
          onEdit: () => authoredContextRef.current.onEdit(element),
          onDelete: () => authoredContextRef.current.onDelete(),
        })
      : undefined,
    [element, inAuthoringMode, canEdit, canDelete]
  );

  // apply the user-chosen element size restored from the saved diagram
  // or set through the halo resize handles
  const elementSize = elementState.get(Reactodia.TemplateProperties.ElementSize);
  const componentProps = React.useMemo(
    () => elementSize ? { style: { width: elementSize.width, height: elementSize.height } } : undefined,
    [elementSize]
  );

  if (loadingData) {
    return <div className='ontodia-element-loading'><Spinner /></div>;
  }

  const options = getElementTemplateContext(baseProps, workspace);
  return (
    <TemplateItem template={{ source: template, options }}
      componentProps={componentProps}
      componentMapper={componentMapper}
      onLoad={() => element.redraw('render')}
    />
  );
}

interface ElementTemplateContext {
  elementId: string;
  data: Reactodia.ElementModel | undefined;
  iri: Reactodia.ElementIri | undefined;
  types: string;
  label: string | undefined;
  color: string;
  iconUrl: string;
  imgUrl?: string;
  isExpanded?: boolean;
  propsAsList?: TemplatePropertyArray;
  props?: Record<Reactodia.PropertyTypeIri, TemplateProperty>;
}

type TemplatePropertyArray = Array<{
  id: string;
  name: string;
  property: TemplateProperty;
}>;

interface TemplateProperty {
  type: 'uri' | 'string';
  values: ReadonlyArray<Reactodia.Rdf.NamedNode | Reactodia.Rdf.Literal>;
}

function getElementTemplateContext(
  props: Reactodia.TemplateProps,
  { model, translation: t, getElementStyle }: Reactodia.WorkspaceContext
): ElementTemplateContext {
  const { element, elementId, isExpanded } = props;
  const data = element instanceof Reactodia.EntityElement ? element.data : undefined;

  let types = '';
  if (data) {
    types = data.types
      .map(typeIri => {
        const type = model.getElementType(typeIri);
        return t.formatLabel(type?.data?.label ?? [], typeIri, model.language);
      })
      .sort()
      .join(', ')
  }

  const { color, icon } = getElementStyle(element);

  const properties: Record<Reactodia.PropertyTypeIri, TemplateProperty> = Object.create(null);
  const propertiesList: TemplatePropertyArray = [];
  if (data) {
    for (const [propertyIri, values] of Object.entries(data.properties)) {
      const type = values.some(v => v.termType === 'NamedNode') ? 'uri' : 'string';
      const propertyWithValues: TemplateProperty = { type, values };
      const property = model.getPropertyType(propertyIri);
      properties[propertyIri] = propertyWithValues;
      propertiesList.push({
        id: propertyIri,
        name: t.formatLabel(property?.data?.label ?? [], propertyIri, model.language),
        property: propertyWithValues,
      });
    }
  }

  return {
    elementId,
    data,
    iri: data ? data.id : undefined,
    types,
    label: data ? model.locale.formatEntityLabel(data, model.language) : undefined,
    color,
    iconUrl: icon,
    imgUrl: data ? model.locale.selectEntityImageUrl(data) : undefined,
    isExpanded,
    props: properties,
    propsAsList: propertiesList,
  };
}

class PlatformDialogSettingsProvider extends Reactodia.DefaultDialogSettingsProvider {
  override getDialogSize(
    dialog: Reactodia.OverlayDialog
  ): Pick<Reactodia.DialogStyleProps, 'defaultSize' | 'minSize' | 'maxSize'> {
    const result = super.getDialogSize(dialog);
    if (result) {
      return result;
    }

    switch (dialog.knownType) {
      case Reactodia.BuiltinDialogType.editRelation: {
        return { defaultSize: { width: 300, height: 180 } };
      }
      case Reactodia.BuiltinDialogType.findOrCreateEntity: {
        return { defaultSize: { width: 300, height: 350 } };
      }
    }
    return undefined;
  }
}

class PlatformLocaleProvider extends Reactodia.DefaultDataLocaleProvider {
  constructor(
    options: Reactodia.DefaultDataLocaleProviderOptions,
    private readonly fieldConfiguration: FieldConfiguration | undefined
  ) {
    super({
      ...options,
      labelProperties: ConfigHolder.getUIConfig().preferredLabels,
      imageProperties: ConfigHolder.getUIConfig().preferredThumbnails,
    });
  }

  override selectEntityLabel(entity: Reactodia.ElementModel): readonly Reactodia.Rdf.Literal[] {
    if (this.fieldConfiguration?.metadata) {
      const metadata = getEntityMetadata(entity, this.fieldConfiguration.metadata);
      if (metadata && Object.prototype.hasOwnProperty.call(entity.properties, metadata.labelField.iri)) {
        const values = entity.properties[metadata.labelField.iri];
        if (values.length > 0) {
          return values.filter((v): v is Reactodia.Rdf.Literal => v.termType === 'Literal');
        }
      }
    }
    return super.selectEntityLabel(entity);
  }

  override selectEntityImageUrl(entity: Reactodia.ElementModel): string {
    if (this.fieldConfiguration?.metadata) {
      const metadata = getEntityMetadata(entity, this.fieldConfiguration.metadata);
      if (
        metadata && metadata.imageField &&
        Object.prototype.hasOwnProperty.call(entity.properties, metadata.imageField.iri)
      ) {
        const values = entity.properties[metadata.imageField.iri];
        if (values.length > 0) {
          return values[0].value;
        }
      }
    }
    return super.selectEntityImageUrl(entity);
  }

  override prepareAnchor(
    targetIri: string
  ): Pick<React.ComponentProps<'a'>, 'href' | 'target' | 'rel' | 'onClick'> {
    const resourceIri = Rdf.iri(targetIri);
    return {
      ...super.prepareAnchor(targetIri),
      href: constructUrlForResourceSync(resourceIri).toString(),
      onClick: e => {
        if (isSimpleClick(e)) {
          e.preventDefault();
          navigateToResource(resourceIri).onEnd(() => {/* nothing */});
        }
      },
    };
  }
}

function LinkExtraProperty(props: {
  link: Reactodia.Link;
  label: LinkLabel;
  position: Reactodia.Vector;
}) {
  const { link, label, position } = props;
  const { model } = Reactodia.useWorkspace();
  const t = Reactodia.useTranslation();
  const language = Reactodia.useObservedProperty(
    model.events, 'changeLanguage', () => model.language
  );
  const propertyText = t.selectLabel(label?.attrs?.text?.text ?? [], language);
  return (
    <Reactodia.LinkLabel link={link}
      position={position}
      style={getLinkLabelStyle(label.attrs)}
      title={label.title}>
      {propertyText?.value}
    </Reactodia.LinkLabel>
  );
}

function getLinkLabelStyle(attrs: LinkLabel['attrs']): React.CSSProperties | undefined {
  if (!attrs) {
    return undefined;
  }
  return {
    color: attrs.text?.stroke,
    backgroundColor: attrs.rect?.fill,
    borderWidth: attrs.rect?.['stroke-width'],
    borderColor: attrs.rect?.stroke,
    fontFamily: attrs.text?.['font-family'],
    fontSize: attrs.text?.['font-size'],
    fontWeight: attrs.text?.['font-weight'],
  };
}

export default Ontodia;
