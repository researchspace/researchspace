/*
 * Copyright (C) 2015-2019, © Trustees of the British Museum
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

// import * as Kefir from 'kefir';
// import { Component, DOM as D, createFactory } from 'react';
// import { OrderedSet } from 'immutable';
// import * as ReactSelectComponent from 'react-select';
// import * as maybe from 'data.maybe';
// import * as classnames from 'classnames';

// import { Rdf } from 'platform/api/rdf';
// import TemplateItem from '../../common/ts/templates/components/TemplateItem';
// import { SearchProfileLdpService } from '../data/profiles/SearchProfileLdpService';
// import { Classes,
//          Class,
//          Properties,
//          Property,
//          Profile,
//        } from '../data/profiles/Model';
// import SearchProfileStore from '../data/profiles/SearchProfileStore';
// import { Entity } from '../data/Common';

// import '../../scss/properties-profile-editor.scss';

// const ReactSelect = createFactory(ReactSelectComponent);

// interface Props {
//   profileUri: string
//   classes: {
//     query: string
//     tupleTemplate: string
//   }
//   properties: {
//     query: string
//     tupleTemplate: string
//   }
//   availableProfilesQuery: string
// }

// interface State {
//   aggregateProfile?: Profile
//   profile?: Profile
//   selected?: Data.Maybe<Selected>
// }

// interface Selected {
//   domain: Class
//   range: Class
// }

// class SemanticSearchProfileEditor extends Component<Props, State> {

//   constructor(props) {
//     super(props);
//     this.state = {
//       aggregateProfile: null,
//       selected: maybe.Nothing<Selected>()
//     }
//   }

//   private _profiles: Kefir.Property<Profile>;
//   private _profilesPool = Kefir.pool<Profile>();

//   componentDidMount() {
//     this._profiles = this._profilesPool.toProperty();
//     this._profiles.onValue(
//       profile =>
//           this.setState({
//             profile: profile
//           })
//     );

//     const propertiesProfileStore = new SearchProfileStore(
//       {
//         classes: this.props.classes,
//         properties: this.props.properties,
//         availableProfilesQuery: this.props.availableProfilesQuery,
//         defaultProfiles: []
//       }, OrderedSet<Rdf.Iri>()
//     );

//     propertiesProfileStore.profile.onValue(
//       profile => this.setState({aggregateProfile: profile})
//     );

//     Kefir.combine(
//       [
//         propertiesProfileStore.profile,
//         SearchProfileLdpService.getProfile(
//           Rdf.iri(this.props.profileUri)
//         )
//       ],
//       (sumProfile, profile) => SemanticSearchProfileEditor.profileToEntities(sumProfile, profile)
//     ).onValue(
//       profile => this._profilesPool.plug(
//         Kefir.constant(profile)
//       )
//     )
//   }

//   render() {
//     if(this.state.profile) {
//       return D.div(
//         {
//           className: 'profile-editor'
//         },
//         this.profileClasses(),
//         // do not show properties matrix if no classes are selected for profile
//         this.state.profile.classes.isEmpty() ? null : this.profileOverview(),
//         D.hr({}),
//         this.state.selected.isJust ? this.selectedProperties() : null
//       );
//     } else {
//       return D.div({}, 'loading')
//     }
//   }

//   private profileClasses() {
//     return D.div(
//       {
//         className: 'profile-editor__classes'
//       },
//       D.span({}, 'Profile Classes: '),
//       ReactSelect({
//         multi: true,
//         options: SemanticSearchProfileEditor.entitiesToSelectOptions(this.state.aggregateProfile.classes),
//         value: this.state.profile.classes.map(c => c.iri.value).toJS(),
//         onChange: this.onProfileClassesChange,
//         placeholder: 'Select classes for the profile.'
//       })
//     );
//   }

//   private updateProfile(newProfile: Profile) {
//     this._profilesPool.plug(
//       Kefir.constant(newProfile)
//     );

//     SearchProfileLdpService.updateProfile(
//       Rdf.iri(this.props.profileUri), newProfile
//     ).onError(
//       error => console.error(error)
//     ).onValue(
//       () => {}
//     );
//   }

//   private onProfileClassesChange = (values: ReactSelect.Options) => {
//     const newClasses = SemanticSearchProfileEditor.classesToEntities(
//       this.state.aggregateProfile,
//       OrderedSet<Rdf.Iri>(_.map(values, value => Rdf.iri(value.value)))
//     );
//     this.state.profile.classes = newClasses;
//     this.updateProfile(this.state.profile);
//   }

//   private onProfilePropertiesChange = (values: ReactSelect.Options) => {
//     const newProperties = SemanticSearchProfileEditor.propertiesToEntities(
//       this.state.aggregateProfile,
//       OrderedSet<Rdf.Iri>(_.map(values, value => Rdf.iri(value.value)))
//     )

//     const originalProperties =
//         SemanticSearchProfileEditor.filterProperties(
//           this.state.profile.properties,
//           this.state.selected.get().domain,
//           this.state.selected.get().range
//         );

//     const save = this.state.profile.properties.subtract(originalProperties).union(newProperties)
//     const profile = this.state.profile.set('properties', save);
//     this.updateProfile(profile);
//   }

//   private selectedProperties() {
//     return D.div(
//       {
//         className: 'profile-editor__properties'
//       },
//       D.div(
//         {
//           className: 'profile-editor__properties__header'
//         },
//         D.span({}, 'Properties for'),
//         SemanticSearchProfileEditor.headerCell(this.state.selected.get().domain, this.props.config.classes),
//         '⇒',
//         SemanticSearchProfileEditor.headerCell(this.state.selected.get().range, this.props.config.classes),
//         ':'
//       ),
//       ReactSelect({
//         multi: true,
//         options: SemanticSearchProfileEditor.entitiesToSelectOptions(
//           SemanticSearchProfileEditor.filterProperties(
//             this.state.aggregateProfile.properties, this.state.selected.get().domain, this.state.selected.get().range
//           )
//         ),
//         value: SemanticSearchProfileEditor.filterProperties(
//           this.state.profile.properties, this.state.selected.get().domain, this.state.selected.get().range
//         ).map(
//           r => r.iri.value
//         ).toJS(),
//         onChange: this.onProfilePropertiesChange,
//         placeholder: 'Select properties for domain and range.'
//       })
//     );
//   }

//   private profileOverview() {
//     return D.table(
//       {
//         className: 'profile-editor__overview'
//       },
//       D.thead(
//         {},
//         D.tr(
//           {},
//           D.th({}, 'Domain/Range'),
//           SemanticSearchProfileEditor.horizontalHeader(
//             this.state.profile.classes, this.props.classes
//           )
//         )
//       ),
//       D.tbody(
//         {},
//         this.rows(
//           this.state.profile.classes,
//           this.state.profile.properties,
//           this.props.classes
//         )
//       )
//     )
//   }

//   private static horizontalHeader(profileClasses: Classes, config: EntityConfig) {
//     return profileClasses.map(
//       category => D.th({}, SemanticSearchProfileEditor.headerCell(category, config))
//     );
//   }

//   private rows(
//     profileClasses: Classes, profileProperties: Properties, config: EntityConfig
//   ) {
//     return profileClasses.map(
//       domain => D.tr(
//         {},
//         D.th({}, SemanticSearchProfileEditor.headerCell(domain, config)),
//         profileClasses.map(
//           range => D.td({}, this.countCell(domain, range, profileProperties))
//         )
//       )
//     )
//   }

//   private countCell(
//     domain: Class, range: Class, properties: Properties
//   ) {
//     const count = properties.count(
//       r => r.hasDomain.equals(domain.iri) && r.hasRange.equals(range.iri)
//     );
//     const isActive = this.isActiveCell(domain, range);
//     return D.button(
//       {
//         className: classnames({
//           'btn btn-default btn-block': true,
//           'profile-editor__overview__cell-button': !isActive,
//           'profile-editor__overview__cell-button--active': isActive
//         }),
//         onClick: () => this.setState({
//           selected: maybe.Just({domain: domain, range: range})
//         })
//       },
//       count
//     );
//   }

//   private isActiveCell(
//     domain: Class, range: Class
//   ): boolean {
//     return this.state.selected.map(
//       selected => selected.domain.equals(domain) && selected.range.equals(range)
//     ).getOrElse(false);
//   }

//   private static headerCell(entity: Entity, tupleTemplate: string) {
//     return TemplateItem({
//       template: {
//         source: tupleTemplate,
//         options: entity.tuple
//       },
//       title: entity.label.value,
//       'data-rdfa-about': entity.iri.value
//     });
//   }

//   private static filterProperties(
//     properties: Properties, domain: Class, range: Class
//   ): Properties {
//     return <Properties>properties.filter(
//       rel => {
//         const domainMatch = rel.hasDomain.iri.equals(domain.iri)
//         const rangeMatch = rel.hasRange.iri.equals(range.iri)
//         return domainMatch && rangeMatch;
//       }
//     );
//   }

//   private static entitiesToSelectOptions(entities: OrderedSet<Entity>): ReactSelect.Options {
//     return entities.map(
//       entity => {
//         return {
//           value: entity.iri.value,
//           label: entity.label.value
//         }
//       }
//     ).toJS()
//   }
// }

// export type c = SemanticSearchProfileEditor;
// export const c = SemanticSearchProfileEditor;
// export const f = createFactory(c);
// export default c;
