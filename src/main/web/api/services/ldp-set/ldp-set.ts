/**
 * ResearchSpace
 * Copyright (C) 2022-2024, © Kartography Community Interest Company
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

import * as Kefir from 'kefir';
import * as maybe from 'data.maybe';
import * as Immutable from 'immutable';
import * as request from 'platform/api/http';

import { Rdf, turtle, vocabularies } from 'platform/api/rdf';
import { trigger } from 'platform/api/events';
import { getLabel } from 'platform/api/services/resource-label';
import { LdpService, LdpServiceContext } from '../ldp';
import { Util as SecurityUtil, UserI } from '../security';
import { SetManagementEvents } from './SetManagementEvents';
import { validateAsk } from 'platform/components/forms/field-editor/Validation';
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';
import { ResourceLinkComponent } from 'platform/api/navigation/components';
import { Component } from 'react';

const { rdf, rdfs, VocabPlatform, ldp, xsd } = vocabularies;

export class SetService extends LdpService {
  createSet(name: string, slug = maybe.Nothing<string>(), visibleInViewForTemplateWithId = maybe.Nothing<string>()): Kefir.Property<Rdf.Iri> {
    const generatedIri = Rdf.iri('');
    let setTriples = [
      Rdf.triple(generatedIri, rdfs.label, Rdf.literal(name)),
      Rdf.triple(generatedIri, rdf.type, ldp.Container),
      Rdf.triple(generatedIri, Rdf.iri("http://www.cidoc-crm.org/cidoc-crm/P2_has_type"), VocabPlatform.Set),
      Rdf.triple(generatedIri, rdf.type, Rdf.iri("http://www.cidoc-crm.org/extensions/crmdig/D1_Digital_Object")),
    ];

    let visibilityResourceIri = "";
    if (visibleInViewForTemplateWithId.isJust) {
      setTriples.push(Rdf.triple(generatedIri, 
                      Rdf.iri("http://www.researchspace.org/pattern/system/set/visible_in_group_with_id"), 
                      Rdf.literal(visibleInViewForTemplateWithId.get())));
    }
    
    const set = Rdf.graph(setTriples);
    
    return this.addResource(set, slug);
  }

  addToExistingSet(setIri: Rdf.Iri, itemIri: Rdf.Iri,setPropId?:string): Kefir.Property<HolderWithItem> {
    const existingSet = new LdpService(setIri.value, this.context);
    
    executeAskIsSetQuery(itemIri)
      .onValue(answer => {
        if (answer) 
          this.addSetVisibleTriples(itemIri,setPropId);     
      });
    return addSetItem(existingSet, itemIri, null, setPropId);    
  }

  createSetAndAddItemsToView(name: string, listOfItemIris: Immutable.List<Rdf.Iri>, visibleInViewForTemplateWithId=maybe.Nothing<string>()): Kefir.Property<any[]> {
    return this.createSet(name,null,visibleInViewForTemplateWithId)
      .flatMap((setLocation: Rdf.Iri) => {
        const newSet = new LdpService(setLocation.value, this.context);
        return Kefir.zip(listOfItemIris.map((iri, index) => addSetItem(newSet, iri, index)).toJS());
      })
      .toProperty();
  }

  createSetAndAddItems(name: string, listOfItemIris: Immutable.List<Rdf.Iri>): Kefir.Property<any[]> {
    return this.createSet(name)
      .flatMap((setLocation: Rdf.Iri) => {
        const newSet = new LdpService(setLocation.value, this.context);
        return Kefir.zip(listOfItemIris.map((iri, index) => addSetItem(newSet, iri, index)).toJS());
      })
      .toProperty();
  }

  removeSetVisibleTriples(
    setIri: Rdf.Iri,
    visibleInViewForTemplateWithId: string    
  ): Kefir.Property<void> { 
    return SparqlClient
      .executeSparqlUpdate(
          "delete { "+
          setIri + " " + 
          Rdf.iri("http://www.researchspace.org/pattern/system/set/visible_in_group_with_id") + " " +
          Rdf.literal(visibleInViewForTemplateWithId)+" } where {"+
          setIri + " " + 
          Rdf.iri("http://www.researchspace.org/pattern/system/set/visible_in_group_with_id") + " " +
          Rdf.literal(visibleInViewForTemplateWithId)+
          " }")
      .onValue(() => {});
  }
 
  addSetVisibleTriples(
    setIri: Rdf.Iri,
    visibleInViewForTemplateWithId: string   
  ) {
    let setIriGraph = setIri.toString().replace(">","/extended_context>");
    SparqlClient
      .executeSparqlUpdate(
          "INSERT DATA { graph <http://www.researchspace.org/sets/views_visibility> "+ " { "+
          setIri + " " + 
          Rdf.iri("http://www.researchspace.org/pattern/system/set/visible_in_group_with_id") + " " +
          Rdf.literal(visibleInViewForTemplateWithId)+".} }")
        .onValue(() => {});
  }

  reorderItems(setIri: Rdf.Iri, holders: Immutable.List<HolderWithItem>): Kefir.Property<void> {
    const set = new LdpService(setIri.value, this.context);
    return Kefir.zip(
      holders
        .map(({ holder, item }, index) =>
          createItemHolderGraph(holder, item, index).flatMap((graph) => set.update(holder, graph))
        )
        .toArray()
    )
      .map(() => {
        /* nothing */
      })
      .toProperty();
  }
}

