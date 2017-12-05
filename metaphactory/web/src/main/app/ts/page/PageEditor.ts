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

import * as _ from 'lodash';
import 'codemirror/lib/codemirror.css';
import 'codemirror/mode/htmlmixed/htmlmixed';
import 'codemirror/addon/mode/simple';
import 'codemirror/addon/mode/multiplex';
import 'codemirror/mode/handlebars/handlebars';
import 'codemirror/mode/xml/xml';
import './codemirror/mph-handlebars.js';

import 'codemirror/addon/fold/foldgutter';
import 'codemirror/addon/fold/foldgutter.css';
import 'codemirror/addon/fold/foldcode';
import 'codemirror/addon/fold/brace-fold';
import 'codemirror/addon/fold/indent-fold';
import 'codemirror/addon/fold/xml-fold';
import 'codemirror/addon/edit/matchtags';
import 'codemirror/addon/edit/matchbrackets';

import {
  DOM as D, ReactElement, Component, createFactory, createElement,
} from 'react';
import { RadioGroup, Radio } from 'react-radio-group';
import * as ReactBootstrap from 'react-bootstrap';
import * as ReactCodeMirror from 'react-codemirror';

import {
  navigateToResource, navigationConfirmation,
} from 'platform/api/navigation';
import { Rdf, vocabularies } from 'platform/api/rdf';
import * as PageService from 'platform/api/services/page';
import { BrowserPersistence } from 'platform/components/utils';
import { ResourceLink, ResourceLinkAction } from 'platform/api/navigation/components';
import { getOverlaySystem, OverlayDialog} from 'platform/components/ui/overlay';

import '../../scss/page-editor.scss';

const CodeMirror = createFactory(ReactCodeMirror);

const Button = createFactory(ReactBootstrap.Button);
const Grid = createFactory(ReactBootstrap.Grid);
const Row = createFactory(ReactBootstrap.Row);
const Col = createFactory(ReactBootstrap.Col);
const ButtonToolbar = createFactory(ReactBootstrap.ButtonToolbar);
const ButtonGroup = createFactory(ReactBootstrap.ButtonGroup);

interface PageEditorProps {
  iri: Rdf.Iri;
}

interface PageEditorState {
  pageSource?: PageService.TemplateContent;
  saving?: boolean;
  activeSyntax?: Syntax;
  loading?: boolean;
}

enum Syntax {
  HTMLMIXED, MPHHANDLEBARS, HANDLEBARS, NONE,
}

const PLATFORM_TEMPLATE_EDITOR = 'mp-internal-page-editor';
const LocalStorageState = BrowserPersistence.adapter<{
  readonly activeSyntax: Syntax
}>();

interface RadioGroupEntry {
  type: Syntax;
  label: string;
}

class PageEditorComponent extends Component<PageEditorProps, PageEditorState> {
  private navigationListenerUnsubscribe?: () => void;
  private radioGroupEntries: RadioGroupEntry[];
  constructor() {
    super();
    const localStorageSyntax = LocalStorageState.get(PLATFORM_TEMPLATE_EDITOR).activeSyntax;
    this.state = {
      pageSource: {
        sourceHash: 0,
        source: '',
        applicableTemplates: [],
        appliedTemplate: undefined,
        includes: [],
      },
      saving: false,
      loading: false,
      activeSyntax: localStorageSyntax !== undefined ? localStorageSyntax : Syntax.HTMLMIXED,
    };

    this.radioGroupEntries = [
      {
        type: Syntax.HTMLMIXED,
        label: 'Mixed HTML',
      },
      {
        type: Syntax.MPHHANDLEBARS,
        label: 'Backend Templates',
      },
      {
        type: Syntax.HANDLEBARS,
        label: 'Client Templates',
      },
      {
        type: Syntax.NONE,
        label: 'None',
      },
    ];
  }

  public componentWillUnmount() {
    if (this.navigationListenerUnsubscribe) {
      this.navigationListenerUnsubscribe();
    }
  }

  public componentDidMount() {
    this.loadPageSource(this.props.iri.value);
  }

  public componentWillReceiveProps(props: PageEditorProps) {
    this.loadPageSource(props.iri.value);
  }

