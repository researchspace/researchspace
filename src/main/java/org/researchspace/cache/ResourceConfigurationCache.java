package org.researchspace.cache;

import java.net.URLEncoder;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

import javax.annotation.Nullable;

import org.apache.commons.lang3.StringUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Literal;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.repository.Repository;
import org.researchspace.config.Configuration;
import org.researchspace.config.NamespaceRegistry;
import org.researchspace.config.PropertyPattern;
import org.researchspace.rest.endpoint.RepositoryManagerEndpoint;

import com.google.common.collect.Iterables;
import com.google.inject.Inject;
import com.google.inject.Singleton;

@Singleton
public class ResourceConfigurationCache {

    public static final String CACHE_ID = "repository.ResourceConfigurationCache";

    private final Configuration config;
    private final NamespaceRegistry namespaceRegistry;
    private final CacheManager cacheManager;

    private static final Logger logger = LogManager.getLogger(ResourceConfigurationCache.class);

    private final ResourcePropertyCache<IRI, Value> cache = new ResourcePropertyCache<IRI, Value>(CACHE_ID) {
        @Override
        protected IRI keyToIri(IRI iri) {
            return iri;
        }

        @Override
        protected Optional<CacheManager> cacheManager() {
            return Optional.of(cacheManager);
        }

        @Override
        protected Map<IRI, Optional<Value>> queryAll(Repository repository, Iterable<? extends IRI> iris) {
            if (Iterables.isEmpty(iris)) {
                return Collections.emptyMap();
            }

            List<String> resourceConfigurations = config.getUiConfig().getResourceConfigurations();
            try {
                List<PropertyPattern> resourceConfigurationsPatterns = resourceConfigurations.stream()
                        .map(pattern -> PropertyPattern.parse(pattern, namespaceRegistry))
                        .collect(Collectors.toList());
    
                String query = constructPropertyQuery(iris, resourceConfigurationsPatterns);
                logger.info("query "+query);

                Map<IRI, List<List<Value>>> iriToPredicateToConfiguration = queryAndExtractProperties(
                        repository,
                        query,
                        resourceConfigurationsPatterns.size(),
                        value -> Optional.ofNullable(value)
                );

                Map<IRI, Optional<Value>> configurations = new HashMap<>();
                for (IRI iri : iris) {
                    try {
                        Optional<Value> configuration = flattenProperties(iriToPredicateToConfiguration.get(iri)).stream()
                            .findFirst();
                        logger.info(iri+" "+configuration.get().stringValue());
                        configurations.put(iri, configuration);
                    }
                    catch (NoSuchElementException noSuchElementEx) {                        
                        SimpleValueFactory vf = SimpleValueFactory.getInstance();
                        IRI exampleIri = vf.createIRI("http://www.researchspace.org/resource/system/resource_configurations_container/data/Entity");

                        Optional<Value> defaultConfigurationonValue = Optional.of(exampleIri);
                        configurations.put(iri,defaultConfigurationonValue);
                    }
                }

                return configurations;
            } catch (Exception ex) {
                throw new RuntimeException("Failed to query for resource configurations of IRI(s).", ex);
            }
        }
    };

    @Inject
    public ResourceConfigurationCache(Configuration config,
                                      NamespaceRegistry namespaceRegistry,
                                      CacheManager cacheManager) {
        this.config = config;
        this.namespaceRegistry = namespaceRegistry;
        this.cacheManager = cacheManager;
        cacheManager.register(cache);
    }

    public Optional<Literal> getResourceConfiguration(IRI resourceIri, Repository repository) {
        logger.info("datatype"+getResourceConfigurations(Collections.singletonList(resourceIri), repository)
                .get(resourceIri));
        return getResourceConfigurations(Collections.singletonList(resourceIri), repository).get(resourceIri);
    }

    public Map<IRI, Optional<Literal>> getResourceConfigurations(
            Iterable<? extends IRI> resourceIris,
            Repository repository) {

        // Fetch raw values from cache
        Map<IRI, Optional<Value>> raw = cache.getAll(repository, resourceIris);
        Map<IRI, Optional<Literal>> result = new HashMap<>();
        ValueFactory valueFactory = repository.getValueFactory();

        raw.forEach((iri, optVal) -> {
            Optional<Literal> optLit = optVal.map(v -> {
                if (v instanceof Literal) {
                    return (Literal) v;
                } else {
                    // Convert IRI or other RDF Value to a string literal
                    return valueFactory.createLiteral(v.stringValue());
                }
            });
            result.put(iri, optLit);
        });
        return result;
    }

}
