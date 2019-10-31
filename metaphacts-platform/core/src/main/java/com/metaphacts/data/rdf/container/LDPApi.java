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

import java.io.IOException;
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.BiConsumer;
import java.util.function.Consumer;

import com.google.common.base.Throwables;
import com.google.common.collect.Lists;
import com.google.common.collect.Maps;
import com.metaphacts.api.sparql.SparqlOperationBuilder;
import com.metaphacts.config.NamespaceRegistry;

import org.apache.commons.lang3.RandomStringUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.common.net.ParsedIRI;
import org.eclipse.rdf4j.model.BNode;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.Statement;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.LinkedHashModel;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.util.URIUtil;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.TupleQuery;
import org.eclipse.rdf4j.query.TupleQueryResult;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.eclipse.rdf4j.rio.RDFParseException;
import org.eclipse.rdf4j.rio.Rio;
import org.eclipse.rdf4j.rio.UnsupportedRDFormatException;

import com.google.common.collect.Sets;

import com.metaphacts.data.rdf.ModelUtils;
import com.metaphacts.data.rdf.PointedGraph;
import com.metaphacts.data.rdf.ReadConnection;
import com.metaphacts.repository.MpRepositoryProvider;
import com.metaphacts.vocabulary.LDP;
import com.metaphacts.vocabulary.PROV;

/**
 * Shouldn't be used directly, see {@link LDPApiInternal} and {@link PermissionsAwareLDPApi}.
 *
 * @author Johannes Trame <jt@metaphacts.com>
 */
class LDPApi {

    private static final Logger logger = LogManager.getLogger(LDPApi.class);

    private final ReadConnection read ;
    private final ValueFactory vf;
    protected final MpRepositoryProvider repositoryProvider;
    private final NamespaceRegistry ns;

    protected LDPApi(MpRepositoryProvider repositoryProvider, NamespaceRegistry ns){
        this.repositoryProvider = repositoryProvider;
        this.read = new ReadConnection(repositoryProvider.getRepository());
        this.vf =  SimpleValueFactory.getInstance();
        this.ns = ns;
    }

    protected LDPResource getLDPResource(IRI uri, BiConsumer<IRI, LDPResource> permissionCheck) {
        LDPResource resource = this.getLDPResource(uri);
        LDPContainer parent = (LDPContainer) getLDPResource(resource.getParentContainer());
        permissionCheck.accept(parent.getResourceType(), resource);
        return resource;
    }

    private LDPResource getLDPResource(IRI  uri) {
        if(uri.equals(RootContainer.IRI) || read.hasType(uri, LDP.Resource))
            return LDPImplManager.getLDPImplementation(uri,getLDPTypesFromRepository(uri), this.repositoryProvider);

        throw new LDPResourceNotFoundException("There exists no LDP Resource "+uri);
    }

    protected void deleteLDPResource(IRI uri, BiConsumer<IRI, LDPResource> permissionCheck) throws RepositoryException {
        LDPResource resource = this.getLDPResource(uri);
        LDPContainer parent = (LDPContainer) getLDPResource(resource.getParentContainer());
        permissionCheck.accept(parent.getResourceType(), resource);
        resource.delete();
    }

    protected LDPResource createLDPResource(Optional<String> slug,
        RDFStream stream, IRI targetContainer, String instanceBase,
        Consumer<LDPContainer> permissionCheck
    ) {
        LDPResource target = LDPImplManager.getLDPImplementation(targetContainer, getLDPTypesFromRepository(targetContainer), this.repositoryProvider);
        if(!LDPContainer.class.isAssignableFrom(target.getClass()))
            throw new IllegalArgumentException("Target resource " + targetContainer +" is not a container.");

        permissionCheck.accept((LDPContainer) target);

        IRI newResource = createResourceIRI(slug, targetContainer, instanceBase);
        PointedGraph resourceModelToCreate = createPointedGraph(stream, newResource);
        IRI createdResourceURI = ((LDPContainer) target).add(resourceModelToCreate);
        return getLDPResource(createdResourceURI);
    }