function addSetItem(set: LdpService, item: Rdf.Iri, index?: number, setPropId?: string): Kefir.Property<HolderWithItem> {
  return createItemHolderGraph(Rdf.iri(''), item, index, setPropId)
    .flatMap((graph) => set.addResource(graph))
    .map((holder) => ({ holder, item, containerIri: set.getContainerIRI() }))
    .toProperty();
}

let IS_SET_QUERY = SparqlUtil.Sparql`ASK { ?subject <http://www.cidoc-crm.org/cidoc-crm/P2_has_type> ?type . VALUES ?type {<http://www.researchspace.org/resource/system/vocab/resource_type/set> <http://www.researchspace.org/resource/system/vocab/resource_type/knowledge_map>} }`;
function  executeAskIsSetQuery(setIri: Rdf.Iri): Kefir.Property<boolean> {
    return SparqlClient.ask(
          SparqlClient.setBindings(IS_SET_QUERY, { subject: setIri }),
                                   {context: {repository:"default"} });
}

function createItemHolderGraph(holderIri: Rdf.Iri, itemIri: Rdf.Iri, index?: number,setPropId?: string): Kefir.Property<Rdf.Graph> { 
  return getLabel(itemIri)
    .map((label) => {
        let triples: Rdf.Triple[] = [
              Rdf.triple(holderIri, VocabPlatform.setItem, itemIri),
              Rdf.triple(holderIri, Rdf.iri("http://www.cidoc-crm.org/cidoc-crm/P67_refers_to"), itemIri),
              Rdf.triple(holderIri, Rdf.iri("http://www.cidoc-crm.org/cidoc-crm/P2_has_type"), VocabPlatform.SetItem),
              Rdf.triple(holderIri, rdf.type, Rdf.iri("http://www.cidoc-crm.org/extensions/crmdig/D1_Digital_Object")),
            ];
        if (typeof index === 'number') {
          triples.push(Rdf.triple(holderIri, VocabPlatform.setItemIndex, Rdf.literal(index.toString(), xsd.integer)));
        }   

        triples.push(Rdf.triple(holderIri, rdfs.label, Rdf.literal(label)));
        return Rdf.graph(triples);
  });          
}

interface HolderWithItem {
  holder: Rdf.Iri;
  item: Rdf.Iri;
  containerIri?: Rdf.Iri
}