  /**
   * We want to trigger react reconciliation only when we load new page to view or
   * switching between highlight modes.
   */
  public shouldComponentUpdate(nextProps: PageEditorProps, nextState: PageEditorState) {
    if (!_.isEqual(this.props, nextProps)) {
      return true;
    } else {
      return nextState.saving !== this.state.saving ||
        nextState.activeSyntax !== this.state.activeSyntax ||
        nextState.loading !== this.state.loading;
    }
  }

  public render() {
    return D.div(
      {},
      D.div({className: 'page-breadcrumb'}),
      D.div(
        {className: 'page'},
        D.div(
          {className: 'page__body'},
          this.includeLinks(this.state.pageSource.includes),
          // show templates only if current page is empty
          (! this.state.pageSource.source && this.state.pageSource.source.length === 0 )
            ? this.applicableTemplateLinks(
              this.state.pageSource.applicableTemplates,
              this.state.pageSource.appliedTemplate
            )
            : ButtonToolbar(
              {},
              ButtonGroup(
                {},
                'Applicable Templates: This resource does already have a direct ' +
                  'corresponding page and as such no templates will be applied.'
              )
            ),
          ( // show message if system-wide default template is applied
            this.isTemplateApplied(this.props.iri, this.state.pageSource)
              ? ButtonToolbar(
                {},
                ButtonGroup(
                  {},
                  [
                    'None of the computed templates is used. The system\'s default template ',
                    createElement(
                      ResourceLink,
                      {
                        key: 'def',
                        resource: Rdf.iri('Template:' + vocabularies.rdfs.Resource.value),
                        style: { backgroundColor : '#FFC857'},
                      },
                      'Template:rdfs:Resource'
                    ),
                    ' has been applied.',
                  ]
                )
              )
            : null
          ),
          CodeMirror({
            ref: 'editor',
            className: 'template-editor',
            value: this.state.pageSource.source,
            onChange: this.onPageContentChange,
            options: {
              mode: this.getSyntaxMode(this.state.activeSyntax),
              indentWithTabs: false, indentUnit: 2, tabSize: 2,
              viewportMargin: Infinity,
              lineNumbers: true,
              lineWrapping: true,
              foldGutter: this.state.activeSyntax !== Syntax.NONE,
              gutters: this.state.activeSyntax !== Syntax.NONE ?
                ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'] :
                ['CodeMirror-linenumbers'],
              extraKeys: {
                'Ctrl-S': () => this.onSave(),
                'Cmd-S': () => this.onSave(),
              },
              textAreaClassName: ['form-control'],
              matchTags: {bothTags: true},
              matchBrackets: true,
            },
          }),
          this.getSyntaxChoices(),
          ButtonToolbar(
            {className: 'pull-right template-cancel-save'},
            Button({
              bsStyle: 'danger',
              disabled: this.state.saving,
              onClick: this.onCancel,
            }, 'Cancel'),
            Button({
              bsStyle: 'primary',
              onClick: this.onSave,
              disabled: this.state.saving,
            }, this.state.saving ? D.span({},
              'Saving', D.i({className: 'fa fa-cog fa-spin', style: {marginLeft: '5px'}})
            ) : 'Save')
          )
        )
      )
    );
  };

  private isTemplateApplied(iri: Rdf.Iri, pageSource: PageService.TemplateContent) {
    return (
            // current resource is no template
            (!iri.value.startsWith('Template:'))
            &&
            // checks that the applied Template is not within the list of applicable templates
            // which is only the case if it is the default template
            pageSource.applicableTemplates.indexOf(
              pageSource.appliedTemplate
            ) === -1
            &&
            // TODO currently this is hardcoded also in backend
            // should be compare with config
            pageSource.appliedTemplate === 'Template:' + vocabularies.rdfs.Resource.value
    );
  }

  private loadPageSource = (uri) => {
    this.setState({loading: true});
      PageService.PageService.loadTemplateSource(uri).onValue(
        (rawContent: PageService.TemplateContent) =>
        this.setState({pageSource: rawContent, saving: false, loading: false}, () => {
          (this.refs['editor'] as any).focus();
        })
      ).onError(
        (errorCode) => errorCode === 403 ? window.location.href = '/login' : null
      );
  }

