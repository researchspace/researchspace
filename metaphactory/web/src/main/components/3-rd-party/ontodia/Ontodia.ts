/*
 * Copyright (C) 2015-2017, metaphacts GmbH
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, you can receive a copy
 * of the GNU Lesser General Public License from http://www.gnu.org/
 */

import {createElement, ClassAttributes} from 'react';
import * as Kefir from 'kefir';
import {
  Workspace,
  WorkspaceProps,
  SparqlDataProvider,
  SparqlDataProviderSettings,
  GraphBuilder,
  Triple,
  Dictionary,
  ElementModel,
  LayoutData,
  LinkTypeOptions,
  SparqlQueryMethod,
  SparqlGraphBuilder,
} from 'ontodia';

import { Cancellation, WrappingError } from 'platform/api/async';
import { Rdf, turtle } from 'platform/api/rdf';
import { navigateToResource } from 'platform/api/navigation';
import { ConfigHolder } from 'platform/api/services/config-holder';

import { CreateResourceDialog } from 'platform/components/ldp';
import { addToDefaultSet } from 'platform/api/services/ldp-set';
import { getOverlaySystem } from 'platform/components/ui/overlay';
import { addNotification, ErrorNotification } from 'platform/components/ui/notification';

import {
  getLayoutByDiagram,
  getRDFGraphBySparqlQuery,
  prepareImages,
  updateDiagram,
  saveDiagram,
  DiagramLayout,
} from './ontodia-data';

import { SupportedConfigName, getConfig } from './ontodia-configs';

import 'jointjs/css/layout.css';
import 'jointjs/css/themes/default.css';

import 'intro.js/introjs.css';
import { Component } from 'platform/api/components';

const ENDPOINT_URL = '/sparql';

export interface OntodiaProps {
  /**
   * Used as source id for emitted events.
   */
  id?: string;

  /**
   * Diagram identifier to display saved diagram.
   */
  diagram?: string;
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
   * Sparql query to get images of elements. Should contain parameters element and image,
   * where element is element on graph and image is image of element.
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
  providerSettings: SparqlDataProviderSettings;
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
   * When true saving the diagram is disabled and side panels are collapsed by default.
   */
  readonly?: boolean;

  /**
   * `true` if persisted component should be added to the default set of the current user
   *
   * @default false
   */
  addToDefaultSet?: boolean
}

