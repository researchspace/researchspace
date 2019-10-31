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

import java.io.IOException;
import java.io.InputStream;
import java.util.List;

import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.impl.TreeModel;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.eclipse.rdf4j.rio.Rio;

import com.metaphacts.data.rdf.container.LDPApiInternalRegistry;

public class ShaclTestAutoGenerationEngine {

    protected final LDPApiInternalRegistry ldpRegistry;

    public ShaclTestAutoGenerationEngine(LDPApiInternalRegistry ldpRegistry) {
        this.ldpRegistry = ldpRegistry;
    }

    public Model generateShaclShapesFromPatterns(
        InputStream autoGeneratorsData,
        InputStream patternsData,
        RepositoryConnection connection
    ) throws IOException {
        try {
            TestGeneratorFactory generatorFactory = new TestGeneratorFactory(ldpRegistry);
            Model autoGeneratorsModel = Rio.parse(autoGeneratorsData, "", RDFFormat.TURTLE);
            List<TestGenerator> generators = generatorFactory.createAllFromModel(autoGeneratorsModel);
            ShaclPatternInstantiator instantiator = new ShaclPatternInstantiator(ldpRegistry);
            Model patternModel = Rio.parse(patternsData, "", RDFFormat.TURTLE);
            Model generatedModel = new TreeModel();

            for (TestGenerator generator : generators) {
                generatedModel.addAll(instantiator.generate(connection, patternModel, generator));
            }
            return generatedModel;
        } catch (IOException | RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException(e);
        } finally {
            autoGeneratorsData.close();
            patternsData.close();
        }
    }

}
