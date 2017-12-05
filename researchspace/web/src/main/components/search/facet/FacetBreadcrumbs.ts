/*
 * Copyright (C) 2015-2017, © Trustees of the British Museum
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

/**
 * @author Artem Kozlov <ak@metaphacts.com>
 */

// import { Component, DOM as D, ReactElement, createFactory } from 'react';
// import * as classNames from 'classnames';
// import * as maybe from 'data.maybe';
// import * as hash from 'object-hash';
// import Immutable = require('immutable');

// import * as Rdf from '../../../../common/ts/rdf/core/Rdf';

// import { Ast, Conjunct, Term, ResourceTerm } from '../../data/facet/Model';
// import { Entity } from '../../data/Common';

// export interface FacetBreadcrumbsProps {
//   ast: Ast
//   actions: {
//     removeConjunct: (relation: Conjunct) => void
//   }
// }

// export class FacetBreadcrumbsComponent extends Component<FacetBreadcrumbsProps, {}> {

//   render() {
//     var facetBreadcrumbs = this.props.ast.get('conjuncts').isEmpty() == false;
//     return D.div(
//       {
//         className: classNames({
//           'facet-breadcrumbs': facetBreadcrumbs
//         }),
//       },
//       this.props.ast.get('conjuncts').valueSeq().map(
//         this.breadcrumb.bind(this)
//       )
//     )
//   }

//   private breadcrumb(conjunct: Conjunct) {
//     var disjuncts =
//         conjunct.get('disjuncts').map(
//         this.disjunct.bind(this)
//      ).map(
//        elem =>
//            Immutable.List.of(
//              elem,
//              D.div({className: 'facet-breadcrumbs__conjunct__or'}, 'or')
//            )
//      ).flatten().butLast();

//     return D.div(
//       {className: 'facet-breadcrumbs__conjunct'},
//       D.div(
//         {className: 'facet-breadcrumbs__conjunct__relation'},
//         conjunct.get('relation').label.value
//       ),
//       disjuncts,
//       D.button(
//         {
//           className: 'facet-breadcrumbs__conjunct__cancel-button',
//           onClick: () => this.props.actions.removeConjunct(conjunct)
//         },
//         D.i({})
//       )
//     );
//   }

//   private disjunct(disjunct: Term): ReactElement<any> {
//     if(disjunct instanceof ResourceTerm) {
//       return this.resourceTermDisjunct(<ResourceTerm>disjunct)
//     } else {
//       return D.div({}, 'unknown facet term');
//     }
//   }

//   private resourceTermDisjunct(disjunct: ResourceTerm) {
//     return D.div(
//       {className: 'facet-breadcrumbs__conjunct__disjunct'},
//       disjunct.value.label.value
//     )
//   }
// }

// export const FacetBreadcrumbs = createFactory(FacetBreadcrumbsComponent);
// export default FacetBreadcrumbs;
