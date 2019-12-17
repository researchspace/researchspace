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
package com.metaphacts.oss;

import java.io.File;
import java.io.FileInputStream;
import java.util.List;
import java.util.Set;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.eclipse.rdf4j.rio.Rio;
import org.junit.Assert;
import org.junit.Test;

import com.google.common.collect.Lists;
import com.metaphacts.api.transform.ModelUtils;

public abstract class AbstractOssValidationTest {

    /**
     * @return the list of OSS files
     */
    protected abstract List<File> getOssFiles();

    protected File ossFile(String relPathToRepositoryRoot) {
        File platformExternals = new File(".", "../../");
        return new File(platformExternals, relPathToRepositoryRoot);
    }

    @Test
    public void validateOssFiles() throws Exception {

        for (File ossFile : getOssFiles()) {
            validateOssFile(ossFile);
        }
    }

    protected void validateOssFile(File ossFile) throws Exception {

        Assert.assertTrue("Expected file to exist: " + ossFile, ossFile.isFile());

        // validate that the file can be parsed and loaded
        Model model;
        try (FileInputStream fin = new FileInputStream(ossFile)) {
            model = Rio.parse(fin, "http://metaphacts.com/", RDFFormat.TURTLE);
        } catch (Exception e) {
            Assert.fail("Failed to parse file: " + ossFile + ". Reason: " + e.getMessage());
            throw e;
        }
        
        // validate existence of required properties
        final String spdx = "http://spdx.org/rdf/terms#";
        final String spdx_ext = "http://spdx.metaphacts.com/resource#";
        final String doap = "http://usefulinc.com/ns/doap#";
        final ValueFactory vf = SimpleValueFactory.getInstance();
        
        // required properties per spdx File
        final List<IRI> requiredPropertiesForDependency = Lists.newArrayList(
                vf.createIRI(spdx, "copyrightText"),
                vf.createIRI(spdx, "licenseConcluded"),
                vf.createIRI(spdx, "artifactOf"),
                vf.createIRI(spdx_ext, "useOfOSS"),
                vf.createIRI(spdx_ext, "planToDistribute"),
                vf.createIRI(spdx_ext, "planToModify")
                );
        
        // required properties per spdx project
        final List<IRI> requiredPropertiesForProject = Lists.newArrayList(
                vf.createIRI(doap, "homepage"),
                vf.createIRI(doap, "name"),
                vf.createIRI(doap, "programming-language"),
                vf.createIRI(doap, "release"),
                vf.createIRI(doap, "download-page")
                );
        
        // required properties per artifact revision
        final List<IRI> requiredPropertiesForRevision = Lists.newArrayList(
                vf.createIRI(doap, "name"),
                vf.createIRI(doap, "revision")
                );
        
        // filter dependencies
        Set<Resource> dependencies = model.filter(null, RDF.TYPE, vf.createIRI(spdx, "File")).subjects();
        for (Resource dependency : dependencies) {
            
            for (IRI dependencyProperty : requiredPropertiesForDependency) {
                Assert.assertTrue("Expected property " + dependencyProperty + " for dependency " + dependency, model.contains(dependency, dependencyProperty, null));
            }

            Resource dependencyProject = ModelUtils.getNotNullObjectResource(model, dependency,
                    vf.createIRI(spdx, "artifactOf"));
            for (IRI projectProperty : requiredPropertiesForProject) {
                Assert.assertTrue("Expected property " + projectProperty + " for project of dependency " + dependency,
                        model.contains(dependencyProject, projectProperty, null));
            }

            Resource dependencyRevision = ModelUtils.getNotNullObjectResource(model, dependencyProject,
                    vf.createIRI(doap, "release"));
            for (IRI revisionProperty : requiredPropertiesForRevision) {
                Assert.assertTrue("Expected property " + revisionProperty + " for version of dependency " + dependency,
                        model.contains(dependencyRevision, revisionProperty, null));
            }
            
            // validate relationship to a package
            Resource relationshipResource = ModelUtils.getNotNullObjectResource(model, dependency,
                    vf.createIRI(spdx, "relationship"));
            Resource relationshipPackage = ModelUtils.getNotNullObjectResource(model, relationshipResource,
                    vf.createIRI(spdx, "relatedSpdxElement"));
            Assert.assertTrue(
                    "Expected spdx:relatedSpdxElement of dependency " + dependency
                            + " to point to the package of this OSS file",
                    model.contains(relationshipPackage, RDF.TYPE, vf.createIRI(spdx, "Package")));
        }
    }
}
