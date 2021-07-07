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

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

import javax.inject.Inject;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Statement;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.LinkedHashModel;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.util.ModelException;
import org.eclipse.rdf4j.model.util.Models;
import org.eclipse.rdf4j.repository.Repository;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.eclipse.rdf4j.repository.util.Repositories;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.eclipse.rdf4j.rio.Rio;
import org.researchspace.config.Configuration;
import org.researchspace.config.NamespaceRegistry;
import org.researchspace.data.rdf.PointedGraph;
import org.researchspace.data.rdf.ReadConnection;
import org.researchspace.repository.MpRepositoryProvider;
import org.researchspace.security.SecurityService;
import org.researchspace.services.storage.api.*;
import org.researchspace.services.storage.api.PlatformStorage.FindResult;
import org.researchspace.vocabulary.LDP;
import org.researchspace.vocabulary.PLATFORM;
import org.researchspace.vocabulary.PROV;

import com.google.common.cache.Cache;
import com.google.common.cache.CacheBuilder;
import com.google.common.collect.Sets;
import com.google.inject.Injector;

/**
 * Default implementation of a {@link LDPResource}. Please always extend this
 * implementation instead of implementing {@link LDPResource} directly.
 *
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public abstract class AbstractLDPResource implements LDPResource {
    private static final Logger logger = LogManager.getLogger(AbstractLDPResource.class);

    protected static ValueFactory VF = SimpleValueFactory.getInstance();

    @Inject
    protected NamespaceRegistry ns;

    @Inject // TODO move to a factory https://github.com/google/guice/wiki/AssistedInject
    private Injector injector;

    @Inject
    private PlatformStorage platformStorage;

    @Inject
    private Configuration configuration;

    private ReadConnection read;

    private LDPApiInternal ldpApi;

    protected static final ValueFactory vf = SimpleValueFactory.getInstance();

    private final IRI resourceIRI;

    protected final MpRepositoryProvider repositoryProvider;

    private static final Cache<Repository, RootContainer> rootContainer = CacheBuilder.newBuilder().maximumSize(5)
            .expireAfterAccess(30, TimeUnit.MINUTES).build();

    public AbstractLDPResource(IRI iri, MpRepositoryProvider repositoryProvider) {
        this.resourceIRI = iri;
        this.repositoryProvider = repositoryProvider;
    }

    @Override
    public Model getModel() throws RepositoryException {
        IRI context = this.getContextIRI();
        Model model = getReadConnection().getContext(this.getContextIRI());
        SimpleValueFactory valueFactory = SimpleValueFactory.getInstance();
        // workaround, QueryResults.asModel ignores context in getStatement result
        // if search context is set and returns model with context=null even with
        // enabled quads mode
        Model m = new LinkedHashModel(model.stream()
                .map(s -> valueFactory.createStatement(s.getSubject(), s.getPredicate(), s.getObject(), context))
                .collect(Collectors.toList()));
        // add outgoing contains (i.e. stored in different contexts)
        Model containsStmts = getReadConnection().getStatements(this.getResourceIRI(), LDP.contains, null);
        m.addAll(containsStmts);
        // but hide incoming statements (i.e. contains from parents)
        m.remove(null, null, this.getResourceIRI());

        return m;
    }

    @Override
    public Model getModelRecursive() {
        Model model = getModel();
        Model m = new LinkedHashModel(model);
        if (isContainer()) {
            for (Value o : ((LDPContainer) this).getContainedResources()) {
                LDPResource ldpResource = LDPImplManager.getLDPImplementation((IRI) o, Sets.newHashSet(),
                        this.repositoryProvider);
                m.addAll(ldpResource.getModelRecursive());
            }
        }
        return m;
    }

    @Override
    public IRI getResourceIRI() {
        return resourceIRI;
    }

    @Override
    public IRI getContextIRI() {
        String r = getResourceIRI().stringValue();
        return vf.createIRI(r + (r.endsWith("/") ? "context" : "/context"));
    }

    @Override
    public void delete() throws RepositoryException {
        try (RepositoryConnection connection = getConnection()) {
            delete(connection, new HashSet<>());
        }
    }

    protected void delete(RepositoryConnection repConnection, Set<IRI> deleting) throws RepositoryException {
        // avoid unbounded recursion by tracking resources being deleted
        if (deleting.contains(this.getResourceIRI())) {
            return;
        }
        deleting.add(this.getResourceIRI());

        for (Statement stmt : getReadConnection().getStatements(this.getResourceIRI(), LDP.contains, null)) {
            IRI childResource = (IRI) stmt.getObject();
            LDPResource instance = LDPImplManager.getLDPImplementation(childResource,
                    getLdpApi().getLDPTypesFromRepository(childResource), this.repositoryProvider);
            if (instance instanceof AbstractLDPResource) {
                ((AbstractLDPResource) instance).delete(repConnection, deleting);
            }
        }

        if (isSavedToStorage()) {
            StoragePath objectId = ObjectKind.LDP.resolve(this.repositoryProvider.getRepositoryId())
                    .resolve(StoragePath.encodeIri(this.resourceIRI)).addExtension(".trig");
            try {
                platformStorage.getStorage(PlatformStorage.DEVELOPMENT_RUNTIME_STORAGE_KEY).deleteObject(objectId,
                        platformStorage.getDefaultMetadata());
                // Check if the object still exists in some app (usually immutable)
                Optional<FindResult> optObject = platformStorage.findObject(objectId);
                if (optObject.isPresent()) {
                    // We need to shadow the object to prevent loading from the app, so we save an
                    // empty
                    // model under the same name into the runtime storage
                    this.saveToStorage(new PointedGraph(this.getResourceIRI(), new LinkedHashModel()),
                            this.getContextIRI());
                }
            } catch (StorageException e) {
                throw new RepositoryException(
                        "Could not delete the object " + objectId + " from storage: " + e.getMessage(), e);
            }
        }

        repConnection.clear(this.getContextIRI());
    }

    @Override
    public Set<IRI> getLDPTypes() {
        return Sets.newHashSet(LDP.Resource);
    }

    @Override
    public IRI getParentContainer() {
        if (this.getResourceIRI().equals(RootContainer.IRI))
            return RootContainer.IRI;
        try {
            IRI parent = Models
                    .subjectIRI(getReadConnection().getContext(this.getContextIRI()).filter(null, LDP.contains,
                            this.getResourceIRI()))
                    .orElseThrow(() -> new IllegalStateException(this.getResourceIRI() + " parent container is null."));

            return parent;
        } catch (ModelException | IllegalStateException e) {
            throw new RuntimeException("The LDP Resource " + this.getResourceIRI()
                    + " has no or an invalid reference to a parent container.", e);
        }
    }

    @Override
    public boolean isContainer() {
        return false;
    }

    /**
     * Returns a {@link RepositoryConnection}. Clients <b>MUST</b> take care for
     * closing connections properly using, for example, auto-closeables: <code>
     * try(RepositoryConnection con = getConnection()){
     * ...
     * }
     * </code>
     * 
     * @return
     * @throws RepositoryException
     */
    protected RepositoryConnection getConnection() throws RepositoryException {
        return getRepository().getConnection();
    }

    /**
     * Returns the {@link Repository} in which the current resource is or will be
     * persisted.
     * 
     * @return
     */
    protected Repository getRepository() {
        return this.repositoryProvider.getRepository();
    }

    protected String getRepositoryId() {
        return this.getRepositoryId();
    }

    protected ReadConnection getReadConnection() {
        if (this.read == null) {
            this.read = new ReadConnection(getRepository());
        }
        return read;
    }

    protected LDPApiInternal getLdpApi() {
        if (this.ldpApi == null) {
            this.ldpApi = new LDPApiInternal(this.repositoryProvider, this.ns);
        }
        return ldpApi;
    }

    protected RootContainer getRootContainer() {
        final Repository repository = this.getRepository();
        try {
            return rootContainer.get(repository, new Callable<RootContainer>() {
                @Override
                public RootContainer call() {
                    logger.debug("Creating new LDP root container instance for repository \"{}\".", repository);
                    RootContainer root = new RootContainer(AbstractLDPResource.this.repositoryProvider);
                    injector.injectMembers(root);
                    return root;
                }
            });
        } catch (ExecutionException e) {
            throw new IllegalStateException(
                    String.format("Failed to retrieve or create root container instanc: %s", e.getMessage()));
        }
    }

    @Override
    public boolean isOwner(IRI user) {
        return Repositories.get(this.getRepository(),
                con -> con.hasStatement(this.getResourceIRI(), PROV.wasAttributedTo, user, false));
    }

    protected boolean isSavedToStorage() {
        return configuration.getGlobalConfig().getRepositoriesLDPSave()
                .contains(this.repositoryProvider.getRepositoryId());
    }

    protected void saveToStorage(PointedGraph pg, IRI contextUri) throws StorageException {
        StoragePath objectId = ObjectKind.LDP.resolve(this.repositoryProvider.getRepositoryId())
                .resolve(StoragePath.encodeIri(pg.getPointer())).addExtension(".trig");

        ByteArrayOutputStream outStream = new ByteArrayOutputStream();

        List<Statement> toWrite = pg.getGraph().stream()
                .map(stmt -> VF.createStatement(stmt.getSubject(), stmt.getPredicate(), stmt.getObject(), contextUri))
                .collect(Collectors.toList());

        Rio.write(toWrite, outStream, RDFFormat.TRIG);
        byte[] bytes = outStream.toByteArray();

        // The author and the creation date are extracted from the graph
        Optional<IRI> optAuthor = Models.getPropertyIRI(pg.getGraph(), pg.getPointer(), PROV.wasAttributedTo);

        Optional<String> author = (optAuthor.isPresent() && optAuthor.get().equals(PLATFORM.SYSTEM_USER_INDIVIDUAL))
                ? Optional.empty()
                : Optional.of(SecurityService.getUserName());

        ByteArrayInputStream content = new ByteArrayInputStream(bytes);
        platformStorage.getStorage(PlatformStorage.DEVELOPMENT_RUNTIME_STORAGE_KEY).appendObject(objectId,
                new ObjectMetadata(author.orElse(null), Instant.now()), content, bytes.length);

    }
}
