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

package com.metaphacts.data.rdf.container;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.util.Models;
import org.eclipse.rdf4j.repository.RepositoryException;

import com.metaphacts.data.rdf.ModelUtils;
import com.metaphacts.data.rdf.PointedGraph;
import com.metaphacts.repository.MpRepositoryProvider;
import com.metaphacts.vocabulary.PLATFORM;

/**
 * @author Artem Kozlov <ak@metaphacts.com>
 */
@LDPR(iri = SetContainer.IRI_STRING)
public class SetContainer extends DefaultLDPContainer {
    
    private static final Logger logger = LogManager.getLogger(SetContainer.class);
    
    public static final String IRI_STRING = "http://www.metaphacts.com/ontologies/platform#Set";
    public static final IRI IRI = vf.createIRI(IRI_STRING);
    
    private static final IRI setMemberPredicate = vf.createIRI("http://www.metaphacts.com/ontologies/platform#setItem");
    
    public SetContainer(IRI uri, MpRepositoryProvider repositoryProvider) {
        super(uri, repositoryProvider);
    }
    
    @Override
    public IRI getResourceType() {
        return PLATFORM.SET_ITEM_TYPE;
    }

    @Override
    public IRI add(PointedGraph pointedGraph) throws RepositoryException {
        
        IRI setItem = Models.objectIRI(pointedGraph.getGraph().filter(pointedGraph.getPointer(), setMemberPredicate, null)).orElseThrow(
             () -> new IllegalArgumentException("Set item to be added must be linked from an auxiliary note with the predicate "+setMemberPredicate ));
        logger.trace("Checking whether identical item in set has already been created");
        IRI existingItem = checkForExistingItem(setItem, setMemberPredicate, false);
        if(existingItem!=null){
            logger.trace("Same  item has already been stored in set: "+existingItem +". Updating meta-data.");
            Model newModel = ModelUtils.replaceSubjectAndObjects(pointedGraph.getGraph(), pointedGraph.getPointer(), existingItem);
            // if same item already exists in set
            PointedGraph pg = new PointedGraph(existingItem, newModel);
            update(pg);
            return existingItem;
        }else{
            return super.add(pointedGraph);
        }
    }


}