    /**
     * Removes metadata triples for container item
     */
    private Model removeContainerItemMetadata(Model model, List<IRI> rootIRIs) {
        Model result = new LinkedHashModel();
        Set<Value> ldpResourceRoots = model.filter(null, LDP.contains, null).objects();
        for (Statement triple : model) {
            boolean isMetadataPO =
                triple.getPredicate().equals(RDF.TYPE) && (
                    triple.getObject().equals(PROV.Entity) ||
                    triple.getObject().equals(LDP.Resource)
                ) ||
                triple.getPredicate().equals(PROV.wasAttributedTo) ||
                triple.getPredicate().equals(PROV.wasGeneratedBy) ||
                triple.getPredicate().equals(PROV.generatedAtTime);
            boolean isMetadataS =
                rootIRIs.contains(triple.getSubject()) ||
                ldpResourceRoots.contains(triple.getSubject());
            boolean isMetadataTriple = isMetadataS && isMetadataPO;
            if (!isMetadataTriple) {
                result.add(triple);
            }
        }
        return result;
    }

    /**
     * Changes root of container items with string replacement for any related IRIs like root/body
     */
    private Model changeContainerItemRoot(Model model, IRI oldRoot, IRI newRoot) {
        Model result = new LinkedHashModel();
        for (Statement triple : model) {
            boolean changeS = false;
            boolean changeO = false;
            String copyS = triple.getSubject().stringValue();
            String copyO = triple.getObject().stringValue();
            if (copyS.startsWith(oldRoot.stringValue())) {
                changeS = true;
                copyS = copyS.replace(oldRoot.stringValue(), newRoot.stringValue());
            }
            if (triple.getObject() instanceof Resource && copyO.startsWith(oldRoot.stringValue())) {
                changeO = true;
                copyO = copyO.replace(oldRoot.stringValue(), newRoot.stringValue());
            }
            if (changeS && changeO) {
                result.add(vf.createIRI(copyS), triple.getPredicate(), vf.createIRI(copyO));
            } else if (changeS) {
                result.add(vf.createIRI(copyS), triple.getPredicate(), triple.getObject());
            } else if (changeO) {
                result.add(triple.getSubject(), triple.getPredicate(), vf.createIRI(copyO));
            } else {
                result.add(triple);
            }
        }
        return result;
    }

    /**
     * Replaces rdfs:label of container root if present
     */
    private Model replaceContainerLabel(Model model, IRI rootIRI, String newLabel) {
        Model result = new LinkedHashModel();
        for (Statement triple : model) {
            if (triple.getSubject().equals(rootIRI) && triple.getPredicate().equals(RDFS.LABEL)) {
                result.add(rootIRI, RDFS.LABEL, vf.createLiteral(newLabel));
            } else {
                result.add(triple);
            }
        }
        return result;
    }

    protected LDPResource copyLDPResource(
        Optional<String> slug,
        IRI uri,
        Optional<IRI> targetContainer,
        String instanceBase,
        BiConsumer<IRI, LDPResource> resourcePermissionCheck,
        Consumer<LDPContainer> containerPermissionCheck
    ) {
        LDPResource original = getLDPResource(uri, resourcePermissionCheck);
        IRI parentContainer = targetContainer.orElse(original.getParentContainer());
        IRI newResource = createResourceIRI(slug, parentContainer, instanceBase);

        Model model = original.getModel();
        model = removeContainerItemMetadata(model, Lists.newArrayList(uri));
        model = changeContainerItemRoot(model, uri, newResource);
        if (slug.isPresent()) {
            model = replaceContainerLabel(model, newResource, slug.get());
        }
        PointedGraph resourceModelToCreate = new PointedGraph(newResource, model);

        LDPResource target = LDPImplManager.getLDPImplementation(parentContainer, getLDPTypesFromRepository(parentContainer), this.repositoryProvider);
        if(!LDPContainer.class.isAssignableFrom(target.getClass())) {
            throw new IllegalArgumentException("Target resource " + parentContainer + " is not a container.");
        }
        containerPermissionCheck.accept((LDPContainer) target);
        IRI createdResourceURI = ((LDPContainer) target).add(resourceModelToCreate);
        return getLDPResource(createdResourceURI);
    }

