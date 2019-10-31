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

package com.metaphacts.repository.memory;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.Reader;
import java.net.URL;

import org.eclipse.rdf4j.IsolationLevel;
import org.eclipse.rdf4j.common.iteration.Iteration;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.Statement;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.query.MalformedQueryException;
import org.eclipse.rdf4j.query.QueryLanguage;
import org.eclipse.rdf4j.query.Update;
import org.eclipse.rdf4j.repository.Repository;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.eclipse.rdf4j.repository.base.RepositoryConnectionWrapper;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.eclipse.rdf4j.rio.RDFParseException;

/**
 * A connection wrapper for {@link MpMemoryRepository} 
 * which blocks all write operations.
 * 
 * @author Andriy Nikolov an@metaphacts.com
 *
 */
public class MpMemoryRepositoryConnection extends RepositoryConnectionWrapper {

    public MpMemoryRepositoryConnection(Repository repository, RepositoryConnection delegate) {
        super(repository, delegate);
    }

    @Override
    public void add(File file, String baseURI, RDFFormat dataFormat, Resource... contexts)
            throws IOException, RDFParseException, RepositoryException {
        throw new UnsupportedOperationException("The repository is read-only");
    }

    @Override
    public void add(InputStream in, String baseURI, RDFFormat dataFormat, Resource... contexts)
            throws IOException, RDFParseException, RepositoryException {
        throw new UnsupportedOperationException("The repository is read-only");
    }

    @Override
    public void add(Iterable<? extends Statement> statements, Resource... contexts)
            throws RepositoryException {
        throw new UnsupportedOperationException("The repository is read-only");
    }

    @Override
    public <E extends Exception> void add(Iteration<? extends Statement, E> statementIter,
            Resource... contexts) throws RepositoryException, E {
        throw new UnsupportedOperationException("The repository is read-only");
    }

    @Override
    public void add(Reader reader, String baseURI, RDFFormat dataFormat, Resource... contexts)
            throws IOException, RDFParseException, RepositoryException {
        throw new UnsupportedOperationException("The repository is read-only");
    }

    @Override
    public void add(Resource subject, IRI predicate, Value object, Resource... contexts)
            throws RepositoryException {
        throw new UnsupportedOperationException("The repository is read-only");
    }

    @Override
    public void add(Statement st, Resource... contexts) throws RepositoryException {
        throw new UnsupportedOperationException("The repository is read-only");
    }

    @Override
    public void add(URL url, String baseURI, RDFFormat dataFormat, Resource... contexts)
            throws IOException, RDFParseException, RepositoryException {
        throw new UnsupportedOperationException("The repository is read-only");
    }

    @Override
    public void clear(Resource... contexts) throws RepositoryException {
        throw new UnsupportedOperationException("The repository is read-only");
    }

    @Override
    public void commit() throws RepositoryException {
        throw new UnsupportedOperationException("The repository is read-only");
    }

    @Override
    public Update prepareUpdate(QueryLanguage ql, String update, String baseURI)
            throws MalformedQueryException, RepositoryException {
        throw new UnsupportedOperationException("The repository is read-only");
    }

    @Override
    public void remove(Iterable<? extends Statement> statements, Resource... contexts)
            throws RepositoryException {
        throw new UnsupportedOperationException("The repository is read-only");
    }

    @Override
    public <E extends Exception> void remove(Iteration<? extends Statement, E> statementIter,
            Resource... contexts) throws RepositoryException, E {
        throw new UnsupportedOperationException("The repository is read-only");
    }

    @Override
    public void remove(Resource subject, IRI predicate, Value object, Resource... contexts)
            throws RepositoryException {
        throw new UnsupportedOperationException("The repository is read-only");
    }

    @Override
    public void remove(Statement st, Resource... contexts) throws RepositoryException {
        throw new UnsupportedOperationException("The repository is read-only");
    }

    @Override
    public void removeNamespace(String prefix) throws RepositoryException {
        throw new UnsupportedOperationException("The repository is read-only");
    }

    @Override
    public void clearNamespaces() throws RepositoryException {
        throw new UnsupportedOperationException("The repository is read-only");
    }

    @Override
    public void rollback() throws RepositoryException {
        throw new UnsupportedOperationException("The repository is read-only");
    }

    @Override
    protected void addWithoutCommit(Resource subject, IRI predicate, Value object,
            Resource... contexts) throws RepositoryException {
        throw new UnsupportedOperationException("The repository is read-only");
    }

    @Override
    protected void removeWithoutCommit(Resource subject, IRI predicate, Value object,
            Resource... contexts) throws RepositoryException {
        throw new UnsupportedOperationException("The repository is read-only");
    }

    @Override
    public void begin() throws RepositoryException {
        throw new UnsupportedOperationException("The repository is read-only");
    }

    @Override
    public void begin(IsolationLevel level) throws RepositoryException {
        throw new UnsupportedOperationException("The repository is read-only");
    }

    @Override
    public Update prepareUpdate(QueryLanguage ql, String update)
            throws MalformedQueryException, RepositoryException {
        throw new UnsupportedOperationException("The repository is read-only");
    }

    @Override
    protected void removeWithoutCommit(Statement st, Resource... contexts)
            throws RepositoryException {
        throw new UnsupportedOperationException("The repository is read-only");
    }

        
    
}
