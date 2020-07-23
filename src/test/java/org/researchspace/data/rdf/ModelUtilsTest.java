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

package org.researchspace.data.rdf;

import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import org.researchspace.data.rdf.ModelUtils;
import org.researchspace.junit.AbstractIntegrationTest;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.LinkedHashModel;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.vocabulary.FOAF;
import org.eclipse.rdf4j.model.vocabulary.RDFS;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 */
public class ModelUtilsTest extends AbstractIntegrationTest {

    Model testModel;

    ValueFactory vf = SimpleValueFactory.getInstance();

    @Before
    public void initModel() {
        testModel = createModel();
    }

    @Test
    public void replaceSubjectAndObjects() throws Exception {
        IRI oldIRI = vf.createIRI("http://www.test.com/ResearchSpace");
        IRI newIRI = vf.createIRI("http://www.researchspace.org/ResearchSpace");
        Assert.assertTrue(testModel.contains(oldIRI, null, null));
        Assert.assertTrue(testModel.contains(null, null, oldIRI));
        Model replacedModel = ModelUtils.replaceSubjectAndObjects(testModel, oldIRI, newIRI);
        Assert.assertFalse(replacedModel.contains(oldIRI, null, null));
        Assert.assertFalse(replacedModel.contains(null, null, oldIRI));
        Assert.assertTrue(replacedModel.contains(newIRI, null, null));
        Assert.assertTrue(replacedModel.contains(null, null, newIRI));
        Assert.assertEquals(testModel.size(), replacedModel.size());

    }

    private Model createModel() {
        Model m = new LinkedHashModel();
        m.add(vf.createStatement(vf.createIRI("http://www.test.com/ResearchSpace"), FOAF.KNOWS,
                vf.createIRI("http://www.test.com/Systap")));
        m.add(vf.createStatement(vf.createIRI("http://www.test.com/ResearchSpace"), RDFS.LABEL,
                vf.createLiteral("ResearchSpace GmbH")));
        m.add(vf.createStatement(vf.createIRI("http://www.test.com/Systap"), FOAF.KNOWS,
                vf.createIRI("http://www.test.com/Wikidata")));
        m.add(vf.createStatement(vf.createIRI("http://www.test.com/Wikidata"), FOAF.KNOWS,
                vf.createIRI("http://www.test.com/ResearchSpace")));
        return m;
    }

}
