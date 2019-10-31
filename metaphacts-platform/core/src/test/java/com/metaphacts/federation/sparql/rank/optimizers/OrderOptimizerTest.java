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
import org.eclipse.rdf4j.query.algebra.Order;
import org.eclipse.rdf4j.query.algebra.Projection;
import org.eclipse.rdf4j.query.parser.ParsedTupleQuery;
import org.eclipse.rdf4j.query.parser.QueryParserUtil;
import org.junit.Assert;
import org.junit.Test;

import com.metaphacts.federation.repository.optimizers.MpQueryNaryJoinExtractor;
import com.metaphacts.federation.sparql.rank.algebra.RankedNaryJoin;
import com.metaphacts.federation.sparql.rank.optimizers.OrderOptimizer;

public class OrderOptimizerTest {

    public OrderOptimizerTest() {
    }

    private String loadQuery(String queryId) throws Exception {
        BufferedReader reader = new BufferedReader(new InputStreamReader(
                OrderOptimizerTest.class.getResourceAsStream(queryId + ".sq"), "UTF-8"));
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
        String original = loadQuery("querySimpleOrder");
        ParsedTupleQuery tq = QueryParserUtil.parseTupleQuery(QueryLanguage.SPARQL, original,
                "http://www.example.org/");
        new MpQueryNaryJoinExtractor().optimize(tq.getTupleExpr(), null, null);
        OrderOptimizer optimizer = new OrderOptimizer();
        optimizer.optimize(tq.getTupleExpr(), null, null);

        Projection proj = (Projection) tq.getTupleExpr();
        Assert.assertTrue(
                "The argument of the Projection must be RankedNaryJoin, was "
                        + proj.getArg().getClass().getName(),
                proj.getArg() instanceof RankedNaryJoin);
        RankedNaryJoin naryJoin = (RankedNaryJoin) proj.getArg();
        Assert.assertTrue(naryJoin.getArg(0) instanceof Order);
        Order order = (Order) naryJoin.getArg(0);
        Assert.assertEquals(1, order.getElements().size());
        Assert.assertTrue(naryJoin.getArg(1) instanceof Order);
        order = (Order) naryJoin.getArg(1);
        Assert.assertEquals(1, order.getElements().size());
    }

}