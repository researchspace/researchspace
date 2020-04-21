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

package org.researchspace.data.rdf.container;

import java.util.Collections;
import java.util.Date;
import java.util.HashSet;
import java.util.Set;

import javax.inject.Inject;

import org.apache.shiro.UnavailableSecurityManagerException;
import org.eclipse.rdf4j.common.iteration.Iterations;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.model.impl.LinkedHashModel;
import org.eclipse.rdf4j.model.util.Models;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.eclipse.rdf4j.query.QueryLanguage;
import org.eclipse.rdf4j.query.QueryResults;
import org.eclipse.rdf4j.query.TupleQuery;
import org.eclipse.rdf4j.query.TupleQueryResult;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.researchspace.cache.CacheManager;
import org.researchspace.data.rdf.PointedGraph;
import org.researchspace.repository.MpRepositoryProvider;
import org.researchspace.services.storage.api.PlatformStorage;
import org.researchspace.services.storage.api.StorageException;
import org.researchspace.vocabulary.LDP;
import org.researchspace.vocabulary.PLATFORM;
import org.researchspace.vocabulary.PROV;

import com.google.common.base.Throwables;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 */
public abstract class AbstractLDPContainer extends AbstractLDPResource implements LDPContainer {

    @Inject
    protected CacheManager cacheManager;

    @Inject
    protected PlatformStorage platformStorage;

    public AbstractLDPContainer(IRI iri, MpRepositoryProvider repositoryProvider) {
        super(iri, repositoryProvider);
    }

    @Override
    public Model getModel() throws RepositoryException {
        Model containerModel = super.getModel();

        // include all outgoing edges from contained resources
        Model m = new LinkedHashModel(containerModel);
        for (Value o : getContainedResources()) {
            m.addAll(getReadConnection().getOutgoingStatements((IRI) o));
        }

        return m;
    }

    @Override
    public Set<IRI> getLDPTypes() {
        Set<IRI> set = super.getLDPTypes();
        set.add(LDP.Container);
        return set;
    }

    @Override
    public IRI add(PointedGraph pointedGraph) throws RepositoryException {
        try (RepositoryConnection connection = getRepository().getConnection()) {
            add(pointedGraph, connection);
        }
        return pointedGraph.getPointer();
    }

    protected void add(PointedGraph pointedGraph, RepositoryConnection repConnection) throws RepositoryException {
        PointedGraph pg = addLdpContainerRelation(addProvenance(pointedGraph));

        IRI contextUri = new DefaultLDPResource(pointedGraph.getPointer(), this.repositoryProvider).getContextIRI();
        if (isSavedToStorage()) {
            try {
                saveToStorage(pg, contextUri);
            } catch (StorageException e) {
                throw new RepositoryException("Cannot save the object " + pointedGraph.getPointer().stringValue()
                        + " to storage: " + e.getMessage(), e);
            }
        }
        repConnection.add(pg.getGraph(), contextUri);
    }

    @Override
    public void update(PointedGraph pointedGraph) throws RepositoryException {
        try (RepositoryConnection connection = getRepository().getConnection()) {
            connection.begin();
            LDPResource toDelete = getLdpApi().getLDPResource(pointedGraph.getPointer());
            if (!AbstractLDPResource.class.isAssignableFrom(toDelete.getClass())) {
                throw new IllegalStateException("LDP Resource implementation " + toDelete.getClass() + " must extend "
                        + AbstractLDPResource.class + " for save transaction handling.");
            }
            ((AbstractLDPResource) toDelete).delete(connection, new HashSet<>());
            add(pointedGraph, connection);
            connection.commit();
        }
        cacheManager.invalidateResources(Collections.singleton(pointedGraph.getPointer()));
    }

