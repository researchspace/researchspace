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

import { createFactory, createElement, Component, CSSProperties } from 'react';
import * as D from 'react-dom-factories';

import * as maybe from 'data.maybe';
import * as _ from 'lodash';
import * as ReactBootstrap from 'react-bootstrap';
import * as Either from 'data.either';
import * as Kefir from 'kefir';
import * as moment from 'moment';
import * as request from 'platform/api/http';
import * as fileSaver from 'file-saver';
import ReactSelectComponent from 'react-select';

import { SparqlClient } from 'platform/api/sparql';
import { PageService, RevisionInfo, TemplateInfo } from 'platform/api/services/page';
import { Table, TableColumnConfiguration } from 'platform/components/semantic/table';
import { TemplateItem } from 'platform/components/ui/template';
import { Error, Alert, AlertType, AlertConfig } from 'platform/components/ui/alert';
import { Spinner } from 'platform/components/ui/spinner';
import { getOverlaySystem } from 'platform/components/ui/overlay';
import { ConfirmationDialog } from 'platform/components/ui/confirmation-dialog';

const ReactSelect = createFactory(ReactSelectComponent);
const Button = createFactory(ReactBootstrap.Button);
const ButtonToolbar = createFactory(ReactBootstrap.ButtonToolbar);

interface PageAdminState {
  isLoading: boolean;
  data?: ReadonlyArray<TemplateInfo>;
  selectedPages?: ReadonlyArray<RevisionInfo>;
  filter?: FILTER;
  alert?: Data.Maybe<AlertConfig>;
  err?: Data.Maybe<string>;
}

enum FILTER {
  NONE, ALL, MODIFIEDTODAY,
}

export class PageManager extends Component<{}, PageAdminState> {
  private filterPool: Kefir.Pool<FILTER>;

  constructor(props: {}, state: PageAdminState) {
    super(props, state);
    this.state = {
      isLoading: true,
      selectedPages: [],
      filter: FILTER.NONE,
      alert: maybe.Nothing<AlertConfig>(),
      err: maybe.Nothing<string>(),
    };
    this.filterPool = Kefir.pool<FILTER>();
    this.filterPool.onValue(v => this.filterPages(v));
  }

  public render() {
    if (this.state.err.isJust) {
      return createElement(TemplateItem, {template: {source: this.state.err.get()}});
    }
    if (this.state.isLoading) {
      return createElement(Spinner);
    }

    return this.getTable();
  }

  public componentWillMount() {
    PageService.getAllTemplateInfos().onValue(
    (res) => {
      this.setState({
        isLoading: false,
        data: res,
      });
    }).onError(err =>
      this.setState({
           isLoading: false,
           err: maybe.Just(err),
         })
    );
  }

  private filterPages = (v: FILTER) => {
      switch (v) {
          case FILTER.ALL: this.filterAll(); break;
          case FILTER.NONE: this.filterNone(); break;
          case FILTER.MODIFIEDTODAY: this.filterModifiedToday(); break;
          default: this.filterNone();
      }
  }

  private filterAll = () => {
    const selected: RevisionInfo[] = [];
    _.forEach(this.state.data, (row) => {
      selected.push(row);
    });
    this.setState({
      selectedPages: selected,
      isLoading: false,
      filter: FILTER.ALL,
    });
  }

  private filterModifiedToday = () => {
    const selected: RevisionInfo[] = [];
    _.forEach(this.state.data, (row) => {
      if (moment(row.date).isSame(moment(), 'day')) {
        selected.push(row);
      }
    });
    this.setState({
      selectedPages: selected,
      isLoading: false,
      filter: FILTER.MODIFIEDTODAY,
    });
  }

  private filterNone = () =>  {
    this.setState({
      selectedPages: [],
      isLoading: false,
      filter: FILTER.NONE,
    });
  }

