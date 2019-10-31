/*
 * Copyright (C) 2015-2019, metaphacts GmbH
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

import { Props as ReactProps, Component, createElement } from 'react';
import * as D from 'react-dom-factories';
import { findDOMNode } from 'react-dom';
import * as YASQE from 'yasgui-yasqe';
import { isUndefined, debounce, findKey } from 'lodash';
import { Overlay } from 'react-bootstrap';

import { GET_REGISTERED_PREFIXES } from 'platform/api/services/namespace';
import { Rdf } from 'platform/api/rdf';
import { resolveIris } from 'platform/api/sparql/SparqlUtil';
import { TemplateItem } from 'platform/components/ui/template';
import { TargetedPopover } from 'platform/components/ui/TargetedPopover';

import 'yasgui-yasqe/dist/yasqe.css';

const DEFAULT_POPOVER_TEMPLATE = `
<div style="white-space: normal">
<strong><mp-label iri="{{iri}}"></mp-label></strong><br/>
<semantic-query query="SELECT ?description WHERE { <{{iri}}> rdfs:comment|<http://schema.org/description> ?description } LIMIT 1"></semantic-query>
</div>
`;

export interface YasqeValue {
  value: string;
  queryType: string;
  queryMode: string;
}

export interface SparqlEditorProps extends ReactProps<SparqlEditor> {
  onChange?: (value: YasqeValue) => void;
  onBlur?: (value: YasqeValue) => void;
  backdrop?: boolean;
  query?: string;
  size?: {h: number; w: number; };
  // built-in autocompleters are "prefixes", "properties", "classes", "variables"
  autocompleters?: string[];
  /**
   * Function returning a string that will be used to identify
   * cached queries / prefixes from the local storage. If null, it will be used
   * Default: null (since otherwise it will spam local storage if used as a input component
   * i.e. in some forms spread over several instances.)
   *
   */
  persistent?: () => string;

  /**
   * Whether syntax erros should be checked and visually indicated.
   * Default: true
   */
  syntaxErrorCheck?: boolean;

  /**
   * Defines the popover content, expects {{iri}} as a context variable.
   */
  popoverTemplate?: string;
}

export interface State {
  resourceIri?: Rdf.Iri;
  targetTop?: number;
  targetLeft?: number;
}

export class SparqlEditor extends Component<SparqlEditorProps, State> {
  static defaultProps: Partial<SparqlEditorProps> = {
    popoverTemplate: DEFAULT_POPOVER_TEMPLATE,
  };

  private yasqe: YasguiYasqe.Yasqe;
  private id: string;

  constructor(props: SparqlEditorProps) {
    super(props);
    this.state = {targetTop: 0, targetLeft: 0};
    this.id = Math.random().toString(36).slice(2);
  }

  componentDidMount() {
    // bad hack, however, YASQE does extend a default autocompleters array
    // with the autocompleters passed in through options using $extend, which apparently
    // does not overwrite the entire array but replaces values in order
    if (this.props.autocompleters) {
      YASQE['defaults']['autocompleters'] = this.props.autocompleters;
      if (this.props.autocompleters.indexOf('prefixes') > -1) {
        YASQE['Autocompleters']['prefixes']['fetchFrom'] = GET_REGISTERED_PREFIXES;
        // Workaround for disabling caching of prefixes
        // YASQE doesn't support overriding the persistent option
        const _prefixes = YASQE['Autocompleters'].prefixes;
        YASQE['Autocompleters'].prefixes = (yasqe, completerName) => {
          const completer = _prefixes(yasqe, completerName);
          completer.persistent = null;
          return completer;
        };
      }
    }else {
      // by default we only support variables, since prefixes issues
      // calls against external services
      YASQE['defaults']['autocompleters'] = ['variables'];
    }

    this.yasqe = YASQE(
      findDOMNode(this) as Element, {
        backdrop: 0,
        value: this.props.query,
        persistent: this.props.persistent ? this.props.persistent  : null,
      }
    );

    /*
      Disabling syntax error check AFTER the node has been initialized.
      Setting 'syntaxErrorCheck' in the constructor may lead to race conditions.
    */
    if (this.props.syntaxErrorCheck === false) {
      this.yasqe.setOption('syntaxErrorCheck', false);
      this.yasqe.clearGutter('gutterErrorBar');
    }

    if (this.props.onChange) {
      this.yasqe.on('change', this.onChange);
    }

    if (this.props.size) {
      this.yasqe.setSize(this.props.size.w, this.props.size.h);
    }else {
      this.yasqe.setSize(null, 400);
    }

    this.setBackdrop(this.props.backdrop);

    const wrapper = this.yasqe.getWrapperElement();
    if (wrapper) {
      wrapper.addEventListener('mouseover', this.onMouseOver);
    }
  }

