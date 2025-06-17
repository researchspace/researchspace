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

import {
  ClassAttributes,
  Component as ReactComponent,
  ReactElement,
  Children,
  cloneElement,
  createElement,
} from 'react';
import * as Kefir from 'kefir';
import { debounce, includes } from 'lodash';
import {
  Workspace,
  WorkspaceProps,
  RDFDataProvider,
  SparqlDataProvider,
  SparqlDataProviderSettings,
  CompositeDataProvider,
  GraphBuilder,
  Triple,
  Dictionary,
  ElementModel,
  Element,
  SparqlQueryMethod,
  TemplateProps,
  ElementTemplate,
  LinkMarkerStyle,
  LinkStyle,
  LinkTemplate,
  LinkTypeOptions,
  ElementIri,
  PropertyEditorOptions,
  PropertySuggestionParams,
  PropertyScore,
  AuthoringState,
  AuthoringKind,
  AuthoredEntity,
  AuthoredEntityContext,
  CustomTypeStyle,
  EventObserver,
  SerializedDiagram,
  makeSerializedDiagram,
  Link,
  IriClickEvent,
  LabelLanguageSelector,
  SparqlDataProviderOptions,
  LocalizedString,
  LinkModel,
  LinkTypeIri,
  CancellationToken,
  getContentFittingBox,
  Highlighter,
} from 'ontodia';
import * as URI from 'urijs';