    /**
     * Export recursively LDP resources with everything it ldp:contains
     * and hint about container types where it can be stored
     */
    protected Model exportLDPResource(List<IRI> iris, BiConsumer<IRI, LDPResource> permissionCheck) {
        Model result = new LinkedHashModel();
        for (IRI iri : iris) {
            result.addAll(this.exportLDPResource(iri, permissionCheck));
        }
        return result;
    }

    /**
     * Export recursively LDP resources with everything it ldp:contains
     * and hint about container types where it can be stored
     */
    protected Model exportLDPResource(IRI iri, BiConsumer<IRI, LDPResource> permissionCheck) {
        Model result = new LinkedHashModel();
        LDPResource ldpResource = getLDPResource(iri);
        permissionCheck.accept(iri, ldpResource);
        Model model = ldpResource.getModelRecursive();
        Model containers = read.getStatements(null, LDP.contains, iri);
        for (Statement triple : containers) {
            BNode containerBNode = vf.createBNode();
            model.add(containerBNode, LDP.contains, iri, triple.getContext());
            Set<IRI> containerTypes = getLDPTypesFromRepository((IRI) triple.getSubject());
            for (IRI containerType : containerTypes) {
                model.add(containerBNode, RDF.TYPE, containerType);
            }
        }
        for (Statement triple : model) {
            result.add(triple);
        }
        return result;
    }

    private Set<IRI> getImportPossibleContainers(Model resource) {
        // look for blank nodes with rdf:type predicates
        Map<String, List<IRI>> bnodeTypes = new HashMap<>();
        for (Statement stmt : resource) {
            if (stmt.getSubject() instanceof BNode && stmt.getPredicate().equals(RDF.TYPE)) {
                String id = ((BNode) stmt.getSubject()).getID();
                if (!bnodeTypes.containsKey(id)) {
                    bnodeTypes.put(id, new ArrayList<IRI>());
                }
                bnodeTypes.get(id).add((IRI) stmt.getObject());
            }
        }

        // Collect blank node ids representing containers
        Set<String> containerBNodeIds = Sets.newHashSet();
        for (Statement stmt : resource) {
            if (stmt.getSubject() instanceof BNode && stmt.getPredicate().equals(LDP.contains)) {
                String id = ((BNode) stmt.getSubject()).getID();
                containerBNodeIds.add(id);
            }
        }

        // find all containers that have superset of rdf:types for all such blank node
        Set<IRI> types = Sets.newHashSet();
        for (String bnodeId : bnodeTypes.keySet()) {
            if (containerBNodeIds.contains(bnodeId)) {
                for (IRI type : bnodeTypes.get(bnodeId)) {
                    types.add(type);
                }
            }
        }

        String query = "SELECT ?cont WHERE {";
        for (IRI type : types) {
            query += "?cont rdf:type <" + type.stringValue() + "> .";
        }
        query += "}";
        logger.debug("Query to get possible containers to import into: " + query);

        Set<IRI> result = Sets.newHashSet();
        SparqlOperationBuilder<TupleQuery> builder = SparqlOperationBuilder.create(query, TupleQuery.class);
        try (RepositoryConnection readConn = read.getRepository().getConnection()) {
            TupleQuery tq = builder.build(readConn);
            try (TupleQueryResult queryResult = tq.evaluate()){
                while (queryResult.hasNext()) {
                    BindingSet next = queryResult.next();
                    // sometimes triplestores can return empty bindings for query like
                    // SELECT ?cont WHERE {}
                    if (next.hasBinding("cont")) {
                        result.add((IRI) next.getBinding("cont").getValue());
                    }
                }
            }
        }
        return result;
    }

    private void getImportTopologicalSortDFS(Map<IRI, Set<IRI>> adjacencyList, IRI root, List<IRI> result, Set<IRI> used) {
        used.add(root);
        for (IRI child : adjacencyList.getOrDefault(root, Sets.newHashSet())) {
            if (!used.contains(child)) {
                getImportTopologicalSortDFS(adjacencyList, child, result, used);
            }
        }
        result.add(root);
    }

    private List<IRI> getImportTopologicalSort(Map<IRI, Set<IRI>> adjacencyList, List<IRI> roots) {
        List<IRI> result = Lists.newArrayList();
        Set<IRI> used = Sets.newHashSet();
        for (IRI root : roots) {
            getImportTopologicalSortDFS(adjacencyList, root, result, used);
        }
        return Lists.reverse(result);
    }

