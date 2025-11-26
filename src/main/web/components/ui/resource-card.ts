/**
 * ResearchSpace
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

import { CSSProperties, ReactElement, HTMLProps, createElement } from 'react';
import * as Kefir from 'kefir';

import { Rdf } from 'platform/api/rdf';
import { Component } from 'platform/api/components';
import { HighlightComponent } from 'platform/components/ui/highlight';
import { ErrorNotification } from 'platform/components/ui/notification';
import { Spinner } from 'platform/components/ui/spinner';

import * as ResourceConfigurationService from 'platform/api/services/resource-config';
import Icon from './icon/Icon';
import { lab } from 'd3-color';
import { SparqlClient } from 'platform/api/sparql';
import ResourceLabel from './resource-label';

export interface Props {
  /** IRI of resource to fetch configuration label for */
  iri: string;
  /** Render the raw IRI string instead of the full “card” */
  /** Render just the human-readable label */
  showLabel?: boolean;
  showIcon?: boolean;
  /** Additional class names for component root element */
  className?: string;
  /** Additional styles for label element */
  style?: CSSProperties;
  /** Substring to highlight */
  highlight?: string;
  /** Props for highlighted substring span */
  highlightProps?: HTMLProps<HTMLSpanElement>;
}

export interface State {
  configuration?: any;
  error?: any;
}

export class ResourceCard extends Component<Props, State> {
  constructor(props: Props, context) {
    super(props, context);
    this.state = {};
  }

  componentDidMount() {
    this.fetchResourceConfiguration(Rdf.iri(this.props.iri));
  }
/*
  componentWillReceiveProps(nextProps: Props) {
    if (nextProps.iri !== this.props.iri) {
      this.fetchResourceConfiguration(Rdf.iri(nextProps.iri));
    }
  }
*/
  private fetchResourceConfiguration = (iri: Rdf.Iri) => {
    const { semanticContext } = this.context;
    this.setState({ "configuration":ResourceConfigurationService.getResourceConfiguration(iri, semanticContext.repository)});
     // .then(configuration => this.setState({ "configuration":configuration }))
     // .catch(error => this.setState({ "error":"configuration does not exist" }));
  };

  private fetchRDFType = (iri: Rdf.Iri) => {
    const query = `
              SELECT ?rdfType
              WHERE {
                ${iri} rdf:type ?rdfType
              }
              LIMIT 1
            `;

    // 2. Create a stream that maps each response to the raw string value
    const rdfType$ = SparqlClient
      .select(query)
      .map(res => {
        // Grab the first (and only) binding
        const binding = res.results.bindings[0];
        // If there is no binding, return null; otherwise pull out the .value
        return binding ? binding.rdfType.value : null;
      })
      // 3. We only care about the first emission
      .take(1);

    // 4. Subscribe to get the actual string value
    rdfType$.onValue(rdfTypeValue => {

      if (rdfTypeValue) {

        console.log('rdfType:', rdfTypeValue+query);
        return rdfTypeValue;
        // …do something with rdfTypeValue…
      } else {
        console.warn('No rdfType found for', this.props.iri+query);
        return "undefined";
      }
    });
  }

  private fetchRDFTypeLabel = (iri: Rdf.Iri) => {
    const query = `
              SELECT ?label
              WHERE {
                ${iri} rdf:type/rdfs:label ?label
                FILTER(LANG(?label)="en")
              }
              LIMIT 1
            `;
    console.log("Label query"+query);
    // 2. Create a stream that maps each response to the raw string value
    const rdfTypeLabel$ = SparqlClient
      .select(query)
      .map(res => {
        // Grab the first (and only) binding
        const binding = res.results.bindings[0];
        // If there is no binding, return null; otherwise pull out the .value
        return binding ? binding.label.value : null;
      })
      // 3. We only care about the first emission
      .take(1);

    // 4. Subscribe to get the actual string value
    rdfTypeLabel$.onValue(labelValue => {

      if (labelValue) {

        console.log('rdfTypeLabel:', labelValue);
        return labelValue;
        // …do something with rdfTypeValue…
      } else {
        console.warn('No rdfTypeLabel found for', query);
        return "undefined";
      }
    });
  }

  private renderFullCard(configuration?: any): ReactElement {
    const resourceLabel = configuration?
                            ResourceConfigurationService
                              .getResourceConfigurationValue(configuration,'resourceLabel'):this.fetchRDFTypeLabel(Rdf.iri(this.props.iri));
    
    const resourceOntologyClass = configuration?ResourceConfigurationService.getResourceConfigurationValue(
      configuration,
      'resourceOntologyClass'
    ):undefined;

    const resourceIcon = configuration?ResourceConfigurationService.getResourceConfigurationValue(
      configuration,
      'resourceIcon'
    ):"bubble_chart";
    
   
    //getResource rdf type and use that as the label
    const cardResourceIcon = resourceIcon?resourceIcon:"bubble_chart";
    const cardResourceLabel = resourceLabel?resourceLabel:resourceOntologyClass;
    
    const innerDiv = createElement(
                          'div',
                          { className: 'h100 w100 resource-card__icon-container' },
                          createElement(Icon, { iconType: 'rounded', iconName: cardResourceIcon, symbol: true }),
                          createElement('div', null, cardResourceLabel));
    
    return createElement('div', null, innerDiv);
  
  }
  render(): ReactElement<any> {
    const { showLabel, showIcon, iri, className, style, highlight, highlightProps } = this.props;
    const { configuration, error } = this.state;

    if (error) {
      return createElement(ErrorNotification, { errorMessage: error.toString() });
    }

    // While loading ... 
    if (!configuration && !error) {
      return createElement(
        'div',
        { className: className, style: style },
        createElement(Spinner, {})
      );
    }


    // 1) If showLabel is true (regardless of showIri), render just the label:
    if (showLabel && configuration) {
      const labelText = ResourceConfigurationService.getResourceConfigurationValue(
        configuration,
        'resourceLabel'
      )|| ResourceConfigurationService.getResourceConfigurationValue(
          configuration,
        'resourceOntologyClass'
      ); 
      console.log("labeltext configuration"+labelText);
      return createElement(
        'div',
        { className: className, style: style },
        highlight
          ? createElement(HighlightComponent, { className, style, highlight, highlightProps }, labelText)          
          : labelText
      );
    }


    if (showLabel && !configuration) {
      //get the label of the rdf type of the entity
      const rdfIri = this.fetchRDFType(Rdf.iri(this.props.iri))+""; console.log("GEY THE label no config"+rdfIri+this.props.iri);
      return createElement(
        'div',
        { className: className, style: style },
       createElement(ResourceLabel, {"iri":rdfIri})
             
      );
    }
    
    if (showIcon && configuration) {
     const resourceIcon = ResourceConfigurationService.getResourceConfigurationValue(
      configuration,
      'resourceIcon'
    );
     console.log("getting icon");
      return (createElement(Icon, { iconType: 'rounded', iconName: resourceIcon, symbol: true }));
    }
    // 3) Default: render the full resource-card
    return this.renderFullCard(configuration);
  }
}
export default ResourceCard;