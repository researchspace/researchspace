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
import { createFactory, createElement, FormEvent, ReactElement } from 'react';
import * as D from 'react-dom-factories';
import { Component } from 'platform/api/components';
import * as ReactBootstrap from 'react-bootstrap';
import { Just, Nothing, fromNullable } from 'data.maybe';
import { Right } from 'data.either';
import * as Kefir from 'kefir';
import * as _ from 'lodash';

import { Rdf, vocabularies } from 'platform/api/rdf';

const { spin } = vocabularies;

import { SparqlClient, SparqlUtil } from 'platform/api/sparql';
import { ResourceLink } from 'platform/api/navigation/components';
import { refresh } from 'platform/api/navigation';
import { getLabels } from 'platform/api/services/resource-label';
import { slugFromName } from 'platform/api/services/ldp';
import { Query, OperationType, QueryService, QueryServiceClass } from 'platform/api/services/ldp-query';
import { QueryTemplateService, QueryTemplateServiceClass } from 'platform/api/services/ldp-query-template';
import { addNotification, ErrorPresenter } from 'platform/components/ui/notification';
import { AutoCompletionInput } from 'platform/components/ui/inputs';

import { Template, Argument, Value } from './QueryTemplateTypes';
import { QueryValidatorComponent } from './QueryValidatorComponent';
import * as QueryTemplateArgumentsComponent from './QueryTemplateArgumentsComponent';
import React = require('react');

const Well = createFactory(ReactBootstrap.Well);
const FormGroup = createFactory(ReactBootstrap.FormGroup);
const FormControl = createFactory(ReactBootstrap.FormControl);
const ControlLabel = createFactory(ReactBootstrap.ControlLabel);
const HelpBlock = createFactory(ReactBootstrap.HelpBlock);
const Button = createFactory(ReactBootstrap.Button);
const Radio = createFactory(ReactBootstrap.Radio);

const QueryValidator = createFactory(QueryValidatorComponent);

const QUERY_OPTIONS: Array<{ value: EditMode; label: string }> = [
  { value: 'create', label: 'Create new query' },
  { value: 'update', label: 'Update query' },
  { value: 'reference', label: 'Reference existing query' },
];

const SELECT_TEMPLATE_COUNT_QUERY = `PREFIX spin: <http://spinrdf.org/spin#>
SELECT (COUNT(?template) as ?templateCount) WHERE {
  ?template spin:body ?query
}`;

export interface QueryTemplateProps {
  /** IRI of an existing template to edit. */
  iri?: string;
  /** Initial value for query body when creating a new template. */
  defaultQuery?: string;
  /** Namespace prefix for generated IRIs of templates, queries and arguments. */
  namespace?: string;
  /** Autosuggestion query to choose template categories, e.g from a skos list of terms. */
  categorySuggestionQuery?: string;
  /** Default query to choose template categories, e.g from a skos list of terms. */
  categoryDefaultQuery?: string;
}

type EditMode = 'create' | 'update' | 'reference';

interface State {
  identifier?: Data.Maybe<Value>;
  label?: Data.Maybe<Value>;
  description?: Data.Maybe<Value>;
  /**
   * Category bindings:
   *   'iri' - category IRI
   */
  categories?: ReadonlyArray<SparqlClient.Binding>;
  selectQuery?: EditMode;
  query?: Query;
  variables?: string[];
  args?: Data.Either<Argument, Argument>[];
  queryIri?: string;
  existingQueryIri?: string;
  templateCount?: number;
  template?: Data.Maybe<Template>;
  inProgress?: boolean;
}

export class QueryTemplate extends Component<QueryTemplateProps, State> {
  static readonly defaultProps: Partial<QueryTemplateProps> = {
    categorySuggestionQuery: `
      PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
      SELECT DISTINCT ?iri ?label WHERE {
        ?iri a skos:Concept ;
          rdfs:label ?label .
        FILTER(REGEX(STR(?label), $__token__, \"i\")) .
      }
    `,
    categoryDefaultQuery: `
      PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
      SELECT DISTINCT ?iri ?label WHERE {
        ?iri a skos:Concept ;
          rdfs:label ?label .
      } LIMIT 10
    `,
  };

