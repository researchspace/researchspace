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

package com.metaphacts.federation.sparql.rank.optimizers;

import java.io.BufferedReader;
import java.io.InputStreamReader;

import org.eclipse.rdf4j.query.QueryLanguage;
import org.eclipse.rdf4j.query.algebra.Projection;
import org.eclipse.rdf4j.query.algebra.Slice;
import org.eclipse.rdf4j.query.algebra.Union;
import org.eclipse.rdf4j.query.parser.ParsedTupleQuery;
import org.eclipse.rdf4j.query.parser.QueryParserUtil;
import org.junit.Assert;
import org.junit.Test;

import com.metaphacts.federation.repository.optimizers.MpQueryNaryJoinExtractor;
import com.metaphacts.federation.sparql.rank.optimizers.SliceOptimizer;

public class SliceOptimizerTest {
    
    public SliceOptimizerTest() {

    }

    private String loadQuery(String queryId) throws Exception {
        BufferedReader reader = new BufferedReader(new InputStreamReader(
                SliceOptimizerTest.class.getResourceAsStream(queryId + ".sq"), "UTF-8"));
        StringBuilder textBuilder = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) {
            line = line.trim();
            textBuilder.append(line + "\n");
        }
        return textBuilder.toString().trim();
    }

    @Test
    public void testSimple() throws Exception {
        String original = loadQuery("querySimpleSliceUnion");
        ParsedTupleQuery tq = QueryParserUtil.parseTupleQuery(QueryLanguage.SPARQL, original,
                "http://www.example.org/");
        new MpQueryNaryJoinExtractor().optimize(tq.getTupleExpr(), null, null);
        SliceOptimizer optimizer = new SliceOptimizer();
        optimizer.optimize(tq.getTupleExpr(), null, null);

        Assert.assertTrue(tq.getTupleExpr() instanceof Slice);
        Slice root = (Slice)tq.getTupleExpr();
        Projection proj = (Projection)root.getArg();
        Union whereClause = (Union)proj.getArg();
        Assert.assertTrue(whereClause.getLeftArg() instanceof Slice);
        Assert.assertTrue(whereClause.getRightArg() instanceof Slice);
    }

}