    /**
     * Updates LDP resource's graph by replacing label of the resource with a new
     * one.
     *
     * @param resourceIri Target LDP resource to replace label of
     * @param newName     New label for the resource
     */
    public void rename(IRI resourceIri, String newName) throws RepositoryException {
        LDPResource resource;
        try {
            resource = getLdpApi().getLDPResource(resourceIri);
        } catch (Exception ex) {
            throw Throwables.propagate(ex);
        }

        Model model = resource.getModel();
        model.remove(resourceIri, RDFS.LABEL, null);
        model.add(resourceIri, RDFS.LABEL, vf.createLiteral(newName));

        this.update(new PointedGraph(resourceIri, model));
    }

    @Override
    public boolean isContainer() {
        return true;
    }

    protected PointedGraph addLdpContainerRelation(PointedGraph pointedGraph) {
        Model graph = pointedGraph.getGraph();
        // link to root
        graph.add(this.getResourceIRI(), LDP.contains, pointedGraph.getPointer());
        graph.add(pointedGraph.getPointer(), RDF.TYPE, LDP.Resource);
        return pointedGraph;
    }

    protected PointedGraph addProvenance(PointedGraph pg) {
        // TODO some basic implementation of default provenance information

        Model m = pg.getGraph();
        m.add(pg.getPointer(), RDF.TYPE, PROV.Entity);
        m.add(pg.getPointer(), PROV.wasAttributedTo, getUserIri());
        m.add(pg.getPointer(), PROV.generatedAtTime, vf.createLiteral(new Date()));
        pg.setGraph(m);
        return pg;

    }

    protected IRI getUserIri() {
        try {
            return ns.getUserIRI();
        } catch (UnavailableSecurityManagerException e) {
            // There is not security manager in the thread context, i.e.,
            // the method is invoked by the platform itself
            // without being triggered by the user
            return PLATFORM.SYSTEM_USER_INDIVIDUAL;
        }
    }

    /**
     * Initialize will be called explicitly <b>after</b> creating the
     * {@link LDPContainer} class instance. The default implementation ensures that
     * the container will get properly typed with at least {@link LDP#Resource} and
     * {@link LDP#Container}.
     *
     * Specific implementations may override this method in order to attach more
     * detailed meta-data, for example, {@link RDFS#COMMENT}.
     *
     * @see org.researchspace.data.rdf.container.LDPContainer#initialize()
     */
    @Override
    public void initialize() throws RepositoryException {
        if (!getReadConnection().hasOutgoingStatements(this.getResourceIRI())) {
            LinkedHashModel m = new LinkedHashModel();
            m.add(vf.createStatement(this.getResourceIRI(), RDF.TYPE, LDP.Container));
            m.add(vf.createStatement(this.getResourceIRI(), RDF.TYPE, LDP.Resource));
            try {
                // we can not use the Provider<RootContainer> here, due to recursive loading
                getRootContainer().add(new PointedGraph(this.getResourceIRI(), m));
            } catch (RepositoryException e) {
                throw Throwables.propagate(e);
            }
        }

    }

    @Override
    public Set<Resource> getContainedResources() throws RepositoryException {
        Model m = getReadConnection().getStatements(this.getResourceIRI(), LDP.contains, null);
        return Models.objectResources(m);
    }

    @Override
    public boolean containsLDPResource(Resource resource) {
        // TODO
        // this should be better done via ASK query, however,
        // there are currently some issues with Virtuoso
        final String query = "SELECT ?containedResource WHERE {"
                + "?container <http://www.w3.org/ns/ldp#contains> ?containedResource" + "} LIMIT 1";
        TupleQuery tq = null;
        try (RepositoryConnection con = getConnection()) {
            tq = con.prepareTupleQuery(QueryLanguage.SPARQL, query);
            tq.setBinding("container", this.getResourceIRI());
            tq.setBinding("containedResource", resource);
            try (TupleQueryResult result = tq.evaluate()) {
                // we need to fully consume result, otherwise we can run into issue with rdf4j
                return Iterations.asList(result).size() > 0;
            }
        } catch (Exception e) {
            throw Throwables.propagate(e);
        }
    }
}