  private identifier = Kefir.pool<string>();
  private label = Kefir.pool<string>();
  private description = Kefir.pool<string>();
  private args = Kefir.pool<Data.Either<Argument, Argument>[]>();
  private query = Kefir.pool<Query>();

  private queryTemplateService: QueryTemplateServiceClass;
  private queryService: QueryServiceClass;

  constructor(props: QueryTemplateProps, context: any) {
    super(props, context);
    const semanticContext = this.context.semanticContext;
    this.queryTemplateService = QueryTemplateService(semanticContext);
    this.queryService = QueryService(semanticContext);
    this.state = {
      identifier: Nothing<Value>(),
      label: Nothing<Value>(),
      description: Nothing<Value>(),
      categories: [],
      selectQuery: 'create',
      query: undefined,
      variables: [],
      args: [],
      template: Nothing<Template>(),
      inProgress: false,
    };
  }

  componentWillMount() {
    this.initPool();
  }

  componentDidMount() {
    if (this.isUpdateMode()) {
      this.fetchTemplate(this.props.iri);
    } else if (this.props.defaultQuery) {
      SparqlUtil.parseQueryAsync(this.props.defaultQuery).onValue((q) => {
        const queryType: OperationType = q.type === 'update' ? 'UPDATE' : q.queryType;
        this.query.plug(
          Kefir.constant({
            value: this.props.defaultQuery,
            type: q.type,
            queryType: queryType,
            label: '',
          })
        );
      });
    }
  }

  private fetchTemplate = (iri: string) => {
    this.queryTemplateService
      .getQueryTemplate(Rdf.iri(iri))
      .flatMap(this.getQueryTemplateCount)
      .onValue(({ template, queryIri, templateCount }) => {
        const { identifier, label, description, args } = template;
        // TODO
        // fetch labels for existing category IRIs
        getLabels(template.categories)
          .map((labels) =>
            labels
              .map(
                (categoryLabel, categoryIri): SparqlClient.Dictionary<Rdf.Node> => ({
                  iri: categoryIri,
                  label: Rdf.literal(categoryLabel),
                })
              )
              .toArray()
          )
          .onValue((categories) =>
            this.setState({ queryIri, templateCount, categories, selectQuery: 'update' }, () => {
              this.identifier.plug(Kefir.constant(identifier));
              this.label.plug(Kefir.constant(label));
              this.description.plug(Kefir.constant(description));
              args.forEach((arg, index) => {
                this.setArgument(Right<Argument, Argument>(arg), index);
              });
            })
          );
      });
  };

  private getQueryTemplateCount = ({
    template,
    queryIri,
  }: {
    template: Template;
    queryIri: string;
  }): Kefir.Property<{ template: Template; queryIri: string; templateCount: number }> => {
    const query = SparqlClient.setBindings(SparqlUtil.parseQuery(SELECT_TEMPLATE_COUNT_QUERY), {
      query: Rdf.iri(queryIri),
    });
    const context = this.context.semanticContext;
    return SparqlClient.select(query, { context: context }).map((res) => {
      return {
        template: template,
        queryIri: queryIri,
        templateCount: parseInt(res.results.bindings[0]['templateCount'].value),
      };
    });
  };

  private isUpdateMode = (): boolean => {
    return !!this.props.iri;
  };

  private getTemplateTypeForQuery = (q: Query): Rdf.Iri => {
    if (q.type === 'update') {
      return spin.UpdateTemplate;
    } else {
      switch (q.queryType) {
        case 'SELECT':
          return spin.SelectTemplate;
        case 'CONSTRUCT':
          return spin.ConstructTemplate;
        case 'ASK':
          return spin.AskTemplate;
        default:
          return spin.SelectTemplate;
      }
    }
  };