    private LDPContainer getImportContainerToAddInto(IRI parentIRI) {
        LDPResource parentResource = LDPImplManager.getLDPImplementation(
            parentIRI,
            getLDPTypesFromRepository(parentIRI),
            this.repositoryProvider
        );
        if (!LDPContainer.class.isAssignableFrom(parentResource.getClass())) {
            throw new IllegalArgumentException("Target resource " + parentIRI + " is not a container.");
        }
        return (LDPContainer) parentResource;
    }

    private String getImportSlugForResource(Model resource, IRI root) {
        String slug = "imported";
        for (Statement statement : resource.filter(root, RDFS.LABEL, null)) {
            slug = statement.getObject().stringValue();
        }
        return slug;
    }

    private List<IRI> addImportGraph(List<IRI> roots, Model graph, String instanceBase, Consumer<LDPContainer> permissionCheck) {
        Map<IRI, Set<IRI>> adjacencyList = Maps.newHashMap();
        Map<IRI, IRI> contexts = Maps.newHashMap();
        Map<IRI, Set<IRI>> parents = Maps.newHashMap();
        // get all edges A contains B with Bctx
        for (Statement stmt : graph.filter(null, LDP.contains, null)) {
            IRI s = (IRI) stmt.getSubject();
            IRI o = (IRI) stmt.getObject();
            IRI ctx = (IRI) stmt.getContext();
            contexts.put(o, ctx);
            if (!adjacencyList.containsKey(s)) { adjacencyList.put(s, Sets.newHashSet()); }
            adjacencyList.get(s).add(o);
            if (!parents.containsKey(o)) { parents.put(o, Sets.newHashSet()); }
            parents.get(o).add(s);
        }

        List<IRI> topSort = getImportTopologicalSort(adjacencyList, roots);

        // in order of topsort add triples from child context into container of A, rename if needed
        Map<IRI, IRI> renamedIRIs = Maps.newHashMap();
        for (IRI item : topSort) {
            Model model = graph.filter(null, null, null, contexts.get(item));
            model.remove(null, LDP.contains, null);
            for (IRI parentIRI : parents.getOrDefault(item, Sets.newHashSet())) {
                IRI insertIntoIRI = renamedIRIs.getOrDefault(parentIRI, parentIRI);

                // Use source root IRI if it is not part of some container
                // else generate it from rdfs:label (assume "imported" if none)
                IRI itemRenamed = null;
                if (!resourceAlreadyExistsInContainer(item)) {
                    itemRenamed = item;
                } else {
                    String slug = getImportSlugForResource(model, item);
                    itemRenamed = createResourceIRI(Optional.of(slug), insertIntoIRI, instanceBase);
                }

                Model modelRenamed = changeContainerItemRoot(model, item, itemRenamed);
                LDPContainer parentContainer = getImportContainerToAddInto(insertIntoIRI);
                permissionCheck.accept(parentContainer);
                IRI createdResourceURI = parentContainer.add(new PointedGraph(itemRenamed, modelRenamed));
                renamedIRIs.put(item, createdResourceURI);
            }
        }

        List<IRI> result = Lists.newArrayList();
        for (IRI root : roots) {
            result.add(renamedIRIs.get(root));
        }
        return result;
    }

