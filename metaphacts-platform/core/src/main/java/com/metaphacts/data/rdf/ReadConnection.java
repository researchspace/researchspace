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

import com.google.common.collect.Sets;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.Statement;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.query.QueryResults;
import org.eclipse.rdf4j.repository.Repository;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.eclipse.rdf4j.repository.RepositoryResult;

import com.google.common.base.Throwables;
import static com.google.common.base.Preconditions.checkNotNull;


/**
 * Collection of repository read-only utilities to be performed on the supplied
 * {@link Repository}. Mostly delegating to native {@link RepositoryConnection}
 * methods, however, taking care for properly closing all connections.
 * 
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class ReadConnection {
    
    private Repository repository;
    
    private boolean inference;

    /**
     * {@link ReadConnection} on specified {@link Repository} <b>without
     * inference</b>.
     * 
     * @param repository
     */
    public ReadConnection(Repository repository){
        this.repository=repository;
        this.inference=false;
    }
    
    public ReadConnection(Repository repository, boolean inference){
        this.repository=repository;
        this.inference=inference;
    }
    
    @SuppressWarnings("unused")
    private ReadConnection(){}
    
    /**
     * The current working repository
     * @return
     */
    public Repository getRepository(){
        return this.repository;
    }
    
    /**
     * Returns a set of non-cached rdf:type (s) for the specified subject or
     * empty set otherwise.
     * 
     * @param subject
     * @return
     */
    public Set<Resource> getTypes(IRI subject){
        checkNotNull(subject, "subject must not be null.");
        Set<Resource> types =  Sets.newLinkedHashSet();
        try(RepositoryConnection con = repository.getConnection()){
            RepositoryResult<Statement> stmts = con.getStatements(subject, RDF.TYPE, null, this.inference);
            while(stmts.hasNext()){
                Statement s = stmts.next();
                if(Resource.class.isAssignableFrom(s.getObject().getClass())){
                    types.add((Resource)s.getObject());
                }
            }
        } catch (RepositoryException e) {
            throw Throwables.propagate(e);
        }
        return types;
    }
    
    /**
     * Checks whether statement exists in repository.
     * @see RepositoryConnection#hasStatement(Resource, IRI, Value, boolean, Resource...)
     * @param resource
     * @param uri
     * @param value
     * @param contexts
     * @return
     */
    public boolean hasStatement(Resource resource, IRI uri, Value value, Resource... contexts){
        try(RepositoryConnection con = this.repository.getConnection()){
            return con.hasStatement(resource, uri, value, this.inference, contexts);
        }
    }
    
    /**
     * Whether the supplied subject has any out-going edges in any named graph.
     * Subject must not be not.
     * @param subject
     * @return
     */
    public boolean hasOutgoingStatements(IRI subject){
        checkNotNull(subject, "subject must not be null.");
        try(RepositoryConnection con = this.repository.getConnection()){
            return con.hasStatement(subject, null, null,this.inference);
        }
    }

    
    /**
     * Whether the supplied subject has any incoming edges in any named graph.
     * Subject must not be not.
     * @param subject
     * @return
     */
    public boolean hasIncomingStatements(IRI subject){
        checkNotNull(subject, "subject must not be null.");
        try(RepositoryConnection con = this.repository.getConnection()){
            return con.hasStatement(null, null, subject,this.inference);
        }
    }
    
    /**
     * Returns all out-going statements for the specified subject.
     * Subject must not be not.
     * @param subject
     * @return
     */
    public Model getOutgoingStatements(IRI subject){
        checkNotNull(subject, "subject must not be null.");
        try(RepositoryConnection con = this.repository.getConnection()){
            return QueryResults.asModel(con.getStatements(subject, null,null));
        }
    }
    
    /**
     * Returns all statements in the specified named graph aka context.
     * Context must not be null.
     * @param context
     * @return
     */
    public Model getContext(IRI context){
        checkNotNull(context, "context must not be null.");
        try(RepositoryConnection con = this.repository.getConnection()){
            return QueryResults.asModel(con.getStatements(null, null, null, context));
        }
    }
    
    /**
     * Returns all statements matching the specified subject - predicate -
     * object patterns across all named graphs.
     * 
     * @param subject
     * @param predicate
     * @param object
     * @return
     * @throws RepositoryException
     */
    public Model getStatements(Resource subject, IRI predicate, Value object) throws RepositoryException{
        try(RepositoryConnection con = this.repository.getConnection()){
            return QueryResults.asModel(con.getStatements(subject, predicate, object, this.inference));
        }
    }
    

    
    /**
     * Whether the specified subject has the given rdf:type.
     * @param subject
     * @param type
     * @return
     */
    public boolean hasType(IRI subject, IRI type){
        checkNotNull(subject, "subject must not be null.");
        checkNotNull(type, "type must not be null.");
        try(RepositoryConnection con = this.repository.getConnection()){
            return con.hasStatement(subject, RDF.TYPE, type, this.inference);
        }
    }
    
    /**
     * Number of statements in the specified named graphs. If no named graph is
     * given, number of statements in the repository.
     * 
     * @see RepositoryConnection#size(Resource...)
     * @param contexts
     * @return
     */
    public long size(Resource... contexts){
        try(RepositoryConnection con = this.repository.getConnection()){
            return con.size(contexts);
        }
    }

}