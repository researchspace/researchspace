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

package com.metaphacts.dataquality.shacl.generators;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.eclipse.rdf4j.model.Literal;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.Statement;
import org.eclipse.rdf4j.model.util.Models;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.eclipse.rdf4j.repository.Repository;

import com.google.common.cache.Cache;
import com.google.common.collect.Lists;
import com.metaphacts.config.NamespaceRegistry;
import com.metaphacts.data.rdf.container.LDPApiInternal;
import com.metaphacts.data.rdf.container.LDPApiInternalRegistry;
import com.metaphacts.data.rdf.container.LocalLDPAPIClient;
import com.metaphacts.data.rdf.container.QueryTemplateContainer;
import com.metaphacts.dataquality.ShaclUtils;
import com.metaphacts.repository.RepositoryManager;
import com.metaphacts.vocabulary.MPQA;

class TestGeneratorFactory {

    protected final LDPApiInternalRegistry ldpRegistry;

    public TestGeneratorFactory(LDPApiInternalRegistry ldpRegistry) {
        this.ldpRegistry = ldpRegistry;
    }
    
    public List<TestGenerator> createAllFromModel(Model parentModel) throws Exception {
        List<Resource> resourceIds = parentModel.filter(null, RDF.TYPE, MPQA.ShaclGenerator)
                .stream().map(Statement::getSubject).collect(Collectors.toList());
        List<TestGenerator> res = Lists.newArrayList();
        for (Resource id : resourceIds) {
            res.add(createFromModel(id, parentModel));
        }
        return res;
    }

    public TestGenerator createFromModel(Resource resourceId, Model parentModel)
            throws Exception {
        Model model = ShaclUtils.extractSubTreeBySubject(parentModel, resourceId);

        if (!model.contains(resourceId, RDF.TYPE, MPQA.ShaclGenerator)) {
            throw new IllegalArgumentException("Instance " + resourceId.stringValue()
                    + " does not belong to the class mpqa:ShaclGenerator.");
        }

        TestGenerator generator = new TestGenerator();

        generator.setId(resourceId);

        expandWithReferencedQueryTemplates(model);

        // Query body can be defined in two ways: either directly using the mpqa:generatorQuery
        // datatype property
        // or with a query template using the mpqa:hasQueryTemplate property.
        // The query template can be defined either inline in the file or in the query catalog.
        Optional<Resource> optGeneratorQueryTemplateId = Models.getPropertyResource(model,
                resourceId, MPQA.hasSPINQueryTemplate);
        Optional<String> optGeneratorQueryText = Models
                .getPropertyLiteral(model, resourceId, MPQA.generatorQuery)
                .map(Literal::stringValue);

        if (!optGeneratorQueryTemplateId.isPresent() && !optGeneratorQueryText.isPresent()) {
            throw new IllegalArgumentException(
                    "Instance " + resourceId.stringValue() + " does not define a generator query.");
        } else if (optGeneratorQueryTemplateId.isPresent() && optGeneratorQueryText.isPresent()) {
            throw new IllegalArgumentException("Instance " + resourceId.stringValue()
                    + " defines both a generator query template and a plain text query string.");
        }

        if (optGeneratorQueryTemplateId.isPresent()) {
            generator.setQuery(getQueryBody(optGeneratorQueryTemplateId.get(), model));
        } else {
            generator.setQuery(optGeneratorQueryText.get());
        }

        Models.getPropertyIRIs(model, resourceId, MPQA.basedOnPattern).stream()
                .forEach(iri -> generator.getPatternIds().add(iri));

        Models.getPropertyLiteral(model, resourceId, RDFS.COMMENT).map(Literal::stringValue)
                .ifPresent(val -> generator.setDescription(val));

        return generator;
    }

    protected static String getQueryBody(Resource queryTemplateId, Model model) throws Exception {
        Optional<String> opt = ShaclUtils.retrieveQueryTemplates(model).stream()
                .filter(qt -> qt.getId().equals(queryTemplateId))
                .map(qt -> qt.getQuery().getQueryString()).findFirst();

        return opt.orElseThrow(() -> new IllegalStateException(
                "The query template " + queryTemplateId.stringValue() + " is not defined."));
    }

    protected void expandWithReferencedQueryTemplates(Model model) throws Exception {
        LDPApiInternal assetsApi = this.ldpRegistry.api(RepositoryManager.ASSET_REPOSITORY_ID);
        LocalLDPAPIClient ldpApiClient = new LocalLDPAPIClient(assetsApi,
                QueryTemplateContainer.IRI);

        ShaclUtils.expandWithReferencedQueryTemplates(model, ldpApiClient);
    }

}