  componentWillReceiveProps(nextProps: SparqlEditorProps) {
    this.__componentWillRecieveProps(nextProps);
  }

  private __componentWillRecieveProps =
    debounce(function (this: SparqlEditor, nextProps: SparqlEditorProps) {
      if (normalizeLineEndings(nextProps.query) !== normalizeLineEndings(this.getQuery().value)) {
        this.setBackdrop(nextProps.backdrop);
        this.setValue(nextProps.query);
      }
    });

  componentWillUnmount() {
    const wrapper = this.yasqe.getWrapperElement();
    if (wrapper) {
      wrapper.removeEventListener('mouseover', this.onMouseOver);
    }
  }

  private onMouseOver = (e: MouseEvent) => {
    this.__onMouseOver(e);
  }

  private __onMouseOver = debounce((e: MouseEvent) => {
    const coords = {
      left: e.clientX + document.documentElement.scrollLeft,
      top: e.clientY + document.documentElement.scrollTop,
    };
    const token = this.yasqe.getTokenAt(this.yasqe.coordsChar(coords));
    const resourceIri = getResourceIriFromToken(token);
    this.setState({resourceIri, targetTop: coords.top, targetLeft: coords.left});
  }, 300);

  private renderPopover() {
    const {popoverTemplate} = this.props;
    const {resourceIri, targetTop, targetLeft} = this.state;
    if (!resourceIri) { return null; }
    const content = (
      createElement(TemplateItem, {
        template: {source: popoverTemplate, options: {'iri': resourceIri.value}},
      })
    );
    return (
      createElement(
        Overlay,
        {show: true},
        createElement(
          TargetedPopover,
          {
            id: 'sparql-editor-popover',
            targetTop,
            targetLeft,
            popoverSide: 'bottom',
            arrowAlignment: 'center',
          },
          content
        )
      )
    );
  }

  render() {
    return D.div({ id: this.id }, this.renderPopover());
  }

  getQuery(): YasqeValue {
    return {
      value: this.yasqe.getValue(),
      queryType: this.yasqe.getQueryType(),
      queryMode: this.yasqe.getQueryMode(),
    };
  }

  private setValue = (query: string) => {
    if (typeof query === 'string') {
      this.yasqe.setValue(query);
    }
  }

  private onChange = (doc, change) => {
    // call onChange only if change event was triggered by keyboard
    if (this.props.onChange && change.origin !== 'setValue') {
      this.props.onChange(this.getQuery());
    }
  }

  private setBackdrop = (show: boolean) => {
    this.yasqe.setBackdrop(
      isUndefined(show) ? false : show
    );
  }
}

/**
 * We need this function to make sure that we have consistent line endings,
 * independently from OS defaults.
 */
function normalizeLineEndings (str) {
  if (!str) { return str; }
  return str.replace(/\r\n|\r/g, '\n');
}

function getResourceIriFromToken(token: YasguiYasqe.YasqeToken): Rdf.Iri | undefined {
  const {prefixes} = token.state;
  if (token.type === 'string-2') {
    const [prefixKey, resource] = token.string.split(':');
    if (resource) {
      const prefix = prefixes[prefixKey];
      if (prefix) {
        return Rdf.iri(`${prefix}${resource}`);
      }
      try {
        return resolveIris([token.string])[0];
      } catch {
        return undefined;
      }
    }
  } else if (token.type === 'variable-3') {
    const resourceIri = Rdf.fullIri(token.string);
    const prefixKey = findKey(prefixes, prefix => prefix === resourceIri.value);
    return prefixKey ? undefined : resourceIri;
  }
  return undefined;
}
