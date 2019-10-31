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

// import { DOM as D } from 'react'
// import { expect } from 'chai';
// import { OrderedMap, List } from 'immutable';
// import { Nothing, Just } from 'data.maybe';

// import { render } from '../../../../reactTestUtil';
// import * as rdf from '../../../../../main/common/ts/rdf/core/Rdf';
// import { SearchSummary, SearchSummaryComponent } from '../../../../../main/researchspace/ts/components/search/SearchSummary';
// import {
//   Ast, TextClause, Term, TextTerm, RelationClause, ResourceTerm, Clause
// } from '../../../../../main/researchspace/ts/data/search/Model';
// import {
//   Category, Relation
// } from '../../../../../main/researchspace/ts/data/profiles/Model';
// import { Entity } from '../../../../../main/researchspace/ts/data/Common';

// const SEARCH_AST_WITH_TEXT_CLAUSE =
//     Ast({
//       domain: Just(
//         Category({
//           iri: rdf.iri('http://example.com/Example'),
//           label: rdf.literal('Example'),
//           tuple: null
//         })
//       ),
//       clauses: OrderedMap({
//         '0': TextClause({
//           id: '0',
//           term: OrderedMap({
//             '0': TextTerm({
//               id: '0',
//               value: Just('some text')
//             })
//           })
//         })
//       })
//     });

// describe('SearchSummary component', () => {
//   it('summary for empty search', () => {
//     const renderedSearchSummary =
//         render(
//           SearchSummary({
//             search: Ast({
//               domain: Nothing<Category>(),
//               clauses: OrderedMap<Clause>({})
//             })
//           })
//         );

//     const expectedSummary =
//         D.div(
//           {className: 'search-summary'},
//           List.of(
//             D.span({className: 'search-summary__empty'}, 'What do you want to find?')
//           )
//         );

//     expect(renderedSearchSummary).to.be.deep.equal(expectedSummary);
//   });

//   it('summary for selected domain', () => {
//     const renderedSearchSummary =
//         render(
//           SearchSummary({
//             search: Ast({
//               domain: Just(
//                 Category({
//                   iri: rdf.iri('http://example.com/Example'),
//                   label: rdf.literal('Example'),
//                   tuple: null
//                 })
//               ),
//               clauses: OrderedMap<Clause>({})
//             })
//           })
//         );

//     const expectedSummary =
//         D.div(
//           {className: 'search-summary'},
//           List.of(
//             D.span({className: 'search-summary__start'}, 'Find:'),
//             D.span({className: 'search-summary__domain'}, 'examples')
//           )
//         );

//     expect(renderedSearchSummary).to.be.deep.equal(expectedSummary);
//   });

//   it('summary for one text clause', () => {
//     const renderedSearchSummary =
//         render(
//           SearchSummary({
//             search: SEARCH_AST_WITH_TEXT_CLAUSE
//           })
//         );

//     const expectedSummary =
//         D.div(
//           {className: 'search-summary'},
//           List.of(
//             D.span({className: 'search-summary__start'}, 'Find:'),
//             D.span({className: 'search-summary__domain'}, 'examples'),
//             D.span({className: 'search-summary__text-term'}, '"some text"')
//           )
//         );

//     expect(renderedSearchSummary).to.be.deep.equal(expectedSummary);
//   });

//   it('summary for one relation clause with not yet selected relation', () => {
//     const renderedSearchSummary =
//         render(
//           SearchSummary({
//             search: Ast({
//               domain: Just(
//                 Category({
//                   iri: rdf.iri('http://example.com/Example'),
//                   label: rdf.literal('Example'),
//                   tuple: null
//                 })
//               ),
//               clauses: OrderedMap({
//                 '0': RelationClause({
//                   id: '0',
//                   range: Just(
//                     Category({
//                       iri: rdf.iri('http://example.com/Range'),
//                       label: rdf.literal('Range'),
//                       tuple: null
//                     })
//                   ),
//                   relation: Nothing<Relation>(),
//                   term: OrderedMap<ResourceTerm>({})
//                 })
//               })
//             })
//           })
//         );


//     const expectedSummary =
//         D.div(
//           {className: 'search-summary'},
//           List.of(
//             D.span({className: 'search-summary__start'}, 'Find:'),
//             D.span({className: 'search-summary__domain'}, 'examples'),
//             D.span({className: 'search-summary__relation'}, '... related to ...'),
//             D.span({className: 'search-summary__range'}, 'Range')
//           )
//         );

//     expect(renderedSearchSummary).to.be.deep.equal(expectedSummary);
//   });

//   it('text summary for simple search', function() {
//     const search =
//         Ast({
//           domain: Just(
//             Category({
//               iri: rdf.iri('http://example.com/Example'),
//               label: rdf.literal('Example'),
//               tuple: null
//             })
//           ),
//           clauses: OrderedMap({
//             '0': RelationClause({
//               id: '0',
//               range: Just(
//                 Category({
//                   iri: rdf.iri('http://example.com/Range'),
//                   label: rdf.literal('Range'),
//                   tuple: null
//                 })
//               ),
//               relation: Just(
//                 Relation({
//                   iri: rdf.iri('http://example.com/relation'),
//                   label: rdf.literal('has relation to'),
//                   tuple: null,
//                   hasDomain: null,
//                   hasRange: null
//                 })
//               ),
//               term: OrderedMap({
//                 '0': ResourceTerm({
//                   id: '0',
//                   value: Just(
//                     Entity({
//                       iri: rdf.iri('http://example.com/Resource'),
//                       label: rdf.literal('Resource'),
//                       tuple: null
//                     })
//                   )
//                 })
//               })
//             })
//           })
//         })

//     const searchSummary = SearchSummaryComponent.summaryToString(search);
//     const expectedSearchSummary =
//         'Find: examples has relation to Resource';
//     expect(searchSummary).to.be.equal(expectedSearchSummary);
//   });

//   it('text summary for search with text clause', function() {
//     const searchSummary = SearchSummaryComponent.summaryToString(SEARCH_AST_WITH_TEXT_CLAUSE);
//     const expectedSearchSummary =
//         'Find: examples "some text"';
//     expect(searchSummary).to.be.equal(expectedSearchSummary);
//   });
// });
