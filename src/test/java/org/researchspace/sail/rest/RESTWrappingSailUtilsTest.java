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

package org.researchspace.sail.rest;

import java.util.List;
import java.util.Optional;

import org.eclipse.rdf4j.model.Literal;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.eclipse.rdf4j.query.QueryLanguage;
import org.eclipse.rdf4j.query.algebra.StatementPattern;
import org.eclipse.rdf4j.query.algebra.Var;
import org.eclipse.rdf4j.query.algebra.helpers.StatementPatternCollector;
import org.eclipse.rdf4j.query.parser.ParsedQuery;
import org.eclipse.rdf4j.query.parser.QueryParserUtil;
import org.hamcrest.Matchers;
import org.junit.Assert;
import org.junit.Test;
import org.researchspace.sail.rest.RESTWrappingSailUtils;

public class RESTWrappingSailUtilsTest {

    public RESTWrappingSailUtilsTest() {
        // TODO Auto-generated constructor stub
    }

    private static ValueFactory VF = SimpleValueFactory.getInstance();

    private static String tmpQuery1 = "SELECT * WHERE { \n" + "?x rdfs:label \"label\" . \n"
            + "?x rdfs:seeAlso <http://www.example.org/example> . \n" + "?x rdf:type ?type .\n"
            + "?x rdfs:comment \"comment1\" . \n" + "?x rdfs:comment \"comment2\" . \n" + "}";

    private List<StatementPattern> parseAndExtractStatementPatterns(String query) {
        ParsedQuery restoredQuery = QueryParserUtil.parseQuery(QueryLanguage.SPARQL, query, null);

        StatementPatternCollector collector = new StatementPatternCollector();
        restoredQuery.getTupleExpr().visit(collector);
        return collector.getStatementPatterns();
    }

    @Test
    public void testGetSubjectOutputVariableNoObj() {
        List<StatementPattern> patterns = parseAndExtractStatementPatterns(tmpQuery1);
        Optional<Var> optSubjVar = RESTWrappingSailUtils.getSubjectOutputVariable(patterns, null, RDFS.LABEL);
        Assert.assertTrue(optSubjVar.isPresent());
        Assert.assertFalse(optSubjVar.get().hasValue());
        Assert.assertEquals(optSubjVar.get().getName(), "x");
    }

    @Test
    public void testGetSubjectOutputVariableWithObj() {
        List<StatementPattern> patterns = parseAndExtractStatementPatterns(tmpQuery1);
        Optional<Var> optObjVar = RESTWrappingSailUtils.getObjectOutputVariable(patterns, null, RDF.TYPE);
        Optional<Var> optSubjVar = RESTWrappingSailUtils.getSubjectOutputVariable(patterns, optObjVar.get(), RDF.TYPE);
        Assert.assertTrue(optSubjVar.isPresent());
        Assert.assertFalse(optSubjVar.get().hasValue());
        Assert.assertEquals(optSubjVar.get().getName(), "x");
    }

    @Test
    public void testGetObjectOutputVariableNoSubj() {
        List<StatementPattern> patterns = parseAndExtractStatementPatterns(tmpQuery1);
        Optional<Var> optObjVar = RESTWrappingSailUtils.getObjectOutputVariable(patterns, null, RDF.TYPE);
        Assert.assertTrue(optObjVar.isPresent());
        Assert.assertFalse(optObjVar.get().hasValue());
        Assert.assertEquals(optObjVar.get().getName(), "type");
    }

    @Test
    public void testGetObjectOutputVariableWithSubj() {
        List<StatementPattern> patterns = parseAndExtractStatementPatterns(tmpQuery1);
        Optional<Var> optSubjVar = RESTWrappingSailUtils.getSubjectOutputVariable(patterns, null, RDFS.LABEL);
        Optional<Var> optObjVar = RESTWrappingSailUtils.getObjectOutputVariable(patterns, optSubjVar.get(), RDF.TYPE);
        Assert.assertTrue(optObjVar.isPresent());
        Assert.assertFalse(optObjVar.get().hasValue());
        Assert.assertEquals(optObjVar.get().getName(), "type");
    }

    @Test
    public void testGetLiteralObjectInputParametersWithSubj() {
        List<StatementPattern> patterns = parseAndExtractStatementPatterns(tmpQuery1);
        Optional<Var> optSubjVar = RESTWrappingSailUtils.getSubjectOutputVariable(patterns, null, RDFS.COMMENT);
        List<Literal> list = RESTWrappingSailUtils.getLiteralObjectInputParameters(patterns, optSubjVar.get(),
                RDFS.COMMENT);

        Assert.assertEquals(list.size(), 2);
        Assert.assertThat(list, Matchers.hasItems(VF.createLiteral("comment1"), VF.createLiteral("comment2")));
    }

    @Test
    public void testGetLiteralObjectInputParametersNoSubj() {
        List<StatementPattern> patterns = parseAndExtractStatementPatterns(tmpQuery1);
        List<Literal> list = RESTWrappingSailUtils.getLiteralObjectInputParameters(patterns, null, RDFS.COMMENT);

        Assert.assertEquals(list.size(), 2);
        Assert.assertThat(list, Matchers.hasItems(VF.createLiteral("comment1"), VF.createLiteral("comment2")));
    }

    @Test
    public void testGetLiteralObjectInputParameter() {
        List<StatementPattern> patterns = parseAndExtractStatementPatterns(tmpQuery1);
        Optional<Literal> optParam = RESTWrappingSailUtils.getLiteralObjectInputParameter(patterns, null, RDFS.LABEL);
        Assert.assertTrue(optParam.isPresent());
        Assert.assertEquals(VF.createLiteral("label"), optParam.get());
    }

    @Test
    public void testGetResourceObjectInputParametersWithSubj() {
        List<StatementPattern> patterns = parseAndExtractStatementPatterns(tmpQuery1);
        Optional<Var> optSubjVar = RESTWrappingSailUtils.getSubjectOutputVariable(patterns, null, RDFS.SEEALSO);
        List<Resource> list = RESTWrappingSailUtils.getResourceObjectInputParameters(patterns, optSubjVar.get(),
                RDFS.SEEALSO);

        Assert.assertEquals(list.size(), 1);
        Assert.assertThat(list, Matchers.hasItems(VF.createIRI("http://www.example.org/example")));
    }

    @Test
    public void testGetResourceObjectInputParameter() {
        List<StatementPattern> patterns = parseAndExtractStatementPatterns(tmpQuery1);
        Optional<Var> optSubjVar = RESTWrappingSailUtils.getSubjectOutputVariable(patterns, null, RDFS.SEEALSO);
        Optional<Resource> optRes = RESTWrappingSailUtils.getResourceObjectInputParameter(patterns, optSubjVar.get(),
                RDFS.SEEALSO);

        Assert.assertTrue(optRes.isPresent());
        Assert.assertEquals(VF.createIRI("http://www.example.org/example"), optRes.get());
    }

}
