/**
 * ResearchSpace
 * Copyright (C) 2015-2020, © Trustees of the British Museum
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

// import { use, expect } from 'chai';
// import { Set } from 'immutable';
// import * as sinon from 'sinon';
// import * as uuid from 'uuid';

// import * as chaiString from 'chai-string';
// use(chaiString);

// import { crm } from '../../../../../main/researchspace/ts/data/vocabularies/vocabularies';
// import { pg, triple, iri, literal } from '../../../../../main/common/ts/rdf/core/Rdf';
// import { Entity } from '../../../../../main/researchspace/ts/data/Common';
// import * as A from '../../../../../main/researchspace/ts/data/assertions/Model';
// import { evaluateBeliefs, evalBelief } from '../../../../../main/researchspace/ts/data/assertions/AssertionsStore';
// import { serialize } from '../../../../../main/common/ts/rdf/formats/turtle';

// var uuidCounter = 0;
// sinon.stub(uuid, "v4", function() {
//   uuidCounter = uuidCounter + 1
//   return uuidCounter;
// });

// const badge = iri('http://hdl.handle.net/10934/RM0001.COLLECT.11');
// const badgeEntity = Entity({
//   iri: badge,
//   label: literal('Esperanto Badge'),
//   tuple: {}
// });
// const plastic = iri('http://hdl.handle.net/10934/plastic');
// const metal = iri('http://hdl.handle.net/10934/metaal');
// const paper = iri('http://hdl.handle.net/10934/paper');

// const fieldInstanceIri =
//     iri('http://hdl.handle.net/10934/RM0001.COLLECT.11/ProductionMaterial/UUID');

// describe('assertions store', () => {
//   it('merge truth belief values', () => {
//     const evaluated =
//         evaluateBeliefs(
//           Set.of(
//             A.Belief({
//               propositionSet: {
//                 metadata: {
//                   fieldDefinition: <any>{
//                     label: 'consists of'
//                   },
//                   fieldValue: Set.of({
//                     value: plastic,
//                     label: 'plastic'
//                   })
//                 },
//                 propositions: Set.of(
//                   triple(badge, crm.P45_consists_of, plastic)
//                 )
//               },
//               beliefValue: true
//             }),
//             A.Belief({
//               propositionSet: {
//                 metadata: {
//                   fieldDefinition: <any>{
//                     label: 'consists of'
//                   },
//                   fieldValue: Set.of({
//                     value: metal,
//                     label: 'metal'
//                   })
//                 },
//                 propositions: Set.of(
//                   triple(badge, crm.P45_consists_of, metal)
//                 )
//               },
//               beliefValue: true
//             })
//           )
//         );

//     const mergedBeliefs =
//         evaluateBeliefs(
//           Set.of(
//             A.Belief({
//               propositionSet: {
//                 propositions: Set.of(
//                   triple(badge, crm.P45_consists_of, plastic),
//                   triple(badge, crm.P45_consists_of, metal)
//                 ),
//                 metadata: {
//                   fieldDefinition: <any>{
//                     label: 'consists of'
//                   },
//                   fieldValue: Set.of(
//                     {
//                       value: plastic,
//                       label: 'plastic'
//                     },
//                     {
//                       value: metal,
//                       label: 'metal'
//                     }
//                   )
//                 }
//               },
//               beliefValue: true
//             })
//           )
//         );

//     expect(evaluated).to.be.deep.equal(mergedBeliefs);
//   })

//   it('merge belief values', () => {
//     const evaluated =
//         evaluateBeliefs(
//           Set.of(
//             A.Belief({
//               propositionSet: {
//                 metadata: {
//                   fieldDefinition: <any>{
//                     label: 'consists of'
//                   },
//                   fieldValue: Set.of({
//                     value: plastic,
//                     label: 'plastic'
//                   })
//                 },
//                 propositions: Set.of(
//                   triple(badge, crm.P45_consists_of, plastic)
//                 )
//               },
//               beliefValue: true
//             }),
//             A.Belief({
//               propositionSet: {
//                 metadata: {
//                   fieldDefinition: <any>{
//                     label: 'consists of'
//                   },
//                   fieldValue: Set.of({
//                     value: metal,
//                     label: 'metal'
//                   })
//                 },
//                 propositions: Set.of(
//                   triple(badge, crm.P45_consists_of, metal)
//                 )
//               },
//               beliefValue: true
//             }),
//             A.Belief({
//               propositionSet: {
//                 metadata: {
//                   fieldDefinition: <any>{
//                     label: 'consists of'
//                   },
//                   fieldValue: Set.of({
//                     value: paper,
//                     label: 'paper'
//                   })
//                 },
//                 propositions: Set.of(
//                   triple(badge, crm.P45_consists_of, paper)
//                 )
//               },
//               beliefValue: false
//             })
//           )
//         );

//     const mergedBeliefs =
//         evaluateBeliefs(
//           Set.of(
//             A.Belief({
//               propositionSet: {
//                 propositions: Set.of(
//                   triple(badge, crm.P45_consists_of, plastic),
//                   triple(badge, crm.P45_consists_of, metal)
//                 ),
//                 metadata: {
//                   fieldDefinition: <any>{
//                     label: 'consists of'
//                   },
//                   fieldValue: Set.of(
//                     {
//                       value: plastic,
//                       label: 'plastic'
//                     },
//                     {
//                       value: metal,
//                       label: 'metal'
//                     }
//                   )
//                 }
//               },
//               beliefValue: true
//             }),
//             A.Belief({
//               propositionSet: {
//                 metadata: {
//                   fieldDefinition: <any>{
//                     label: 'consists of'
//                   },
//                   fieldValue: Set.of({
//                     value: paper,
//                     label: 'paper'
//                   })
//                 },
//                 propositions: Set.of(
//                   triple(badge, crm.P45_consists_of, paper)
//                 )
//               },
//               beliefValue: false
//             })
//           )
//         );

//     expect(evaluated).to.be.deep.equal(mergedBeliefs);
//   })

//   it('eval belief', (done) => {
//     const evaluated =
//         evalBelief({
//           object: badgeEntity,
//           fieldIri: fieldInstanceIri,
//           user: iri('temp')
//         })(
//           A.Belief({
//             propositionSet: {
//               propositions: Set.of(
//                 triple(badge, crm.P45_consists_of, plastic),
//                 triple(badge, crm.P45_consists_of, metal)
//               ),
//               metadata: {
//                 fieldDefinition: <any>{
//                   label: 'consists of'
//                 },
//                 fieldValue: Set.of(
//                   {
//                     value: plastic,
//                     label: 'plastic'
//                   },
//                   {
//                     value: metal,
//                     label: 'metal'
//                   }
//                 )
//               }
//             },
//             beliefValue: true
//           })
//         );

//     const expected =`
//       <http://hdl.handle.net/10934/RM0001.COLLECT.11/belief/2> {
//         <http://hdl.handle.net/10934/RM0001.COLLECT.11/belief/2> a <http://www.ics.forth.gr/isl/CRMinf/I2_Belief>;
//         <http://www.ics.forth.gr/isl/CRMinf/J4_that> <http://hdl.handle.net/10934/RM0001.COLLECT.11/proposition/1>;
//         <http://www.ics.forth.gr/isl/CRMinf/J5_holds_to_be> "true"^^<http://www.w3.org/2001/XMLSchema#boolean> ;
//         <http://www.w3.org/2000/01/rdf-schema#label> "Agree with proposition  \\"'Esperanto Badge' > consists of > 'plastic' and 'metal'\\""^^<http://www.w3.org/2001/XMLSchema#string>
//       }
//       <http://hdl.handle.net/10934/RM0001.COLLECT.11/proposition/1> {
//        <http://hdl.handle.net/10934/RM0001.COLLECT.11> <http://www.cidoc-crm.org/cidoc-crm/P45_consists_of> <http://hdl.handle.net/10934/plastic>, <http://hdl.handle.net/10934/metaal> .
//        <http://hdl.handle.net/10934/RM0001.COLLECT.11/proposition/1> a <http://www.ics.forth.gr/isl/CRMinf/I4_Proposition_Set> ;
//        <http://www.w3.org/2000/01/rdf-schema#label> "'Esperanto Badge' > consists of > 'plastic' and 'metal'"^^<http://www.w3.org/2001/XMLSchema#string>
//      }
//    `

//     serialize.serializeGraph(evaluated.graph, serialize.Format.Trig).onValue(
//       (str) => {
//         expect(str).to.be.equalIgnoreSpaces(expected);
//         done();
//       }
//     );
//   })
// });