  private getTable = () => {
    type ColumnConfiguration = TableColumnConfiguration & { variableName: keyof TemplateInfo };
    const columnConfig: ColumnConfiguration[] = [
      {
        variableName: 'iri',
        displayName: 'Page',
        cellTemplate: '<semantic-link iri=\'{{iri}}\' getlabel=false>{{iri}}</semantic-link>',
      },
      {
        variableName: 'appId',
        displayName: 'Source app'
      },
      {
        variableName: 'revision',
        displayName: 'Revision'
      },
      {
        variableName: 'author',
        displayName: 'Creator',
      },
      {
        variableName: 'date',
        displayName: 'Last Modified',
        cellTemplate: '{{dateTimeFormat date \'LLL\'}}',
      },
    ];

    const griddleOptions = {
      // isMultipleSelection: true,
      onRowClick: this.onChange.bind(this),
      resultsPerPage: 10,
      rowMetadata : { 'bodyCssClassName' : this.getRowClass.bind(this)},
    };
    const selectOptions = {
           className: 'dataset-selector__multi-select',
           multi: false,
           options: [
             { value: FILTER.NONE, label: 'None' },
             { value: FILTER.ALL, label: 'All' },
             { value: FILTER.MODIFIEDTODAY, label: 'Modified today' },
           ],
           optionRenderer: (o) => o.label,
           clearable: true,
           allowCreate: false,
           autoload: true,
           clearAllText: 'Remove all',
           clearValueText: 'Remove filter',
           delimiter: '|',
           disabled: false,
           ignoreCase: true,
           matchPos: 'any',
           matchProp: 'any',
           noResultsText: '',
           searchable: false,
           placeholder: 'Filter',
           onChange: this.onFilter,
           value: this.state.filter,
    };
    const rowStyle: CSSProperties = {
        'display': 'flex',
        'alignItems': 'center',
        'marginTop': '10px',
      };

    return D.div(
      {className: 'mph-page-admin-widget', onChange: this.onChange.bind(this)},
      createElement(Table, {
        ref: 'table-ref',
        key: 'table',
        numberOfDisplayedRows: maybe.Just(10) ,
        data: Either.Left<any[], SparqlClient.SparqlSelectResult>(this.state.data as any[]),
        columnConfiguration: columnConfig,
        layout: maybe.Just<{}>(
          { options: griddleOptions, tupleTemplate: maybe.Nothing<string>() }
        ),
      }),
      D.div(
        {className: 'row', style: rowStyle, key: 'selected-pages'},
        D.div({className: 'col-xs-2'}, 'Selected pages: '),
        D.div(
          {className: 'col-xs-4'},
          D.b({}, this.state.selectedPages.length)
        )
      ),
      D.div(
        {className: 'row', style: rowStyle},
        D.div({className: 'col-xs-2', key: '1'}, 'Select pages: '),
        D.div({className: 'col-xs-4', key: '2'}, ReactSelect(selectOptions))
      ),
      createElement(Alert, this.state.alert.map(config => config).getOrElse(
        { alert: AlertType.NONE, message: '' }
      )),
      D.div(
        {className: 'row', style: rowStyle, key: 'actions'},
        D.div({className: 'col-xs-2'}),
        D.div({className: 'col-xs-4'},
          ButtonToolbar({},
            Button({
                type: 'submit',
                bsSize: 'small',
                bsStyle: 'primary',
                onClick: this.onClickExportSelected,
              }, 'Export Selected'),
            Button({
                type: 'submit',
                bsSize: 'small',
                bsStyle: 'primary',
                onClick: this.onClickDeleteSelected,
                disabled: this.state.selectedPages.length === this.state.data.length,
              }, 'Delete Selected')
          )
        )
      )
    );
  }

  private onFilter = (selected: {value: any, label: string}) => {
    const value = _.isEmpty(selected) ? FILTER.NONE : selected.value;
    this.filterPool.plug(Kefir.constant<FILTER>(value));
  }

  private onClickDeleteSelected = () => {
    const dialogRef = 'deletion-confirmation';
    const onHide = () => getOverlaySystem().hide(dialogRef);
    const props = {
      message: 'Do you want to delete the selected templates?',
      onHide,
      onConfirm: confirm => {
        onHide();
        if (confirm) {
          this.deleteSelectedPages();
        }
      },
    };

    getOverlaySystem().show(
      dialogRef,
      createElement(ConfirmationDialog, props)
    );
  }

  private deleteSelectedPages = () => {
    PageService.deleteTemplateRevisions(this.state.selectedPages).onValue(
      (success: boolean) => {
        if (success) {
          window.location.reload();
        }
      }).onError((err) =>
      this.setState({
        isLoading: false,
        alert: maybe.Just(Error(err.response.text)),
      })
    );
  }

  private onClickExportSelected = () => {
    PageService.exportTemplateRevisions(this.state.selectedPages).onValue(
      (res: request.Response) => {
        let filename = '';
        const disposition = res.header['content-disposition'];
        if (disposition && disposition.indexOf('attachment') !== -1) {
            const filenameRegex = /filename[^;=\n]*=((['']).*?\2|[^;\n]*)/;
            const matches = filenameRegex.exec(disposition);
            if (matches != null && matches[1]) {
               filename = matches[1].replace(/['']/g, '');
            }
        }
        const type = res.header['content-type'];
        const blob = new Blob([res['xhr']['response']], { type: type });
        fileSaver.saveAs(blob, filename);
    }).onError((err: string) =>
          this.setState({
            isLoading: false,
            alert: maybe.Just(Error(err)),
          })
      );

  }

  private getRowClass = (data: TemplateInfo): string => {
    const hasPage = this.state.selectedPages.some(info => sameRevision(info, data));
    return hasPage ? 'bg-success' : '';
  }

  private addOrRemoveSelected = (item: RevisionInfo) => {
    let selectedPages = this.state.selectedPages;
    if (selectedPages.some(info => sameRevision(info, item))) {
      selectedPages = selectedPages.filter(info => !sameRevision(info, item));
    } else {
      selectedPages = [...selectedPages, item];
    }
    this.setState({isLoading: false, selectedPages});
  }

  private onChange = (row: { props?: { data: TemplateInfo } } | undefined): void => {
    if (_.isUndefined(row) || _.isUndefined(row.props)) {
      return;
    }
    this.addOrRemoveSelected(row.props.data);
  }

}

function sameRevision(first: RevisionInfo, second: RevisionInfo) {
  return first.appId === second.appId
    && first.iri === second.iri
    && first.revision === second.revision;
}

export default PageManager;