  private initPool = () => {
    const identifierMapped = this.identifier.flatMap<Value>(this.validateInputField);
    identifierMapped
      .onValue((v) => this.setState({ identifier: Just(v) }))
      .onError((v) => this.setState({ identifier: Just(v), template: Nothing<Template>() }));

    const labelMapped = this.label.flatMap<Value>(this.validateInputField);
    labelMapped
      .onValue((v) => this.setState({ label: Just(v) }))
      .onError((v) => this.setState({ label: Just(v), template: Nothing<Template>() }));

    const descriptionMapped = this.description.flatMap<Value>(this.validateInputField);
    descriptionMapped
      .onValue((v) => this.setState({ description: Just(v) }))
      .onError((v) => this.setState({ description: Just(v), template: Nothing<Template>() }));

    const argsMapped = this.args.flatMap<Data.Either<Argument, Argument>[]>(this.validateArguments);
    argsMapped.onError((v) => this.setState({ template: Nothing<Template>() }));

    const queryMapped = this.query;
    queryMapped
      .onValue((v) => this.setState({ query: v }))
      .onError((v) => this.setState({ query: v, template: Nothing<Template>() }));

    Kefir.combine(
      {
        identifier: identifierMapped
          .map((v) => v.value)
          .toProperty(() => {
            if (this.state.identifier.isJust) {
              return this.state.identifier.get().value;
            }
          }),
        label: labelMapped
          .map((v) => v.value)
          .toProperty(() => {
            if (this.state.label.isJust) {
              return this.state.label.get().value;
            }
          }),
        description: descriptionMapped
          .map((v) => v.value)
          .toProperty(() => {
            if (this.state.description.isJust) {
              return this.state.description.get().value;
            }
          }),
        args: argsMapped.toProperty(() => this.state.args),
        query: queryMapped.toProperty(() => this.state.query),
      },
      ({ identifier, label, description, args, query }) => {
        if (!identifier || !label || !description || !query) {
          return;
        }

        const categories = this.state.categories.map(({ iri }) => {
          if (!iri.isIri()) {
            throw new Error('Query template category is expected to be an IRI');
          }
          return iri;
        });

        const templateType = this.getTemplateTypeForQuery(query);

        const template = {
          templateType,
          identifier,
          label,
          description,
          categories,
          args: args.map((arg) => {
            return arg.get();
          }),
        };

        this.setState({ template: Just(template) });

        return {};
      }
    ).onValue((o) => o);
  };

  private validateInputField = (v: string): Kefir.Property<Value> => {
    if (v.length < 1) {
      return Kefir.constantError<Value>({
        value: v,
        error: new Error('Please fill out this field.'),
      });
    }
    return Kefir.constant<Value>({ value: v });
  };

  private validateArguments = (
    v: Data.Either<Argument, Argument>[]
  ): Kefir.Property<Data.Either<Argument, Argument>[]> => {
    const errorArgs = v.filter((arg) => {
      return arg.isLeft;
    });

    if (errorArgs.length) {
      return Kefir.constantError<Data.Either<Argument, Argument>[]>(v);
    }
    return Kefir.constant<Data.Either<Argument, Argument>[]>(v);
  };

  private addArgument = (arg) => {
    this.setState(
      (prevState) => {
        const args = prevState.args.slice();
        args.push(arg);
        return { args };
      },
      () => this.args.plug(Kefir.constant(this.state.args))
    );
  };

  private deleteArgument = (index) => {
    this.setState(
      (prevState) => {
        const args = prevState.args.slice();
        args.splice(index, 1);
        return { args };
      },
      () => this.args.plug(Kefir.constant(this.state.args))
    );
  };

  private setArgument = (arg: Data.Either<Argument, Argument>, index: number) => {
    this.setState(
      (prevState) => {
        const args = prevState.args.slice();
        args.splice(index, 1, arg);
        return { args };
      },
      () => this.args.plug(Kefir.constant(this.state.args))
    );
  };

  private createQuery = (): Kefir.Property<string> => {
    return this.queryService.addItem(this.state.query).map((iri) => iri.value);
  };

  private updateQuery = (): Kefir.Property<{}> => {
    const iri = Rdf.iri(this.state.queryIri);
    return this.queryService.updateItem(iri, this.state.query);
  };

  private onSaveError = (er: Error) => {
    this.setState({ inProgress: false });
    addNotification(
      {
        title: 'Error!',
        children: (
          <div>
            An error has occurred while template saving.
            <ErrorPresenter error={er} />
          </div>
        ),
        level: 'error',
      },
      er
    );
  };

  private onUpdateSuccess = () => {
    this.setState({ inProgress: false });
    addNotification({
      title: 'Success!',
      message: 'Template updated successfully',
      level: 'success',
    });
    refresh();
  };

