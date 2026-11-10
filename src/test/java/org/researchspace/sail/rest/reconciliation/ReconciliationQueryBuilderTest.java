/**
 * ResearchSpace
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

package org.researchspace.sail.rest.reconciliation;

import static org.junit.Assert.assertEquals;

import java.util.Arrays;
import java.util.Collections;

import org.eclipse.rdf4j.sail.SailException;
import org.junit.Test;
import org.researchspace.sail.rest.reconciliation.ReconciliationQueryBuilder.Input;
import org.researchspace.sail.rest.reconciliation.ReconciliationQueryBuilder.ValueKind;

public class ReconciliationQueryBuilderTest {

    @Test
    public void testQueryOnly() {
        assertEquals("{\"q0\":{\"query\":\"Picasso\"}}",
                ReconciliationQueryBuilder.build(Collections.singletonList(new Input("query", "Picasso"))));
    }

    @Test
    public void testAllParts() {
        assertEquals(
                "{\"q0\":{\"query\":\"Picasso\",\"type\":\"Person\",\"type_strict\":\"should\",\"limit\":3,"
                        + "\"properties\":[{\"pid\":\"dataset\",\"v\":\"gnd\"}]}}",
                ReconciliationQueryBuilder.build(Arrays.asList(new Input("dataset", "gnd"),
                        new Input("limit", " 3 ", ValueKind.NUMBER), new Input("type_strict", "should"),
                        new Input("type", "Person"), new Input("query", "Picasso"))));
    }

    @Test
    public void testValuesAreSentVerbatim() {
        // it is up to the service to treat commas as separators or not
        assertEquals(
                "{\"q0\":{\"query\":\"Picasso, Pablo\",\"type\":\"Person,Group\","
                        + "\"properties\":[{\"pid\":\"dataset\",\"v\":\"gnd, ulan\"}]}}",
                ReconciliationQueryBuilder.build(Arrays.asList(new Input("query", "Picasso, Pablo"),
                        new Input("type", "Person,Group"), new Input("dataset", "gnd, ulan"))));
    }

    @Test
    public void testPropertyTargetsAndValueKinds() {
        assertEquals(
                "{\"q0\":{\"query\":\"Picasso\",\"properties\":[" + "{\"pid\":\"P19\",\"v\":{\"id\":\"Q8851\"}},"
                        + "{\"pid\":\"P569\",\"v\":1881}," + "{\"pid\":\"P570/P17\",\"v\":\"France\"},"
                        + "{\"pid\":\"living\",\"v\":false}," + "{\"pid\":\"type\",\"v\":\"painter\"}]}}",
                ReconciliationQueryBuilder.build(Arrays.asList(new Input("query", "Picasso"),
                        new Input("properties.type", "painter"), new Input("living", "false", ValueKind.BOOLEAN),
                        new Input("properties.P570/P17", "France"), new Input("P569", "1881", ValueKind.NUMBER),
                        new Input("properties.P19", "Q8851", ValueKind.ENTITY))));
    }

    @Test
    public void testBlankInputsAreLeftOut() {
        assertEquals("{\"q0\":{\"query\":\"Picasso\"}}",
                ReconciliationQueryBuilder.build(Arrays.asList(new Input("query", "Picasso"), new Input("type", ""),
                        new Input("limit", " ", ValueKind.NUMBER), new Input("dataset", null))));
    }

    @Test
    public void testJsonIsEscaped() {
        assertEquals("{\"q0\":{\"query\":\"a \\\"b\\\" \\\\ {c}\\né\"}}", ReconciliationQueryBuilder
                .build(Collections.singletonList(new Input("query", "a \"b\" \\ {c}\né"))));
    }

    @Test(expected = SailException.class)
    public void testQueryIsMandatory() {
        ReconciliationQueryBuilder.build(Collections.singletonList(new Input("type", "Person")));
    }

    @Test(expected = SailException.class)
    public void testBlankQueryIsRejected() {
        ReconciliationQueryBuilder.build(Collections.singletonList(new Input("query", "  ")));
    }

    @Test(expected = SailException.class)
    public void testLimitMustBeInteger() {
        ReconciliationQueryBuilder.build(Arrays.asList(new Input("query", "Picasso"), new Input("limit", "many")));
    }

    @Test(expected = SailException.class)
    public void testLimitMustBePositive() {
        ReconciliationQueryBuilder.build(Arrays.asList(new Input("query", "Picasso"), new Input("limit", "0")));
    }

    @Test(expected = SailException.class)
    public void testNumericPropertyMustBeNumber() {
        ReconciliationQueryBuilder.build(
                Arrays.asList(new Input("query", "Picasso"), new Input("P569", "c. 1881", ValueKind.NUMBER)));
    }
}
