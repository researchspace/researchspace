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

import { Props as ReactProps, Component, DOM as D } from 'react';
import { findDOMNode } from 'react-dom';
import * as YASQE from 'yasgui-yasqe';
import { isUndefined, debounce } from 'lodash';

import { GET_REGISTERED_PREFIXES } from 'platform/api/services/namespace';

import 'yasgui-yasqe/dist/yasqe.css';

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
}

export class SparqlEditor extends Component<SparqlEditorProps, {}> {
  private yasqe: YasguiYasqe.Yasqe;
  private id: string;

  constructor(props: SparqlEditorProps) {
    super(props);
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
        // disable caching of prefixes
        YASQE['Autocompleters']['prefixes']['persistent'] = null;
      }
    }else {
      // by default we only support variables, since prefixes issues
      // calls against external services
      YASQE['defaults']['autocompleters'] = ['variables'];
    }

    this.yasqe = YASQE(
      findDOMNode(this), {
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

  render() {
    return D.div({ id: this.id });
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