  private onUpdateError = (er: Error) => {
    this.setState({ inProgress: false });
    addNotification(
      {
        title: 'Error!',
        children: (
          <div>
            An error has occurred while template updating.
            <ErrorPresenter error={er} />
          </div>
        ),
        level: 'error',
      },
      er
    );
  };

  private createTemplate = () => {
    const { namespace } = this.props;
    const { selectQuery, existingQueryIri, template } = this.state;

    this.setState({ inProgress: true });

    if (selectQuery === 'create') {
      this.createQuery()
        .flatMap((iri) => this.queryTemplateService.addItem(template.get(), iri, namespace))
        .onValue((iri: Rdf.Iri) => {
          refresh();
        })
        .onError(this.onSaveError);
    } else if (selectQuery === 'reference') {
      this.queryTemplateService
        .addItem(template.get(), existingQueryIri, namespace)
        .onValue((iri: Rdf.Iri) => {
          refresh();
        })
        .onError(this.onSaveError);
    }
  };

  private updateTemplate = () => {
    const { namespace } = this.props;
    const { selectQuery, queryIri, existingQueryIri, template } = this.state;

    const iri = Rdf.iri(this.props.iri);

    this.setState({ inProgress: true });

    if (selectQuery === 'create') {
      this.createQuery()
        .flatMap((qIri) => {
          return this.queryTemplateService.updateItem(iri, template.get(), qIri, namespace);
        })
        .onValue(this.onUpdateSuccess)
        .onError(this.onUpdateError);
    } else if (selectQuery === 'update') {
      this.updateQuery()
        .flatMap(() => {
          return this.queryTemplateService.updateItem(iri, template.get(), queryIri, namespace);
        })
        .onValue(this.onUpdateSuccess)
        .onError(this.onUpdateError);
    } else if (selectQuery === 'reference') {
      this.queryTemplateService
        .updateItem(iri, template.get(), existingQueryIri, namespace)
        .onValue(this.onUpdateSuccess)
        .onError(this.onUpdateError);
    }
  };

  private onChangeQuery = (query: Query, isValid: boolean) => {
    if (isValid) {
      this.query.plug(Kefir.constant(query));
    } else {
      this.query.plug(Kefir.constantError(query));
    }
  };

  private getValidationState = (value: Data.Maybe<Value>): 'success' | 'warning' | 'error' => {
    if (value.isJust && value.get().error) {
      return 'error';
    }
  };

  private getQuerySection = (): ReactElement<any> => {
    const { selectQuery, queryIri, existingQueryIri, templateCount } = this.state;
    if (selectQuery === 'create') {
      return QueryValidator({
        query: this.state.query,
        onChange: this.onChangeQuery,
        onChangeVariables: (v) => this.setState({ variables: v }),
      });
    } else if (selectQuery === 'update') {
      return D.div(
        {},
        templateCount > 1
          ? HelpBlock(
              {},
              `* This query is used in ${templateCount}
             templates and inline editing is disabled. Click `,
              createElement(
                ResourceLink,
                {
                  resource: Rdf.iri('http://www.researchspace.org/resource/admin/EditBaseQuery'),
                  params: { queryiri: queryIri },
                },
                'here'
              ),
              ' to edit the query.'
            )
          : null,
        QueryValidator({
          iri: queryIri,
          viewOnly: templateCount > 1,
          onChange: this.onChangeQuery,
          onChangeVariables: (v) => this.setState({ variables: v }),
        })
      );
    } else if (selectQuery === 'reference') {
      const autoComplete = createElement(AutoCompletionInput, {
        query: `PREFIX bds: <http://www.bigdata.com/rdf/search#>
               PREFIX prov: <http://www.w3.org/ns/prov#>
                SELECT ?iri ?label ?text ?modified  WHERE {
                  ?iri a sp:Query ;
                    sp:text ?text;
                    prov:generatedAtTime ?modified;
                    rdfs:label ?label;
                    prov:wasAttributedTo ?user.
                  FILTER(
                    ?user in (<http://www.researchspace.org/resource/user/querycatalog>,?__useruri__)
                  )
                  SERVICE bds:search {
                                  ?label bds:search \"*?token*\" ;
                                    bds:relevance ?score .
                                }
                } ORDER BY DESC(?score)  LIMIT 20
                `,
        defaultQuery: `PREFIX prov: <http://www.w3.org/ns/prov#>
              SELECT ?iri ?label ?text ?modified WHERE {
                  ?iri a sp:Query;
                    sp:text ?text;
                    prov:generatedAtTime ?modified;
                    prov:wasAttributedTo ?user.
                  FILTER(
                    ?user in (<http://www.researchspace.org/resource/user/querycatalog>,?__useruri__)
                  )
                  OPTIONAL {?iri rdfs:label ?label}
                } ORDER BY DESC(?modified) LIMIT 10`,
        placeholder: 'Select query...',
        templates: {
          suggestion: `<mp-popover title="{{iri.value}}">
                  <mp-popover-trigger placement="top"trigger='["hover","focus"]'>
                    <span>{{label.value}} ({{dateTimeFormat modified.value "LLL"}})</span>
                  </mp-popover-trigger>
                  <mp-popover-content style="background:white;">
                      <div>{{text.value}}</div>
                  </mp-popover-content>
              </mp-popover>`,
        },
        actions: {
          onSelected: (res) => {
            if (res) {
              this.setState({ existingQueryIri: res['iri'].value });
            } else {
              this.setState({ existingQueryIri: undefined, variables: [] }, () => {
                const query = {
                  label: '',
                  value: '',
                  type: '',
                  queryType: '',
                } as Query;
                this.query.plug(Kefir.constantError(query));
              });
            }
          },
        },
      });
      return D.div(
        {},
        FormGroup({}, D.div({}, autoComplete)),
        existingQueryIri
          ? QueryValidator({
              iri: existingQueryIri,
              viewOnly: true,
              onChange: this.onChangeQuery,
              onChangeVariables: (v) => this.setState({ variables: v }),
            })
          : null
      );
    } else {
      return null;
    }
  };

