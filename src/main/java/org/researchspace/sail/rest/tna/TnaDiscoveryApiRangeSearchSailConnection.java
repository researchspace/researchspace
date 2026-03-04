/**
 * ResearchSpace
 * Copyright (C) 2025, © Kartography CIC
 * Copyright (C) 2021, © Trustees of the British Museum
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
package org.researchspace.sail.rest.tna;

import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import javax.ws.rs.core.MediaType;

import org.eclipse.rdf4j.common.iteration.CloseableIteration;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.common.iteration.CloseableIteratorIteration;
import org.eclipse.rdf4j.query.impl.MapBindingSet;
import org.researchspace.sail.rest.RESTSail;
import org.researchspace.sail.rest.RESTSailConnection;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

public class TnaDiscoveryApiRangeSearchSailConnection extends RESTSailConnection {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ScopeContent {
        private String description;

        private static final Pattern BEGIN_REGEX = Pattern.compile("<scopecontent>\\s*<p>");
        private static final Pattern END_REGEX = Pattern.compile("<\\/p>\\s*<\\/scopecontent>");

        public ScopeContent() {
        }

        public String getDescription() {
            if (description != null) {
                return END_REGEX.matcher(BEGIN_REGEX.matcher(description).replaceAll("")).replaceAll("");
            } else {
                return description;
            }
        }

        public void setDescription(String description) {
            this.description = description;
        }

    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class CollectionRecord {
        private String citableReference;
        private String id;
        private String referencePart;
        private boolean isParent;
        private String catalogueLevel;

        private ScopeContent scopeContent;

        public CollectionRecord() {
        }

        public String getCitableReference() {
            return citableReference;
        }

        public void setCitableReference(String citableReference) {
            this.citableReference = citableReference;
        }

        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
        }

        public ScopeContent getScopeContent() {
            return scopeContent;
        }

        public void setScopeContent(ScopeContent scopeContent) {
            this.scopeContent = scopeContent;
        }

        public String getReferencePart() {
            return referencePart;
        }

        public void setReferencePart(String referencePart) {
            this.referencePart = referencePart;
        }

        public boolean getIsParent() {
            return isParent;
        }

        public void setIsParent(boolean isParent) {
            this.isParent = isParent;
        }

        public String getCatalogueLevel() {
            return this.catalogueLevel;
        }

        public void setCatalogueLevel(String catalogueLevel) {
            this.catalogueLevel = catalogueLevel;
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class DiscoveryCollection {
        private List<CollectionRecord> assets;
        private boolean hasMoreAfterLast;

        public DiscoveryCollection() {
        }

        public void setAssets(List<CollectionRecord> assets) {
            this.assets = assets;
        }

        public List<CollectionRecord> getAssets() {
            return assets;
        }

        public boolean getHasMoreAfterLast() {
            return hasMoreAfterLast;
        }

        public void setHasMoreAfterLast(boolean hasMoreAfterLast) {
            this.hasMoreAfterLast = hasMoreAfterLast;
        }
    }

    private final String DISCOVERY_COLLECTION_URL = "https://discovery.nationalarchives.gov.uk/API/records/v1/collection/";

    public TnaDiscoveryApiRangeSearchSailConnection(RESTSail sailBase) {
        super(sailBase);
    }

    @Override
    protected CloseableIteration<? extends BindingSet> executeAndConvertResultsToBindingSet(
            ServiceParametersHolder parametersHolder) {

        try {
            IRI hasCitableReference = VF.createIRI(
                    "http://www.researchspace.org/resource/system/services/tnadiscovery/hasCitableReference");
            IRI hasDescription = VF
                    .createIRI("http://www.researchspace.org/resource/system/services/tnadiscovery/hasDescription");
            IRI isFound = VF.createIRI("http://www.researchspace.org/resource/system/services/tnadiscovery/isFound");
            IRI hasCatalogueLevel = VF
                    .createIRI("http://www.researchspace.org/resource/system/services/tnadiscovery/hasCatalogueLevel");

            String crns = parametersHolder.getInputParameters().get("crns");
            boolean includeItems = Boolean.valueOf(parametersHolder.getInputParameters().get("includeItems"));

            List<BindingSet> bindings = crns.lines().filter(s -> s != null).map(s -> s.trim()).filter(s -> !s.isEmpty())
                    .map(crn -> {
                        DiscoveryCollection collection = this.client.target(DISCOVERY_COLLECTION_URL).path(crn)
                                .request(MediaType.APPLICATION_JSON).get(DiscoveryCollection.class);

                        List<CollectionRecord> records = collection.getAssets();
                        MapBindingSet mapBindingSet = new MapBindingSet();
                        if (records.size() == 1) {
                            var r = records.get(0);
                            mapBindingSet.addBinding(parametersHolder.getOutputVariables().get(isFound),
                                    VF.createLiteral(true));
                            mapBindingSet.addBinding(parametersHolder.getOutputVariables().get(hasCitableReference),
                                    VF.createLiteral(r.getCitableReference()));
                            mapBindingSet.addBinding(parametersHolder.getOutputVariables().get(hasCatalogueLevel),
                                    VF.createLiteral(r.getCatalogueLevel()));
                            if (r.getScopeContent() != null && r.getScopeContent().getDescription() != null) {
                                mapBindingSet.addBinding(parametersHolder.getOutputVariables().get(hasDescription),
                                        VF.createLiteral(r.getScopeContent().getDescription()));
                            }
                        } else {
                            mapBindingSet.addBinding(parametersHolder.getOutputVariables().get(isFound),
                                    VF.createLiteral(false));
                            mapBindingSet.addBinding(parametersHolder.getOutputVariables().get(hasCitableReference),
                                    VF.createLiteral(crn));
                        }
                        return mapBindingSet;
                    }).collect(Collectors.toList());

            return new CloseableIteratorIteration<>(bindings.iterator());
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException(e);
        }
    }
}
