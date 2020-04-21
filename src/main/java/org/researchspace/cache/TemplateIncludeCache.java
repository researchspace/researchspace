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

package org.researchspace.cache;

import java.util.LinkedHashSet;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.TimeUnit;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.MalformedQueryException;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.query.TupleQuery;
import org.eclipse.rdf4j.query.TupleQueryResult;
import org.eclipse.rdf4j.repository.Repository;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.researchspace.api.sparql.SparqlOperationBuilder;
import org.researchspace.config.Configuration;
import org.researchspace.config.NamespaceRegistry;

import com.google.common.base.Throwables;
import com.google.common.cache.Cache;
import com.google.common.collect.Sets;
import com.google.inject.Inject;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 */
public class TemplateIncludeCache implements PlatformCache {

    public static final String CACHE_ID = "platform.TemplateIncludeCache";

    private static final Logger logger = LogManager.getLogger(TemplateIncludeCache.class);

    private Configuration config;

    private final Cache<IRI, LinkedHashSet<Resource>> includeTypesCache;

    @Inject
    public TemplateIncludeCache(Configuration config, CacheManager cacheManager) {
        this.config = config;
        includeTypesCache = cacheManager.newBuilder(CACHE_ID,
                cacheBuilder -> cacheBuilder.maximumSize(1000).expireAfterAccess(30, TimeUnit.MINUTES)).build();
        cacheManager.register(this);
    }

    /**
     * Returns as set of resources (most likely {@link IRI}s) to be included for a
     * given resource value (i.e. requested page). Uses as {@link LinkedHashSet}, as
     * insertion order needs to preserved.
     *
     * @author jt
     * @return
     */
    public LinkedHashSet<Resource> getTypesForIncludeScheme(Repository repository, IRI value,
            Optional<NamespaceRegistry> ns) {

        // return from cache if possible
        if (includeTypesCache.getIfPresent(value) != null) {
            return includeTypesCache.getIfPresent(value);
        }

        String includeSchemeQuery = config.getUiConfig().getTemplateIncludeQuery();
        LinkedHashSet<Resource> newResourceSet = Sets.newLinkedHashSet();
        SparqlOperationBuilder<TupleQuery> builder = SparqlOperationBuilder.<TupleQuery>create(includeSchemeQuery,
                TupleQuery.class);
        try (RepositoryConnection con = repository.getConnection()) {
            SparqlOperationBuilder<TupleQuery> tq = builder.resolveThis(value);
            // set namespaces
            ns.map(registry -> tq.setNamespaces(registry.getPrefixMap()));
            try (TupleQueryResult tqr = tq.build(con).evaluate()) {
                if (!tqr.getBindingNames().contains("type")) {
                    throw new IllegalArgumentException(
                            "Query as specified in \"templateIncludeQuery\" config for extracting the wiki include types must return a binding with name \"type\". ");
                }

                while (tqr.hasNext()) {
                    BindingSet r = tqr.next();
                    Value v = r.getValue("type");
                    // unlikely, we can not return here if null since the query may contain
                    // optionals
                    if (v != null && (v instanceof IRI)) {
                        newResourceSet.add((Resource) v);
                    }
                }
            }

        } catch (MalformedQueryException | IllegalArgumentException e) {
            logger.error(
                    "Query as specified in \"templateIncludeQuery\" config for extracting the wiki include types is invalid.");
            logger.debug("Details:", e);
            Throwables.throwIfUnchecked(e);
            throw new RuntimeException(e);
        } catch (QueryEvaluationException | RepositoryException e) {
            logger.error("Something went wrong during query execution for extracting the \"templateIncludeQuery\".");
            logger.debug("Details:", e);
            Throwables.throwIfUnchecked(e);
            throw new RuntimeException(e);
        } catch (Exception e) {
            logger.error("Something went wrong during extraction of the \"templateIncludeQuery\".");
            logger.debug("Details:", e);
            Throwables.throwIfUnchecked(e);
            throw new RuntimeException(e);
        }

        includeTypesCache.put(value, newResourceSet);
        return newResourceSet;
    }

    @Override
    public void invalidate() {
        includeTypesCache.invalidateAll();
    }

    @Override
    public void invalidate(Set<IRI> iris) {
        includeTypesCache.invalidateAll(iris);
    }

    @Override
    public String getId() {
        return CACHE_ID;
    }

}