  public render() {
    const {
      identifier,
      label,
      description,
      selectQuery,
      query,
      args,
      variables,
      existingQueryIri,
      template,
      inProgress,
    } = this.state;

    // TODO
    // we keep this invisible in edit mode
    // until we have clean-up the identifiers
    const identifierField = this.isUpdateMode()
      ? null
      : FormGroup(
          { validationState: this.getValidationState(identifier) },
          ControlLabel({}, 'Preferred Identifier*'),
          FormControl({
            type: 'text',
            value: identifier.isJust ? identifier.get().value : '',
            onChange: (e) => this.identifier.plug((e.currentTarget as any).value),
            disabled: this.isUpdateMode(),
          }),
          this.getValidationState(identifier) === 'error' ? HelpBlock({}, identifier.get().error.message) : null
        );

    const labelField = FormGroup(
      { validationState: this.getValidationState(label) },
      ControlLabel({}, 'Label*'),
      FormControl({
        type: 'text',
        value: label.isJust ? label.get().value : '',
        onChange: this.onLabelChanged,
      }),
      this.getValidationState(label) === 'error' ? HelpBlock({}, label.get().error.message) : null
    );

    const descriptionField = FormGroup(
      { validationState: this.getValidationState(description) },
      ControlLabel({}, 'Description*'),
      FormControl({
        componentClass: 'textarea',
        style: { resize: 'vertical' },
        value: description.isJust ? description.get().value : '',
        onChange: this.onDescriptionChanged,
      }),
      this.getValidationState(description) === 'error' ? HelpBlock({}, description.get().error.message) : null
    );

    const selectQueryOptions = this.isUpdateMode()
      ? QUERY_OPTIONS
      : QUERY_OPTIONS.filter((item) => {
          return item.value !== 'update';
        });

    const selectQueryField = FormGroup(
      {},
      selectQueryOptions.map((opt) =>
        Radio(
          {
            key: opt.value,
            name: 'mode',
            value: opt.value,
            inline: true,
            checked: opt.value === selectQuery,
            onChange: (e) => e,
            onClick: (e) => {
              const target = e.target as HTMLInputElement;
              if (selectQuery !== target.value) {
                this.setState({ selectQuery: target.value as EditMode, variables: [] }, () => {
                  const query = {
                    label: '',
                    value: '',
                    type: '',
                    queryType: '',
                  } as Query;
                  this.query.plug(Kefir.constantError(query));
                });
              }
            },
          },
          opt.label
        )
      )
    );

    const querySection = this.getQuerySection();

    const disableSave =
      template.isNothing ||
      inProgress ||
      (existingQueryIri === undefined && (query === undefined || query.value === undefined));

    return D.div(
      {},
      labelField,
      identifierField,
      descriptionField,
      this.renderCategoriesField(),
      ControlLabel({}, 'Query*'),
      Well({}, selectQueryField, querySection),
      QueryTemplateArgumentsComponent.factory({
        args,
        variables,
        onAdd: this.addArgument,
        onDelete: this.deleteArgument,
        onChange: this.setArgument,
      }),
      Button(
        {
          bsStyle: 'success',
          disabled: disableSave,
          onClick: this.isUpdateMode() ? this.updateTemplate : this.createTemplate,
        },
        this.isUpdateMode() ? 'Update' : 'Save'
      )
    );
  }