  private onPageContentChange = (content) => {
    if (!this.navigationListenerUnsubscribe) {
      this.navigationListenerUnsubscribe =
        navigationConfirmation('Changes you made to the page will not be saved.');
    }
    this.setState(state => {
      state.pageSource.source = content;
      state.saving = false;
      return state;
    });
  }

  private onSave = () => {
    if (this.navigationListenerUnsubscribe) {
      this.navigationListenerUnsubscribe();
    }
    this.setState({pageSource: this.state.pageSource, saving: true});
    PageService.PageService.save(
      this.props.iri.value,
      this.state.pageSource.source,
      this.state.pageSource.sourceHash
    ).onValue(v => {
       this.setState({pageSource: this.state.pageSource, saving: false});
       navigateToResource(this.props.iri).onValue(x => x);
    }).onError( error => {
      const dialogRef = `page-saving-error`;

      getOverlaySystem().show(
          dialogRef,
            createElement(
              OverlayDialog, {
                onHide: () => {
                  getOverlaySystem().hide(dialogRef);
                  this.setState({saving: false});
                },
                type: 'modal',
                title: 'Error while saving the page',
                show: true,
              }, D.div({}),[
                D.div({}, error),
                Button({
                  bsStyle: 'success',
                  className: 'pull-right',
                  onClick: () => {
                    getOverlaySystem().hide(dialogRef);
                    this.setState({saving: false});
                  }
                }, 'Ok')])
        );
    })
  }

  private onCancel = () => {
    navigateToResource(this.props.iri).onValue(x => x);
  }

  private getSyntaxChoices = () => {
    return createElement(
      RadioGroup,
      {
        name: 'syntaxType',
        selectedValue: this.state.activeSyntax,
        onChange: this.onSyntaxChange,
      },
      D.div(
        {className: 'template-types'},
        'Syntax highlight: ',
        _.reduce(this.radioGroupEntries, (result, e: RadioGroupEntry) => {
          result.push(
            D.label(
              {
                key: e.label,
                style: {marginRight: '10px'},
              },
              createElement(Radio, {value: e.type, title: e.label}),
              e.label
            )
          );
          return result;
        }, new Array<ReactElement<any>>())
      )
    );
  }

  private onSyntaxChange  = (value: Syntax) => {
    (this.refs['editor'] as any).codeMirror.setOption('mode', this.getSyntaxMode(value));
    LocalStorageState.update(PLATFORM_TEMPLATE_EDITOR, {activeSyntax: value});
    this.setState({
      activeSyntax: value,
    });
  }

  private getSyntaxMode = (syntax: Syntax): {name: string, base?: string} => {
    let mode;
    switch (syntax) {
      case Syntax.HTMLMIXED:  mode = {name: 'mph-handlebars', base: 'text/html'}; break;
      case Syntax.MPHHANDLEBARS: mode = {name: 'mph-handlebars-tags'}; break;
      case Syntax.HANDLEBARS: mode = {name: 'handlebars'}; break;
      case Syntax.NONE: mode = {name: 'null'}; break;
    }
    return mode;
  }

  private applicableTemplateLinks = (
    templates: string[],
    appliedTemplate: string
  ): ReactElement<any>  => {
    if (templates.length === 0) {
      return D.span({});
    } else {
      return ButtonToolbar({},
        ButtonGroup({}, 'Applicable Templates:'),
        ..._.map(templates, res => {
          const props = (appliedTemplate === res)
            ? {
                style: { backgroundColor : '#FFC857'},
                title: 'This template will currently be applied.',
              }
            : {};
          return ButtonGroup(props,
            createElement(ResourceLink,
              {
                resource: Rdf.iri(res),
                action: ResourceLinkAction.edit
              },
              res
            )
          );
        })
      );
    }
  }

  private includeLinks(includes: string[]): ReactElement<any> {
    if (includes.length === 0) {
      return null;
    } else {
      return ButtonToolbar({},
        ButtonGroup({}, 'Includes:'),
        ..._.map(includes, r =>
          ButtonGroup({},
            createElement(ResourceLink,
                {
                  resource: Rdf.iri(r['@id']),
                  action: ResourceLinkAction.edit
                },
                r['@id']
              )
            )
        )
      );
    }
  }
}

export const PageEditor = createFactory(PageEditorComponent);
export default PageEditorComponent;
