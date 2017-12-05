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

import { createFactory, createElement, DOM as D} from 'react';
import * as ReactBootstrap from 'react-bootstrap';
import * as CopyToClipboard from 'react-copy-to-clipboard';

import { Component } from 'platform/api/components';
import { ResourceLink, ResourceLinkAction } from 'platform/api/navigation/components';
import { Rdf } from 'platform/api/rdf';
import * as SecurityService from 'platform/api/services/security';
import {ResourceViewer} from './ResourceViewer';

import '../../scss/page-editor.scss';

const ButtonGroup = createFactory(ReactBootstrap.ButtonGroup);
const ButtonToolbar = createFactory(ReactBootstrap.ButtonToolbar);

interface PageEditorToolbarProps {
  iri: Rdf.Iri;
}

interface PageEditorToolbarState {
  hasEditPermission?: boolean;
}

class PageEditorToolbarComponent extends Component<PageEditorToolbarProps, PageEditorToolbarState> {
  constructor(props: PageEditorToolbarProps, context) {
    super(props, context);
    this.state = {
      hasEditPermission : false,
    };
  }

  public componentWillMount() {
      SecurityService.Util.isPermitted(
        SecurityService.Permissions.templateSave
      ).onValue(
        answer => this.setState({ hasEditPermission: answer })
      );
  }

  public render() {
    return ButtonToolbar(
              {className: 'component-page-toolbar hidden-print'},
              ButtonGroup(
                {},
                this.showAssetsRepositoryIndicator(),
                this.state.hasEditPermission ?
                createElement(ResourceLink, {
                  resource: this.props.iri,
                  className: 'btn btn-default component-page-toolbar__btn_edit',
                  activeClassName: 'active',
                  title: 'Edit Page',
                  action: ResourceLinkAction.edit,
                }, D.span({}, ' Edit Page')) : null,
                createElement(
                ResourceViewer,
                {
                  pageIri : 'http://www.metaphacts.com/ontologies/platform#SourceStatements',
                  title: 'Statements'
                },
                 D.a(
                    {
                      className: 'btn btn-default component-page-toolbar__btn_show_source',
                      title: 'Show Statements',
                    }
                  )
                ),
                createElement(
                ResourceViewer,
                  {
                    pageIri : 'http://www.metaphacts.com/ontologies/platform#SourceGraph',
                    title: 'Graph'
                  },
                 D.a(
                    {
                      className: 'btn btn-default component-page-toolbar__btn_show_graph',
                      title: 'Show Graph',
                    }
                  )
                ),
                createElement(
                ResourceViewer,
                  {
                    pageIri : 'http://www.metaphacts.com/ontologies/platform#SourceDiagram',
                    title: 'Diagram'
                  },
                 D.a(
                    {
                      className: 'btn btn-default component-page-toolbar__btn_show_diagram',
                      title: 'Show Diagram',
                    }
                  )
                ),
                createElement(
                  CopyToClipboard,
                  {
                    text: this.props.iri.value,
                  },
                  D.a(
                    {
                      className: 'btn btn-default component-page-toolbar__btn_copy_iri',
                      title: 'Copy IRI',
                    }
                  )
                )
              )
            )
  }

  /**
   * Show assets repository indicator only to users with edit permission.
   */
  private showAssetsRepositoryIndicator() {
    const repository = this.context.semanticContext.repository;
    if (repository === 'assets' && this.state.hasEditPermission) {
      return  D.div(
        {className: 'badge alert-info component-page-toolbar__repository_indicator'},
        'assets repository'
      );
    } else {
      return null;
    }
  }
}

export const PageToolbar = createFactory(PageEditorToolbarComponent);
export default PageToolbar;
