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

package org.researchspace.config;

import com.google.inject.Inject;

import org.eclipse.rdf4j.query.MalformedQueryException;
import org.junit.Assert;
import org.junit.Rule;
import org.junit.Test;
import org.researchspace.config.PropertyPattern;
import org.researchspace.junit.AbstractIntegrationTest;
import org.researchspace.junit.NamespaceRule;

import static org.hamcrest.Matchers.not;
import static org.hamcrest.core.AllOf.allOf;
import static org.hamcrest.CoreMatchers.containsString;

/**
 * Test cases for {@link PropertyPattern}
 */
public class PropertyPatternTest extends AbstractIntegrationTest {
    final String SOURCE_SUBJECT_NAME = "subject";
    final String SOURCE_VALUE_NAME = "value";
    final String TEST_SUBJECT_NAME = "testSub";
    final String TEST_VALUE_NAME = "testVal";

    @Inject
    @Rule
    public NamespaceRule namespaceRule;

    @Test
    public void testPropertyPathPattern() {
        PropertyPattern pattern = PropertyPattern.parse("{?subject <test:iri>|<another:iri>+ ?value}",
                namespaceRule.getNamespaceRegistry());
        checkIfPatternRenders(pattern);
    }

    @Test
    public void testPatternWithBind() {
        PropertyPattern pattern = PropertyPattern.parse(
                "{?subject <test:hasImage> ?image . " + "BIND(CONCAT("
                        + "\"https://commons.wikimedia.org/w/thumb.php?f=\","
                        + "STRAFTER(STR(?image),\"Special:FilePath/\")," + "\"&w=100\"" + ") as ?value)}",
                namespaceRule.getNamespaceRegistry());
        checkIfPatternRenders(pattern);
    }

    @Test
    public void testPatternWithValues() {
        PropertyPattern pattern = PropertyPattern.parse(
                "{?subject <test:hasImage> ?value . " + "VALUES (?value) { (<test:foo>) (<test:bar>) } }",
                namespaceRule.getNamespaceRegistry());
        String formatted = pattern.format(TEST_SUBJECT_NAME, TEST_VALUE_NAME);
        String expected = "{?testSub <test:hasImage> ?testVal . VALUES (?testVal) { (<test:foo>) (<test:bar>)  }  }";
        Assert.assertEquals(expected.replaceAll("\\s+", ""), formatted.replaceAll("\\s+", ""));
    }

    @Test
    public void testPatternWithPrefixedIRIs() {
        PropertyPattern pattern = PropertyPattern.parse("rdfs:label", namespaceRule.getNamespaceRegistry());
        checkIfPatternRenders(pattern);
    }

    @Test(expected = IllegalArgumentException.class)
    public void testMissingSubject() {
        PropertyPattern.parse("{?s ?p ?value}", namespaceRule.getNamespaceRegistry());
    }

    @Test(expected = IllegalArgumentException.class)
    public void testMissingValue() {
        PropertyPattern.parse("{?subject ?p ?v}", namespaceRule.getNamespaceRegistry());
    }

    @Test(expected = MalformedQueryException.class)
    public void testInvalidPattern() {
        PropertyPattern.parse("???", namespaceRule.getNamespaceRegistry());
    }

    private void checkIfPatternRenders(PropertyPattern pattern) {
        String formatted = pattern.format(TEST_SUBJECT_NAME, TEST_VALUE_NAME);
        Assert.assertThat("Pattern.format should replace ?subject -> ?testSub and ?value -> ?testPropVal", formatted,
                allOf(containsString("?" + TEST_SUBJECT_NAME), containsString("?" + TEST_VALUE_NAME),
                        not(containsString("?" + SOURCE_SUBJECT_NAME)), not(containsString("?" + SOURCE_VALUE_NAME))));
    }
}