    /**
     * Import exported LDP resource, recursively adding new (possibly renamed) items into containers
     * Steps:
     * 1) determine root of import data by hint bnode ldp:contains root
     * 2) determine set of containers where data can be import into by hint bnode a list_of_types and SPARQL query
     * 3) remove provenance metadata (added by LDPContainer.add) and hint from data
     * 4) determine set of unknown objects
     * 5) if import cannot be done then return null, request will be put into delayed cache for clarifying params
     * 6) run topological sort over ldp:contains DAG for determining order of inserts (higher = earlier)
     * 7) by order of topsort:
     *      prepare single entity graph by context
     *      create LDP resource (possibly renamed)
     *      rename entity data IRIs according to created resource (currently by prefix substitute)
     *      add resource and save it created IRI for further inserts
     * @param resource           Model of data to import
     * @param possibleContainers Will store containers from DB where data can be imported into
     * @param containerIRI       If there are more than one possible container, user can choose one of
     * @param unknownObjects     Will store objects not present in DB or import data
     * @param force              Set as true if you don't care about unknown objects
     * @param instanceBase
     * @return                   Imported resource or null if |possibleContainers| != 1 and containerIRI is not set or
     *                           if |unknownObjects| > 0 and force=false
     */
    protected List<LDPResource> importLDPResource(
        Model resource,
        Set<IRI> possibleContainers,
        Optional<IRI> containerIRI,
        Set<IRI> unknownObjects,
        boolean force,
        String instanceBase,
        Consumer<LDPContainer> permissionCheck
    ) {
        // find root of resource
        List<IRI> roots = Lists.newArrayList();
        Set<String> placeholders = Sets.newHashSet();
        for (Statement stmt : resource) {
            if (stmt.getSubject() instanceof BNode && stmt.getPredicate().equals(LDP.contains)) {
                IRI root = (IRI) stmt.getObject();
                roots.add(root);
                BNode placeholder = (BNode) stmt.getSubject();
                placeholders.add(placeholder.getID());
            }
        }
        if (roots.isEmpty()) {
            throw new IllegalArgumentException("Can not find root IRI looking for _bnode ldp:contains ?root");
        }

        Set<IRI> addPossibleContainers = getImportPossibleContainers(resource);
        possibleContainers.addAll(addPossibleContainers);

        // filter resource from added hint for container
        Model filteredResource = new LinkedHashModel();
        for (Statement stmt : resource) {
            if (!(stmt.getSubject() instanceof BNode && placeholders.contains(((BNode) stmt.getSubject()).getID()))) {
                filteredResource.add(stmt);
            }
        }
        filteredResource = removeContainerItemMetadata(filteredResource, roots);

        // check if all Objects \setminus Subjects are present in DB
        for (Value object : filteredResource.objects()) {
            if (object instanceof IRI && !filteredResource.subjects().contains(object)) {
                if (!(read.hasOutgoingStatements((IRI) object) || read.hasIncomingStatements((IRI) object))) {
                    unknownObjects.add((IRI) object);
                }
            }
        }

        // if import request can be done immediately, do it, else put it in delayed cache
        boolean success = (unknownObjects.isEmpty() || force) && (possibleContainers.size() == 1 || containerIRI.isPresent());
        if (!success) {
            return null;
        }

        IRI parentIRI = containerIRI.orElseGet(() -> (IRI) possibleContainers.toArray()[0]);
        for (IRI root : roots) {
            for (Statement stmt : resource.filter(null, LDP.contains, root)) {
                filteredResource.add(parentIRI, LDP.contains, root, stmt.getContext());
            }
        }
        List<IRI> newRoots = addImportGraph(roots, filteredResource, instanceBase,  permissionCheck);

        List<LDPResource> result = Lists.newArrayList();
        for (IRI newRoot : newRoots) {
            result.add(getLDPResource(newRoot));
        }
        return result;
    }


    protected LDPResource updateLDPResource(
        RDFStream stream, IRI resourceToUpdate, BiConsumer<IRI, LDPResource> permissionCheck
    ) {
        LDPResource toUpdate = getLDPResource(resourceToUpdate);
        PointedGraph pointedGraph = createPointedGraph(stream, toUpdate.getResourceIRI() );
        return updatePointedGraph(pointedGraph, toUpdate, resourceToUpdate, permissionCheck);
    }

    protected LDPResource updatePointedGraph(
            PointedGraph pointedGraph,
            LDPResource toUpdate,
            IRI resourceToUpdate,
            BiConsumer<IRI, LDPResource> permissionCheck) {
        LDPResource parent = getLDPResource(toUpdate.getParentContainer());
        if(!LDPContainer.class.isAssignableFrom(parent.getClass()))
            throw new IllegalArgumentException("Parent of resource "+resourceToUpdate +"is not a container.");
        LDPContainer container = (LDPContainer) parent;

        permissionCheck.accept(container.getResourceType(), toUpdate);

        container.update(pointedGraph);
        return getLDPResource(resourceToUpdate);
    }

