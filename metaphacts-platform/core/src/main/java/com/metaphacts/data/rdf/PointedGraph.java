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

package com.metaphacts.data.rdf;

import java.util.Set;

import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.model.vocabulary.RDF;

/**
 * Utility class to hold a collection of statements (i.e. the graph), whereas
 * the graph is usually a tree and the pointer the "root subject". Particularly
 * helpful for handling, for example, LDP containers.
 *
 * @author Artem Kozlov <ak@metaphacts.com>
 * @author Johannes Trame <jt@metaphacts.com>
 */
public class PointedGraph {

	private IRI pointer;
	private Model graph;
	
	public void setGraph(Model graph) {
        this.graph = graph;
    }

    public PointedGraph(IRI pointer, Model graph) {
		this.pointer = pointer;
		this.graph = graph;
	}

	public IRI getPointer() {
		return pointer;
	}

	public Model getGraph() {
		return graph;
	}
	
    /**
     * Returns a list of {@link RDF#TYPE}s for the "pointer" within the model.
     * 
     * @return
     */
    public Set<Value> getTypes(){
        return this.graph.filter(this.pointer, RDF.TYPE, null).objects();
    }
}