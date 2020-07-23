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

import * as maybe from 'data.maybe';
import * as Kefir from 'kefir';

import { Rdf, vocabularies } from 'platform/api/rdf';
import { Template, Argument } from 'platform/components/query-editor';
import { LdpService, LdpServiceContext } from './ldp';
import { includes } from 'lodash';

const { VocabPlatform, xsd, rdf, rdfs, spl, spin, dct } = vocabularies;

const DEFAULT_NAMESPACE = 'http://www.researchspace.org/query/';
const CATEGORIES_PREDICATE = dct.subject;

export class QueryTemplateServiceClass extends LdpService {
  public addItem(template: Template, queryIri: string, namespace: string): Kefir.Property<{}> {
    const graph = this.createGraph(template, queryIri, namespace);
    return this.addResource(graph, maybe.Just(template.identifier));
  }

  public updateItem(iri: Rdf.Iri, template: Template, queryIri: string, namespace: string): Kefir.Property<{}> {
    const graph = this.createGraph(template, queryIri, namespace);

    return this.update(iri, graph);
  }

  private createGraph(template: Template, queryIri: string, namespace = DEFAULT_NAMESPACE): Rdf.Graph {
    const { identifier, label, description, args } = template;
    const subject = Rdf.iri('');

    const argsTriples = args.map((arg, index) => {
      const argIri = Rdf.iri(namespace + identifier + '/arg/' + index);

      const triples = [
        Rdf.triple(subject, spin.constraintProp, argIri),
        Rdf.triple(argIri, rdf.type, spl.Argument),
        Rdf.triple(argIri, rdfs.label, Rdf.literal(arg.label)),
        Rdf.triple(argIri, spl.predicateProp, Rdf.iri(namespace + identifier + '/predicate/' + arg.variable)),
        Rdf.triple(argIri, spl.valueTypeProp, Rdf.iri(arg.valueType)),
      ];

      if (arg.defaultValue) {
        triples.push(Rdf.triple(argIri, spl.defaultValue, arg.defaultValue));
      }

      // serialize default to false i.e. by default values should not be optional
      const optional = arg.optional !== undefined ? arg.optional : false;
      triples.push(Rdf.triple(argIri, spl.optionalProp, Rdf.literal(optional, xsd.boolean)));

      if (arg.comment !== undefined) {
        triples.push(Rdf.triple(argIri, rdfs.comment, Rdf.literal(arg.comment)));
      }
      return triples;
    });

    const mergedArgsTriples: Rdf.Triple[] = [].concat.apply([], argsTriples);
    const categories = template.categories.map((category) => Rdf.triple(subject, CATEGORIES_PREDICATE, category));

    return Rdf.graph([
      Rdf.triple(subject, rdf.type, spin.Template),
      Rdf.triple(subject, rdf.type, template.templateType),
      Rdf.triple(subject, rdfs.label, Rdf.literal(label)),
      Rdf.triple(subject, rdfs.comment, Rdf.literal(description)),
      Rdf.triple(subject, spin.bodyProp, Rdf.iri(queryIri)),
      ...mergedArgsTriples,
      ...categories,
    ]);
  }

  public getQueryTemplate(iri: Rdf.Iri): Kefir.Property<{ template: Template; queryIri: string }> {
    return this.get(iri).map((graph) => this.parseGraphToQueryTemplate(iri, graph));
  }

  private parseGraphToQueryTemplate(iri: Rdf.Iri, graph: Rdf.Graph): { template: Template; queryIri: string } {
    const templateTypes = [spin.AskTemplate, spin.SelectTemplate, spin.ConstructTemplate, spin.UpdateTemplate].map(
      (qt) => qt.value
    );
    const templateType = graph.triples.find((t) => t.p.equals(rdf.type) && includes(templateTypes, t.o.value))
      .o as Rdf.Iri;

    const argsIris = graph.triples
      .filter((t) => t.s.equals(iri) && t.p.equals(spin.constraintProp))
      .toArray()
      .map((item) => item.o);

    const args = argsIris.map(
      (item): Argument => {
        const label = graph.triples.find((t) => t.s.equals(item) && t.p.equals(rdfs.label)).o.value;
        const variable = graph.triples.find((t) => t.s.equals(item) && t.p.equals(spl.predicateProp)).o.value;
        const comment = graph.triples.find((t) => t.s.equals(item) && t.p.equals(rdfs.comment)).o.value;
        const optional = graph.triples.find((t) => t.s.equals(item) && t.p.equals(spl.optionalProp));
        const valueType = graph.triples.find((t) => t.s.equals(item) && t.p.equals(spl.valueTypeProp)).o.value;
        const defaultValue = graph.triples.find((t) => t.s.equals(item) && t.p.equals(spl.defaultValue));

        return {
          label: label,
          variable: this.extractValueFromIri(variable),
          comment: comment,
          valueType: valueType,
          defaultValue: defaultValue ? defaultValue.o : undefined,
          optional: optional ? optional.o.value === 'true' : false,
        };
      }
    );

    const template: Template = {
      templateType: templateType,
      identifier: this.extractValueFromIri(iri.value),
      label: graph.triples.find((t) => t.s.equals(iri) && t.p.equals(rdfs.label)).o.value,
      description: graph.triples.find((t) => t.s.equals(iri) && t.p.equals(rdfs.comment)).o.value,
      categories: graph.triples
        .filter((t) => t.s.equals(iri) && t.p.equals(CATEGORIES_PREDICATE) && t.o.isIri())
        .map((t) => t.o as Rdf.Iri)
        .toArray(),
      args: args,
    };

    const queryIri = graph.triples.find((t) => t.s.equals(iri) && t.p.equals(spin.bodyProp)).o.value;

    return { template, queryIri };
  }

  /**
   * Return substring after last '/'
   */
  private extractValueFromIri(iri: string): string {
    return /[^/]*$/.exec(iri)[0];
  }
}

export const QueryTemplateService = function (context: LdpServiceContext) {
  return new QueryTemplateServiceClass(VocabPlatform.QueryTemplateContainer.value, context);
};