interface State {
  readonly label?: string;
  readonly configurationError?: any;
}

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
 * <ontodia iri="http://www.cidoc-crm.org/cidoc-crm/E22_Man-Made_Object"></ontodia>
 * ```
 *
 * Specify a property to display image for elements:
 * ```
 * <ontodia
 * query='
 *   CONSTRUCT {
 *     ?inst ?propType1 ?propValue1.
 *   } WHERE {
 *     BIND (<http://www.cidoc-crm.org/cidoc-crm/E22_Man-Made_Object> as ?inst)
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
 *     BIND (<http://www.cidoc-crm.org/cidoc-crm/E22_Man-Made_Object> as ?inst)
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
  /**
   * calculate imageIris based on preferredThumbnails from UI props, in the prop we store full IRI
   * enclosed into <> but ontodia expects full IRI without <>.
   */
  static preferredThumbnails =
    ConfigHolder.getUIConfig().preferredThumbnails.value.map(iri => Rdf.fullIri(iri).value);

  static defaultProps: Partial<OntodiaProps> = {
    navigateTo: 'http://www.metaphacts.com/resource/assets/OntodiaView',
    addToDefaultSet: false,
    imageIris: Ontodia.preferredThumbnails,
  };

  private readonly cancellation = new Cancellation();
  private parsedMetadata: Kefir.Property<ReadonlyArray<Rdf.Triple>>;

  private workspace: Workspace;
  private dataProvider: SparqlDataProvider;

  constructor(props: OntodiaProps, context: any) {
    super(props, context);
    this.state = {};
    this.parsedMetadata = this.parseMetadata();
  }

  render() {
    if (this.state.configurationError) {
      return createElement(ErrorNotification, {errorMessage: this.state.configurationError});
    }
    const {readonly} = this.props;
    const props: WorkspaceProps & ClassAttributes<Workspace> = {
      ref: this.initWorkspace,
      onSaveDiagram: readonly ? undefined : this.onSaveDiagramPressed,
      leftPanelInitiallyOpen: readonly ? false : undefined,
      rightPanelInitiallyOpen: readonly ? false : undefined,
      languages: [
        {code: 'en', label: 'English'},
        {code: 'de', label: 'German'},
        {code: 'ru', label: 'Russian'},
      ],
    };
    return createElement(Workspace, props);
  }

  /**
   * Initializes workspace
   */
  private initWorkspace = workspace => {
    if (workspace) {
      const {imageQuery, imageIris} = this.props;

      this.workspace = workspace;

      const config = getConfig(this.props.settings, this.props.providerSettings);
      config.customizeWorkspace(workspace);

      this.dataProvider = config.getDataProvider({
        endpointUrl: ENDPOINT_URL,
        prepareImages: !imageQuery ? undefined : elementsInfo => {
          return prepareImages(elementsInfo, imageQuery);
        },
        imagePropertyUris: imageIris,
        // should we specify it in config?
        // GET allows for more caching, but does not run well with huge data sets
        queryMethod: SparqlQueryMethod.POST,
        acceptBlankNodes: true,
      });

      workspace.getModel().graph.on('action:iriClick', (url: string) => {
        navigateToResource(Rdf.iri(url)).onValue(() => {/* nothing */});
      });

      this.cancellation.map(Kefir.combine([
        Kefir.fromPromise(this.setLayout()),
        this.parsedMetadata,
      ])).observe({
        error: configurationError => this.setState({configurationError}),
      });
    }
  }

  private parseMetadata(): Kefir.Property<ReadonlyArray<Rdf.Triple>> {
    const {metadata} = this.props;
    if (metadata) {
      return this.cancellation.map(
        turtle.deserialize.turtleToTriples(this.props.metadata)
          .mapErrors(error => new WrappingError(`Invalid metadata format`, error))
      );
    } else {
      return Kefir.constant([]);
    }
  }

  private onSaveDiagramPressed = () => {
    const diagramIri = this.props.diagram;
    if (diagramIri) {
      const layout = this.workspace.getModel().exportLayout();
      const {label} = this.state;
      const context = this.context.semanticContext;
      this.cancellation.map(
        this.parsedMetadata.flatMap(metadata =>
          updateDiagram(diagramIri, layout, label, metadata, context)
        )
      ).observe({
        value: () => addNotification({
          level: 'success',
          message: `Saved diagram ${label}`,
        }),
        error: error => addNotification({
          level: 'error',
          message: `Error saving diagram ${label}`,
        }, error)
      });
    } else {
      this.openSaveModal();
    }
  }

  /**
   * Set diagram layout
   */
  private setLayout(): Promise<void> {
    const {diagram, query, iri} = this.props;
    if (diagram) {
      return this.setLayoutByDiagram(diagram);
    } else if (query) {
      return this.setLayoutBySparqlQuery(query);
    } else if (iri) {
      return this.setLayoutByIri(iri);
    } else {
      return this.importModelLayout();
    }
  }

  /**
   * Sets diagram layout by sparql query
   */
  private setLayoutBySparqlQuery(query: string): Promise<void> {
    const loadingLayout = getRDFGraphBySparqlQuery(query).then(graph => {
      const layoutProvider = new SparqlGraphBuilder(this.dataProvider);
      return layoutProvider.getGraphFromRDFGraph(graph as Triple[]);
    });
    this.workspace.showWaitIndicatorWhile(loadingLayout);

    return loadingLayout.then(res =>
      this.importModelLayout({
        preloadedElements: res.preloadedElements,
        layoutData: res.layoutData,
      })
    ).then(() => {
      this.workspace.forceLayout();
      this.workspace.zoomToFit();
    });
  }

  /**
   * Sets diagram layout by diagram id
   */
  private setLayoutByDiagram(diagram: string): Promise<void> {
    const loadingLayout = getLayoutByDiagram(diagram, this.context.semanticContext);
    this.workspace.showWaitIndicatorWhile(loadingLayout);

    return loadingLayout.then(res => {
      this.setState({label: res.label});
      return this.importModelLayout({
        layoutData: res.layoutData,
        linkSettings: res.linkSettings,
      });
    });
  }

  private setLayoutByIri(iri: string): Promise<void> {
    const layoutProvider = new GraphBuilder(this.dataProvider);
    const buildingGraph = layoutProvider.createGraph({elementIds: [iri], links: []});
    this.workspace.showWaitIndicatorWhile(buildingGraph);

    return buildingGraph.then(res => this.importModelLayout({
      preloadedElements: res.preloadedElements,
      layoutData: res.layoutData,
    }).then(() => {
      this.workspace.forceLayout();
      this.workspace.zoomToFit();
    }));
  }

  /**
   * Imports layout to diagram model
   */
  private importModelLayout = (layout?: {
    preloadedElements?: Dictionary<ElementModel>;
    layoutData?: LayoutData;
    linkSettings?: LinkTypeOptions[];
  }): Promise<void> => {
    const model = this.workspace.getModel(),
      params = layout || {};
    return model.importLayout({
      dataProvider: this.dataProvider,
      preloadedElements: params.preloadedElements || {},
      layoutData: params.layoutData,
      linkSettings: params.linkSettings,
    });
  }

  /**
   * Opens save modal
   */
  private openSaveModal = (): void => {
    const dialogRef = 'create-new-resource';
    const layout = this.workspace.getModel().exportLayout();

    getOverlaySystem().show(
      dialogRef,
      createElement(CreateResourceDialog, {
        onSave: label => this.onSaveModalSubmit(label, layout),
        onHide: () => getOverlaySystem().hide(dialogRef),
        show: true,
        title: 'Save Ontodia diagram',
        placeholder: 'Enter diagram name',
      }),
    );
  }

  private onSaveModalSubmit(label: string, layout: DiagramLayout): Kefir.Property<{}> {
    this.setState({label});
    const context = this.context.semanticContext;
    return this.cancellation.map(
      this.parsedMetadata.flatMap(
        metadata =>
          saveDiagram(label, layout, metadata, context)
      )
    ).flatMap(
      res => this.props.addToDefaultSet ? addToDefaultSet(res, this.props.id) : Kefir.constant(res)
    ).flatMap(diagramIri =>
      navigateToResource(Rdf.iri(this.props.navigateTo), {diagram: diagramIri.value})
    ).mapErrors(error => {
      addNotification({level: 'error', message: `Error saving diagram ${label}`}, error);
      return error;
    }).toProperty();
  }
}

export default Ontodia;