export function addToDefaultSet(resource: Rdf.Iri, sourceId: string): Kefir.Property<Rdf.Iri> {
  /**
   * This code assumes the Uncategorised set is viewed by default in the Clipboard i.e. 
   * a <mp-set-management id=clipboard></mp-set-management>
   * This function also triggers a refresh of the Clipboard section in the UI
   */ 
  const defaultSetManagerPropId = "clipboard";
  return Kefir.combine([getSetServiceForUser(), Kefir.fromPromise(getUserDefaultSetIri())])
    .flatMap(([service, defaultSetIri]) => 
      service.addToExistingSet(defaultSetIri, resource, defaultSetManagerPropId).map(() => { 
        trigger({ eventType: SetManagementEvents.ItemAdded, source: sourceId });
        /* This is triggering a Clipboard refresh once a new Item is added */
        trigger({ eventType: "Component.Refresh", source: sourceId, targets: [defaultSetManagerPropId] });     
        return resource;
      })
    )
    .toProperty()
    .onError((e) => {console.error(e);});
}

export function getUserSetRootContainerIri(username?: string): Promise<Rdf.Iri> {
  return new Promise<Rdf.Iri>((resolve, reject) => {
    request
      .get('/rest/sets/getUserSetRootContainerIri')
      .query({ username })
      .type('application/json')
      .accept('text/plain')
      .end((err, res) => {
        if (err) {
          reject(err);
        }
        const iri = res.text;
        if (typeof iri !== 'string') {
          throw new Error(`Invalid user set root container IRI: ${iri}`);
        }
        resolve(Rdf.iri(iri));
      });
  });
}

export function getUserDefaultSetIri(username?: string): Promise<Rdf.Iri> {
  return new Promise<Rdf.Iri>((resolve, reject) => { 
    request
      .get('/rest/sets/getUserDefaultSetIri')
      .query({ username })
      .type('application/json')
      .accept('text/plain')
      .end((err, res) => {
        if (err) {
          reject(err);
        }
        const iri = res.text;
        if (typeof iri !== 'string') {
          throw new Error(`Invalid user default set IRI: ${iri}`);
        }
        resolve(Rdf.iri(iri));
      });
  });
}

class ContainerOfUserSetContainers extends LdpService {
  constructor(context: LdpServiceContext | undefined) {
    super(VocabPlatform.UserSetContainer.value, context);
  }

  getOrCreateSetContainer(setContainerIri: Rdf.Iri): Kefir.Property<SetService> {
    const setService = new SetService(setContainerIri.value, this.context);
    return this.get(setContainerIri)
      .map((graph) => setService)
      .flatMapErrors(() =>
        Kefir.combine([
          Kefir.fromPromise(SecurityUtil.getUser()),
          Kefir.fromPromise(getUserDefaultSetIri()),
        ]).flatMap(([user, defaultSetIri]) =>
          this.createSetContainerForUser(user, setContainerIri).flatMap(() =>
            setService
              .createSet('Uncategorized', maybe.Just(defaultSetIri.value))
              .flatMapErrors(() => Kefir.constant({}))
          )
        )
      )
      .map(() => setService)
      .toProperty();
  }

  createSetContainerForUser(user: UserI, setContainerIri: Rdf.Iri): Kefir.Property<void> {
    const generatedIri = Rdf.iri('');
    const containerName = `Set container of user '${user.principal}'`;
    return this.addResource(
      Rdf.graph([
        Rdf.triple(generatedIri, rdfs.label, Rdf.literal(containerName)),
        Rdf.triple(generatedIri, rdf.type, ldp.Container),
        Rdf.triple(generatedIri, rdf.type, VocabPlatform.SetContainer),
      ]),
      maybe.Just(setContainerIri.value)
    ).map(() => {
      /* nothing */
    });
  }
}

let setContainerOfCurrentUser: Kefir.Property<SetService> = undefined;

export function getSetServiceForUser(context?: LdpServiceContext): Kefir.Property<SetService> { 
  if (setContainerOfCurrentUser) { 
    return setContainerOfCurrentUser;
  }
  
  const container = new ContainerOfUserSetContainers(context);
  setContainerOfCurrentUser = Kefir.fromPromise(getUserSetRootContainerIri())
    .flatMap<SetService>((setContainerIri) => container.getOrCreateSetContainer(setContainerIri))
    .toProperty();
  return setContainerOfCurrentUser;
}