import { BuiltInEvents, trigger, listen, registerEventSource, unregisterEventSource } from 'platform/api/events';
import { Cancellation, WrappingError } from 'platform/api/async';
import { Component } from 'platform/api/components';
import { Rdf, turtle } from 'platform/api/rdf';
import {
  navigateToResource,
  navigationConfirmation,
  openResourceInNewWindow,
  openExternalLink,
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
import { SupportedConfigName, RDF_DATA_PROVIDER_NAME, createDataProvider } from './data/OntodiaDataProvider';
import { RawTriple, getRdfExtGraphBySparqlQuery, makeRdfExtGraph } from './data/RdfExt';

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

import { deriveCancellationToken } from './AsyncAdapters';
import * as OntodiaEvents from './OntodiaEvents';

export interface EdgeStyle {
  markerSource?: LinkMarkerStyle;
  markerTarget?: LinkMarkerStyle;
  linkStyle?: LinkStyle;
  editable?: boolean;
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
  providerSettings?: SparqlDataProviderSettings;
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
  onLoadWorkspace?: (workspace: Workspace) => void;
}

interface State {
  readonly label?: string;
  readonly fieldConfiguration?: FieldConfiguration;
  readonly configurationError?: any;
  readonly diagramIri?: string;
  readonly loading: boolean;
}

const DEFAULT_FACTORY = {
  createWorkspace: (componentProps, workspaceProps) => createElement(Workspace, workspaceProps),
  createToolbar: (componentProps, toolbarProps) => createElement(Toolbar, toolbarProps),
  onNewDigaramInitialized: (componentProps, workspace: Workspace) => {
    workspace.forceLayout();
    workspace.zoomToFit();
  },
  getPersistence: (mode) => {
    return new FormBasedPersistence(mode);
  },
};

const DEBOUNCE_DELAY = 300;

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
  private readonly listener = new EventObserver();

  private metadataApi: FieldBasedMetadataApi;
  private validationApi: FieldBasedValidationApi;
  private parsedMetadata: Kefir.Property<ReadonlyArray<Rdf.Triple>>;

  workspace: Workspace;
  private dataProvider: SparqlDataProvider | CompositeDataProvider;
  private nodeTemplates: { [type: string]: ElementTemplate } = {};
  private defaultNodeTemplate: ElementTemplate;

  private navigationListenerUnsubscribe?: () => void;

  constructor(props: OntodiaProps, context: any) {
    super(props, context);

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

  private async loadFieldConfiguration(ct: CancellationToken) {
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
      return createElement(ErrorNotification, { errorMessage: this.state.configurationError });
    } else if (this.state.loading) {
      return createElement(Spinner, {});
    }

    const preferredLanguage = getPreferredUserLanguage();
    const globalLanguages = ConfigHolder.getUIConfig().preferredLanguages.map((lang) => {
      return { code: lang, label: lang };
    });

    const {
      readonly,
      groupBy,
      hidePanels,
      hideNavigator,
      collapseNavigator,
      hideToolbar,
      hideHalo,
      hideScrollBars,
      saveDiagramLabel,
      persistChangesLabel,
      propertySuggestionQuery,
      zoomRequireCtrl,
      nodeStyles,
      leftPanelInitiallyOpen,
      rightPanelInitiallyOpen,
    } = this.props;
    const { fieldConfiguration } = this.state;

    const { createWorkspace, createToolbar } = DEFAULT_FACTORY;
    const props: WorkspaceProps & ClassAttributes<Workspace> = {
      ref: this.initWorkspace,
      languages: globalLanguages.length > 0 ? globalLanguages : [{ code: preferredLanguage, label: preferredLanguage }],
      language: preferredLanguage,
      onSaveDiagram: readonly ? undefined : this.onSaveDiagramPressed,
      onPersistChanges: fieldConfiguration.authoringMode ? this.onPersistAuthoredChanges : undefined,
      leftPanelInitiallyOpen: readonly ? false : leftPanelInitiallyOpen,
      rightPanelInitiallyOpen: readonly ? false : rightPanelInitiallyOpen,
      toolbar: createToolbar(this.props, {
        saveDiagramLabel,
        persistChangesLabel,
        getWorkspace: this.getWorkspace,
        onSaveDiagramAs: () => this.openSaveModal(),
        onPersistChangesAndSaveDiagram: () => this.onPersistChangesAndSaveDiagram(),
        diagramIri: this.state.diagramIri,
        dropdownTemplate: this.getTemplate('{{> knowledge-map-dropdown}}')
      }),
      metadataApi: this.metadataApi,
      validationApi: this.validationApi,
      viewOptions: {
        onIriClick: this.onIriClick,
        groupBy,
        suggestProperties: propertySuggestionQuery ? this.suggestProperties : undefined,
      },
      zoomOptions: {
        min: 0.002,
        maxFit: 1,
        requireCtrl: zoomRequireCtrl,
      },
      hidePanels,
      hideToolbar,
      hideScrollBars,
      hideHalo,
      hideNavigator,
      collapseNavigator,
      typeStyleResolver: nodeStyles ? this.resolveNodeStyles : undefined,
      elementTemplateResolver: this.resolveElementTemplate,
      linkTemplateResolver: this.resolveLinkTemplate,
      selectLabelLanguage,
      propertyEditor: this.renderPropertyEditor,
    };
    return createWorkspace(this.props, props);
  }

  componentDidMount() {
    this.loadFieldConfiguration(deriveCancellationToken(this.cancellation)).then(() =>
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

  private onIriClick = ({ iri: elementIri, clickIntent, originalEvent }: IriClickEvent) => {
    const iri = Rdf.iri(elementIri);
    if (clickIntent === 'jumpToEntity' || clickIntent === 'openEntityIri') {
      if (isSimpleClick(originalEvent)) {
        navigateToResource(iri).onEnd(() => {
          /* nothing */
        });
      } else {
        openResourceInNewWindow(iri);
      }
    } else {
      const { target = '_blank' } = originalEvent.target as HTMLAnchorElement;
      openExternalLink(URI(iri.value), target).onEnd(() => {
        /* nothing */
      });
    }
  };

  private getRepositories = (): string[] => {
    const { repository = 'default' } = this.context.semanticContext;
    const { repositories = [repository] } = this.props;

    return repositories;
  };

  private prepareImages = (elementsInfo: Dictionary<ElementModel>) => {
    const { imageQuery, imageIris } = this.props;

    if (!imageQuery && !imageIris) {
      return DiagramService.fetchThumbnails(elementsInfo, this.context.semanticContext);
    } else if (imageQuery) {
      return DiagramService.prepareImages(elementsInfo, imageQuery);
    }
  };

  private prepareLabels = (resources: Set<string>): Promise<Map<string, LocalizedString[]>> => {
    const iris = Array.from(resources, Rdf.iri);
    const context = this.context.semanticContext;
    return getLabels(iris, { context })
      .map((labels) => {
        const result = new Map<string, LocalizedString[]>();
        labels.forEach((label, iri) => {
          const literal: LocalizedString = { value: label, language: '' };
          result.set(iri.value, [literal]);
        });
        return result;
      })
      .toPromise();
  };

  /**
   * Initializes workspace
   */
  private initWorkspace = (workspace: Workspace) => {
    if (workspace) {
      const {
        onLoadWorkspace,
        imageIris,
        provisionQuery,
        acceptBlankNodes,
        settings: configName,
        autoZoom,
        hideNavigationConfirmation,
        imageQuery,
      } = this.props;
      const { fieldConfiguration } = this.state;

      this.workspace = workspace;
      if (onLoadWorkspace) {
        onLoadWorkspace(workspace);
      }

      // if there is no imageIris or only imageQuery is provided then
      // then we resolve thumbnail through the platform thumbnail service, otherwise
      // we use default thumbnail resolution mechanism from ontodia
      const prepareImages = (!imageIris && !imageQuery) || imageQuery ? this.prepareImages : undefined;
      const options: SparqlDataProviderOptions = {
        endpointUrl: '',
        prepareImages: prepareImages,
        prepareLabels: this.prepareLabels,
        imagePropertyUris: imageIris,
        queryMethod: SparqlQueryMethod.POST,
        acceptBlankNodes: acceptBlankNodes,
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

      if (autoZoom) {
        this.listener.listen(this.workspace.getEditor().events, 'addElements', () => {
          this.workspace.zoomToFit();
        });
      }

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
    const model = this.workspace.getModel();
    const editor = this.workspace.getEditor();

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
    this.listener.listen(model.events, 'elementEvent', (event) => {
      if (event.key === 'changeData') {
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
            const element = model.elements.find(({ iri }) => iri === data.iri);
            if (element) {
              const box = getContentFittingBox([element], []);
              this.workspace.zoomToFitRect(box);
              editor.setSelection([element]);
            }
          } else if (data.iris) {
            const elements = model.elements.filter(({ iri }) => includes(data.iris, iri));
            if (elements.length !== 0) {
              const box = getContentFittingBox(elements, []);
              this.workspace.zoomToFitRect(box);
              editor.setSelection(elements);
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
          const view = this.workspace.getDiagram();
          let highlighter: Highlighter;
          if (data.iris) {
            const highlightedElements = new Set<string>();
            data.iris.forEach((iri) => highlightedElements.add(iri));
            highlighter = (item) => {
              if (item instanceof Element) {
                return highlightedElements.has(item.iri);
              }
              if (item instanceof Link) {
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
    const editor = this.workspace.getEditor();
    this.cancellation
      .map(
        listen({
          eventType: OntodiaEvents.CreateElement,
          target: id,
        })
      )
      .map((event): typeof event.data & { elementModel: ElementModel } => {
        const elementData = event.data.elementData as ElementModel;
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
          const element = editor.createNewEntity({ elementModel: elementModel as ElementModel });
          targets.forEach(({ targetIri, linkTypeId }) => {
            const target = editor.model.elements.find((el) => el.iri === targetIri);
            if (target) {
              const linkModel: LinkModel = {
                linkTypeId: linkTypeId as LinkTypeIri,
                sourceId: element.iri,
                targetId: target.iri,
              };
              const link = new Link({
                typeId: linkTypeId as LinkTypeIri,
                sourceId: element.id,
                targetId: target.id,
                data: linkModel,
              });
              editor.createNewLink({ link });
            }
          });
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
          editor.changeEntityData(targetIri as ElementIri, elementData as ElementModel);
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
          editor.deleteEntity(event.data.iri as ElementIri);
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
    const model = this.workspace.getModel();
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
    const { diagramIri } = this.state;
    if (diagramIri) {
      const layout = this.workspace.getModel().exportLayout();
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
            this.workspace.getModel().history.reset();
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
    this.workspace.showWaitIndicatorWhile(this.persistAuthoredChanges());
  };

  private onPersistChangesAndSaveDiagram() {
    this.workspace.showWaitIndicatorWhile(this.persistAuthoredChanges().then(() => this.onSaveDiagramPressed()));
  }

  private persistAuthoredChanges(): Promise<void> {
    const { fieldConfiguration } = this.state;
    const persistence = makePersistenceFromConfig(fieldConfiguration.persistence);
    const model = this.workspace.getModel();
    const editor = this.workspace.getEditor();

    const existingModels = new Map<ElementIri, ElementModel>();
    model.elements.forEach((element) => existingModels.set(element.iri, element.data));

    const fetchModel = (iri: ElementIri): Kefir.Property<ElementModel> => {
      if (existingModels.has(iri)) {
        return Kefir.constant(existingModels.get(iri));
      }
      return Kefir.fromPromise(
        model.dataProvider.elementInfo({ elementIds: [iri] }).then((result) => result[iri])
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
    const model = this.workspace.getModel();
    const editor = this.workspace.getEditor();

    for (const element of [...model.elements]) {
      const changed = result.finalizedEntities.get(element.iri);
      if (changed) {
        element.setData(changed);
      } else if (changed === null) {
        model.removeElement(element.id);
      }
    }
    
    const changedResourcesIris = model.elements.map(el => el.data.id);
    for (const link of [...model.links]) {
      const event = editor.authoringState.links.get(link.data);
      if (event && event.deleted) {
        model.removeLink(link.id);
      }
    }

    editor.setAuthoringState(AuthoringState.empty);
    editor.cancelSelection();
    model.history.reset();

    this.workspace.zoomToFit();
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
        let linkOptions = linkSettings as ReadonlyArray<LinkTypeOptions>;

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
            preloadedElements: {},
            diagram: makeSerializedDiagram({
              linkTypeOptions: linkOptions,
            }),
          });
        }
      })
      .then(() => {
        this.workspace.getModel().history.reset();
      });
  }

  /**
   * Sets diagram layout by sparql query
   */
  private setLayoutBySparqlQuery(query: string, linkSettings: ReadonlyArray<LinkTypeOptions>): Promise<void> {
    const { onNewDigaramInitialized: performDiagramLayout } = DEFAULT_FACTORY;
    const repositories = this.getRepositories();
    const loadingLayout = getRdfExtGraphBySparqlQuery(query, repositories).then((graph) => {
      const layoutProvider = new GraphBuilder(this.dataProvider, linkSettings);
      return layoutProvider.getGraphFromRDFGraph(graph as Triple[]);
    });
    this.workspace.showWaitIndicatorWhile(loadingLayout);

    return loadingLayout
      .then((res) =>
        this.importModelLayout({
          preloadedElements: res.preloadedElements,
          diagram: res.diagram,
        })
      )
      .then(() => {
        performDiagramLayout(this.props, this.workspace);
      });
  }

  private importProvisionData = (): Promise<void> => {
    const { provisionQuery } = this.props;

    if (!provisionQuery) {
      return Promise.resolve();
    }

    const repositories = this.getRepositories();

    return getRdfExtGraphBySparqlQuery(provisionQuery, repositories).then((graph) =>
      this.addGraphToRDFDataProvider(graph)
    );
  };

  private addGraphToRDFDataProvider = (graph: RawTriple[]) => {
    const dataProviders = (this.dataProvider as CompositeDataProvider).dataProviders;
    let rdfDataProvider: RDFDataProvider;

    for (const { name, dataProvider } of dataProviders) {
      if (name !== RDF_DATA_PROVIDER_NAME) {
        continue;
      }

      rdfDataProvider = dataProvider as RDFDataProvider;
    }

    if (rdfDataProvider) {
      rdfDataProvider.addGraph(makeRdfExtGraph(graph) as object);
    }
  };

  /**
   * Sets diagram layout by diagram id
   */
  private setLayoutByDiagram(diagram: string): Promise<void> {
    const loadingLayout = DiagramService.getDiagramByIri(diagram, { repository: 'assets' });
    this.workspace.showWaitIndicatorWhile(loadingLayout);

    return loadingLayout
      .then((res) => {
        this.setState({ label: res.label });
        return this.importModelLayout({
          diagram: res.diagram,
        });
      })
      .then(() => {
        this.workspace.zoomToFit();
      });
  }

  private setLayoutByIri(iri: string, linkSettings: ReadonlyArray<LinkTypeOptions>): Promise<void> {
    return this.setLayoutByIris([iri], linkSettings).then(() => {
      const editor = this.workspace.getEditor();
      const element = editor.model.elements.find(({ data }) => data.id === iri);
      if (element) {
        // shift canvas to the right to encompass newly opened connections menu
        this.workspace.centerTo({
          x: element.position.x + element.size.width / 2 + 500,
          y: element.position.y + element.size.height / 2,
        });
        editor.showConnectionsMenu(element);
      }
    });
  }
  private setLayoutByIris(iris: string[], linkSettings: ReadonlyArray<LinkTypeOptions>): Promise<void> {
    const { onNewDigaramInitialized: performDiagramLayout } = DEFAULT_FACTORY;
    const layoutProvider = new GraphBuilder(this.dataProvider, linkSettings);
    const buildingGraph = layoutProvider.createGraph({
      elementIds: iris.map((iri) => iri as ElementIri),
      links: [],
    });
    this.workspace.showWaitIndicatorWhile(buildingGraph);

    return buildingGraph.then((res) =>
      this.importModelLayout({
        preloadedElements: res.preloadedElements,
        diagram: {
          ...res.diagram,
          linkTypeOptions: this.props.linkSettings as ReadonlyArray<LinkTypeOptions>,
        },
      }).then(() => {
        performDiagramLayout(this.props, this.workspace);
      })
    );
  }

  /**
   * Imports layout to diagram model
   */
  private importModelLayout = (layout?: {
    preloadedElements?: Dictionary<ElementModel>;
    diagram?: SerializedDiagram;
  }): Promise<void> => {
    const validateLinks = this.props.requestLinksOnInit === undefined ? true : this.props.requestLinksOnInit;
    const model = this.workspace.getModel(),
      params = layout || {};
    return model.importLayout({
      dataProvider: this.dataProvider,
      preloadedElements: params.preloadedElements || {},
      diagram: params.diagram,
      validateLinks: validateLinks,
    });
  };

  /**
   * Opens save modal
   */
  private openSaveModal = (): void => {
    const dialogRef = 'create-new-resource';
    const layout = this.workspace.getModel().exportLayout();

    getOverlaySystem().show(
      dialogRef,
      createElement(CreateResourceDialog, {
        onSave: (label) => this.onSaveModalSubmit(label, layout),
        onHide: () => getOverlaySystem().hide(dialogRef),
        show: true,
        title: this.props.saveDiagramLabel || 'Save knowledge map',
        placeholder: 'Enter map name',
      })
    );
  };

  private renderPropertyEditor = (options: PropertyEditorOptions) => {
    const { fieldConfiguration } = this.state; 
    const metadata = getEntityMetadata(options.elementData, fieldConfiguration.metadata);
    const authoringState = this.workspace.getEditor().authoringState;

    if (metadata) {
      const rawModel = convertElementModelToCompositeValue(options.elementData, metadata);
      const elementState = authoringState.elements.get(rawModel.subject.value as ElementIri);

      let isNewElement = false;
      let elementNewIri: ElementIri | undefined;
      if (elementState && elementState.type === AuthoringKind.ChangeElement) {
        isNewElement = !elementState.before;
        elementNewIri = elementState.newIri;
      }

      const model: Forms.CompositeValue = {
        ...rawModel,
        subject: typeof elementNewIri === 'string' ? Rdf.iri(elementNewIri) : rawModel.subject,
      };

      const persistence = makePersistenceFromConfig(fieldConfiguration.persistence);
      const props: EntityFormProps = {
        acceptIriAuthoring: isNewElement || persistence.supportsIriEditing,
        fields: metadata.fieldByIri.toArray(),
        newSubjectTemplate: metadata.newSubjectTemplate,
        model,
        onSubmit: (newData) => {
          const editedModel = convertCompositeValueToElementModel(newData, metadata);
          options.onSubmit(editedModel);
        },
        onCancel: () => options.onCancel && options.onCancel(),
      }; 
      const formBody =
        metadata.formChildren ||
        Forms.generateFormFromFields({
          fields: metadata.fields.filter((f) => !isObjectProperty(f, metadata)),
          overrides: fieldConfiguration.inputOverrides,
        });
      return createElement(EntityForm, props, formBody);
    } else {
      return createElement(ErrorNotification, {
        errorMessage:
          `<ontodia-entity-metadata> is not defined for the ` + `'${options.elementData.types.join(', ')}' types`,
      });
    }
  };

  private onSaveModalSubmit(label: string, layout: SerializedDiagram): Kefir.Property<{}> {
    this.setState({ label });
    return this.cancellation
      .map(this.parsedMetadata.flatMap((metadata) => DiagramService.saveDiagram(label, layout, metadata)))
      .flatMap((res) => (this.props.addToDefaultSet ? addToDefaultSet(res, this.props.id) : Kefir.constant(res)))
      .flatMap((diagramIri) => {
        this.workspace.getModel().history.reset();
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

  private resolveElementTemplate = (types: string[]): ElementTemplate | undefined => {
    for (let type of types) {
      const template = this.nodeTemplates[type];
      if (template) {
        return template;
      }
    }

    return this.defaultNodeTemplate;
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
    return createElement(TemplateItem, {
      template: { source: template },
    })
  }

  private getElementTemplate = (template: string): ElementTemplate => {
    const inAuthoringMode = () => this.state.fieldConfiguration.authoringMode;
    return class extends ReactComponent<TemplateProps, {}> {
      render() {
        if (inAuthoringMode()) {
          return createElement(AuthoredEntity, {
            templateProps: this.props,
            children: (context: AuthoredEntityContext) => {
              return createElement(TemplateItem, {
                template: { source: template, options: this.props },
                componentMapper: (component) => mapTemplateComponent(component, context),
              });
            },
          });
        } else {
          return createElement(TemplateItem, {
            template: { source: template, options: this.props },
          });
        }
      }
    };
  };

  private resolveLinkTemplate = (linkTypeId: string): LinkTemplate | undefined => {
    const { edgeStyles, defaultEdgeStyle } = this.props;
    const template = edgeStyles[linkTypeId] || defaultEdgeStyle;

    if (!template) {
      return;
    }

    const { markerSource, markerTarget, linkStyle = {}, editable } = template;

    return {
      markerSource,
      markerTarget,
      renderLink: (link: Link) => {
        if (editable && link.linkState) {
          const customLabel: Array<LocalizedString> = [
            {
              value: link.linkState['ontodia:customLabel'],
              language: '',
            },
          ];
          const { label = {} } = linkStyle;
          const { attrs = {} } = label;
          const { text = {} } = attrs;
          return {
            ...linkStyle,
            label: {
              ...label,
              attrs: {
                ...attrs,
                text: {
                  ...text,
                  text: customLabel,
                },
              },
            },
          };
        }
        return linkStyle;
      },
      setLinkLabel: editable
        ? (link: Link, label: string) => {
            link.setLinkState({ ['ontodia:customLabel']: label });
          }
        : undefined,
    };
  };

  private suggestProperties = (params: PropertySuggestionParams): Promise<Dictionary<PropertyScore>> => {
    const { propertySuggestionQuery } = this.props;

    if (!params.token) {
      const model = this.workspace.getModel();
      const diagram = this.workspace.getDiagram();
      const element = model.getElement(params.elementId);

      params.token = element ? diagram.formatLabel(element.data.label.values, element.data.id) : '';
    }

    return DiagramService.suggestProperties(params, propertySuggestionQuery);
  };

  private resolveNodeStyles = (types: string[]): CustomTypeStyle => {
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
  const factory = DEFAULT_FACTORY;
  return factory.getPersistence(mode);
}

function mapTemplateComponent(component: JSX.Element, context: AuthoredEntityContext): JSX.Element {
  function mapElement(element: JSX.Element): JSX.Element {
    if (!isValidChild(element)) {
      return element;
    }

    if (element.type === 'button') {
      switch (element.props.name) {
        case 'edit':
          return cloneElement(element, {
            disabled: !context.canEdit,
            onClick: context.onEdit,
          });
        case 'delete':
          return cloneElement(element, {
            disabled: !context.canDelete,
            onClick: context.onDelete,
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

const selectLabelLanguage: LabelLanguageSelector = (labels, language) => {
  return selectPreferredLabel(labels, language);
};

export default Ontodia;