    private PointedGraph createPointedGraph(RDFStream rdfStream, IRI nullRelativeURI) {
        PointedGraph resourceModelToCreate = deserialize(rdfStream, nullRelativeURI);


        if(!resourceModelToCreate.getPointer().equals(nullRelativeURI))
            throw new IllegalStateException("Null relative IRI not available or wrongly set. "
                    + "Please refer to http://www.w3.org/TR/ldp/#ldpc-post-rdfnullrel for further information.");


        return resourceModelToCreate;
    }

    Set<IRI> getLDPTypesFromRepository(IRI  uri){
        Set<IRI> types = Sets.newHashSet();
        for(Resource r: read.getTypes(uri)){
            if(r instanceof IRI){
                types.add((IRI)r); //TODO
            }
        }
        return types;
    }

    private boolean resourceAlreadyExistsInContainer(IRI resource) {
        return read.hasStatement(null, LDP.contains, resource);
    }

    /**
     * 1) If slug is valid IRI: if it is already in use as a resource IRI
     *    throw IllegalArgumentException otherwise use it as a new resource IRI.
     * 2) If slug is not an IRI, then use it as a local name of new IRI.
     * 3) If slag contains illegal characters the new constructed IRI is not a valid IRI then
     *    throw IllegalArgumentException
     */
    protected IRI createResourceIRI(Optional<String> slug, IRI targetContainer, String newInstanceBase) {
        String _slug = slug.orElse(generateRundomSlug()).replaceAll("\\s", "_");
        if (isValidIRIReference(_slug)) {
            if (resourceAlreadyExistsInContainer(vf.createIRI(_slug))) {
                throw new IllegalArgumentException("Resource with the given IRI already exists in some LDP container: " + _slug);
            } else {
                return vf.createIRI(slug.get());
            }
        }

        String localName = _slug;
        String instanceBase = this.ns.getNamespace(NamespaceRegistry.RuntimeNamespace.LDP).orElse(newInstanceBase);
        String host = instanceBase.endsWith("/") ? instanceBase : instanceBase + "/";
        IRI iri = vf.createIRI(host + targetContainer.getLocalName() + "/" + localName); //TODO something better than default namespace e.g. physical server address

        try { // Check if iri is correct
            new ParsedIRI(iri.stringValue());
        } catch (URISyntaxException e) {
            throw new IllegalArgumentException("Provided slug contains illegal characters: " + _slug, e);
        }

        if(resourceAlreadyExistsInContainer(iri))
                return createResourceIRI(Optional.ofNullable(RandomStringUtils.randomAlphabetic(40).replaceAll("\\s", "_")), targetContainer,  newInstanceBase);
        return iri;
    }

    private boolean isValidIRIReference(String stringIri) {
        try {
            return stringIri != null && new ParsedIRI(stringIri).isAbsolute();
        } catch (URISyntaxException e) {
            return false;
        }
    }

    private PointedGraph deserialize(RDFStream stream, IRI newResourceUri) throws RDFParseException, UnsupportedRDFormatException {
        IRI _newResourceUri = newResourceUri;

        //if suggested resource contains hash, use a dummy IRI as baseURI for parsing
        if(newResourceUri.stringValue().contains("#")){
            if(logger.isTraceEnabled()) logger.trace("Suggest IRI for new resource contains hash. Using a dummy IRI for parsing.");
            _newResourceUri = vf.createIRI("http://www.baseURI.org/"+RandomStringUtils.randomAlphabetic(40).replaceAll("\\s", "_"));
        }

        Model graph;
        try {
            graph = Rio.parse(stream.getInputStream(), _newResourceUri.stringValue(), stream.getFormat());
        } catch (IOException e) {
            throw Throwables.propagate(e);
        }

        //... and replace dummy IRI afterwards again
        if(!_newResourceUri.equals(newResourceUri)){
            graph = ModelUtils.replaceSubjectAndObjects(graph, _newResourceUri, newResourceUri);
        }

        if(graph.contains(null, LDP.contains, null))
            throw new IllegalArgumentException("Statements to be added to the LDP Resource MUST NOT contain any ldp:contains relations.");

        return new PointedGraph(newResourceUri, graph);
    }

    private static String generateRundomSlug() {
        return UUID.randomUUID().toString();
    }
}