  private renderCategoriesField() {
    if (!this.props.categorySuggestionQuery) {
      return null;
    }

    return FormGroup(
      {},
      ControlLabel({}, 'Categories'),
      createElement(AutoCompletionInput, {
        query: this.props.categorySuggestionQuery,
        defaultQuery: this.props.categoryDefaultQuery,
        placeholder: 'Select categories',
        multi: true,
        value: this.state.categories,
        actions: {
          onSelected: (bindings) => {
            const categories = bindings as ReadonlyArray<SparqlClient.Binding>;
            this.setState({ categories }, () => {
              // FIXME: get rid of all pools
              // This is a hack to trigger template generation
              if (this.state.label.isJust) {
                this.label.plug(Kefir.constant(this.state.label.get().value));
              }
            });
          },
        },
      })
    );
  }

  private onLabelChanged = (e: FormEvent<ReactBootstrap.FormControl>) => {
    const oldSource = this.state.label.map((old) => old.value);
    const newSource = (e.currentTarget as any).value;

    const newIdentifier = mapIfCorresponds({
      oldSource,
      newSource,
      oldTarget: this.state.identifier.map(({ value }) => value),
      mapping: slugFromName,
    });
    const newDescription = mapIfCorresponds({
      oldSource,
      newSource,
      oldTarget: this.state.description.map(({ value }) => value),
    });
    const newQueryLabel = mapIfCorresponds({
      oldSource,
      newSource,
      oldTarget: fromNullable(this.state.query).map((query) => query.label),
    });

    this.label.plug(Kefir.constant(newSource));
    if (newIdentifier.isJust) {
      // autofill identifier based on template label
      this.identifier.plug(Kefir.constant(newIdentifier.get()));
    }
    if (newDescription.isJust) {
      // autofill template description based on template label
      this.description.plug(Kefir.constant(newDescription.get()));
    }
    if (newQueryLabel.isJust) {
      // autofill query description based on template label
      this.query.plug(
        Kefir.constant({
          ...this.state.query,
          label: newQueryLabel.get(),
        })
      );
    }
  };

  private onDescriptionChanged = (e: FormEvent<ReactBootstrap.FormControl>) => {
    const oldSource = this.state.description.map((old) => old.value);
    const newSource = (e.currentTarget as any).value;

    const newQueryLabel = mapIfCorresponds({
      oldSource,
      newSource,
      oldTarget: fromNullable(this.state.query).map((query) => query.label),
    });

    this.description.plug(Kefir.constant(newSource));
    if (newQueryLabel.isJust) {
      // autofill query description based on template description
      this.query.plug(
        Kefir.constant({
          ...this.state.query,
          label: newQueryLabel.get(),
        })
      );
    }
  };
}

function mapIfCorresponds(params: {
  oldSource: Data.Maybe<string>;
  oldTarget: Data.Maybe<string>;
  newSource: string;
  mapping?: (source: string) => string;
}): Data.Maybe<string> {
  const { oldSource, newSource, mapping = (v: string) => v } = params;
  const oldTarget = params.oldTarget.getOrElse(undefined);
  const generateTarget =
    !oldTarget ||
    params.oldSource
      .map(mapping)
      .map((mapped) => oldTarget === mapped)
      .getOrElse(false);
  return generateTarget ? Just(mapping(newSource)) : Nothing<string>();
}

export default QueryTemplate;
