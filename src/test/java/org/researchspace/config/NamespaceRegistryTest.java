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

import java.util.Optional;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.junit.Assert;
import org.junit.Rule;
import org.junit.Test;
import org.researchspace.config.NamespaceRegistry.ProtectedNamespaceDeletionException;
import org.researchspace.config.NamespaceRegistry.RuntimeNamespace;
import org.researchspace.junit.AbstractRepositoryBackedIntegrationTest;
import org.researchspace.junit.NamespaceRule;

import com.google.inject.Inject;

/**
 * Test cases for {@link NamespaceRegistry} functionality.
 * 
 * @author Michael Schmidt <ms@metaphacts.com>
 * @author Johannes Trame <jt@metaphacts.com>
 */
public class NamespaceRegistryTest extends AbstractRepositoryBackedIntegrationTest {

    ValueFactory vf = SimpleValueFactory.getInstance();

    final static String DUMMY_PREFIX1 = "myns1";
    final static String DUMMY_PREFIX2 = "myns2";
    final static String DUMMY_PREFIX3 = "myns3";

    final static String DUMMY_NAMESPACE1 = "http://myns1.example.com/";
    final static String DUMMY_NAMESPACE2 = "http://myns2.example.com/";
    final static String DUMMY_NAMESPACE3 = "http://myns3.example.com/";

    final static String DUMMY_IRI1 = "http://myns1.example.com/abc";
    final static String DUMMY_IRI2 = "http://myns2.example.com/";
    final static String DUMMY_IRI3 = "http://myns3.example.com/abc/def";

    final static String DUMMY_IRI1_AS_PREFIXED_IRI = DUMMY_PREFIX1 + ":abc";

    @Inject
    @Rule
    public NamespaceRule namespaceRule;

    @Test
    public void testRuntimeNamespaceDefaults() throws Exception {

        final NamespaceRegistry ns = getNamespaceRegistry();

        Assert.assertEquals(NamespaceRegistry.DFLT_DEFAULT_NAMESPACE, ns.getNamespace(RuntimeNamespace.EMPTY).get());
        Assert.assertEquals(NamespaceRegistry.DFLT_DEFAULT_NAMESPACE, ns.getNamespace(RuntimeNamespace.DEFAULT).get());
        Assert.assertEquals(NamespaceRegistry.DFLT_PLATFORM_NAMESPACE,
                ns.getNamespace(RuntimeNamespace.PLATFORM).get());
        Assert.assertEquals(NamespaceRegistry.DFLT_USER_NAMESPACE, ns.getNamespace(RuntimeNamespace.USER).get());
        Assert.assertEquals(NamespaceRegistry.DFLT_HELP_NAMESPACE, ns.getNamespace(RuntimeNamespace.HELP).get());
        Assert.assertEquals(NamespaceRegistry.DFLT_ADMIN_NAMESPACE, ns.getNamespace(RuntimeNamespace.ADMIN).get());

    }

    @Test(expected = ProtectedNamespaceDeletionException.class)
    public void testRuntimeNamespaceDeletionFailsEmptyNS() throws Exception {

        final NamespaceRegistry ns = getNamespaceRegistry();
        namespaceRule.delete(RuntimeNamespace.EMPTY);

    }

    @Test(expected = ProtectedNamespaceDeletionException.class)
    public void testRuntimeNamespaceDeletionFailsDefaultNS() throws Exception {

        final NamespaceRegistry ns = getNamespaceRegistry();
        namespaceRule.delete(RuntimeNamespace.DEFAULT);

    }

    @Test(expected = ProtectedNamespaceDeletionException.class)
    public void testRuntimeNamespaceDeletionFailsPlatformNS() throws Exception {

        final NamespaceRegistry ns = getNamespaceRegistry();
        namespaceRule.delete(RuntimeNamespace.PLATFORM);

    }

    @Test(expected = ProtectedNamespaceDeletionException.class)
    public void testRuntimeNamespaceDeletionFailsUserNS() throws Exception {

        final NamespaceRegistry ns = getNamespaceRegistry();
        namespaceRule.delete(RuntimeNamespace.USER);

    }

    @Test(expected = ProtectedNamespaceDeletionException.class)
    public void testRuntimeNamespaceDeletionFailsHelpNS() throws Exception {

        final NamespaceRegistry ns = getNamespaceRegistry();
        namespaceRule.delete(RuntimeNamespace.HELP);

    }

    @Test(expected = ProtectedNamespaceDeletionException.class)
    public void testRuntimeNamespaceDeletionFailsAdminNS() throws Exception {

        final NamespaceRegistry ns = getNamespaceRegistry();
        namespaceRule.delete(RuntimeNamespace.ADMIN);

    }

    @Test
    public void testDeleteNonExistingNamespace() throws Exception {

        final NamespaceRegistry ns = getNamespaceRegistry();

        final int numNamespacesBefore = ns.getNamespaceMap().size();

        namespaceRule.delete(DUMMY_PREFIX1);

        final int numNamespacesAfter = ns.getNamespaceMap().size();

        // num of namespaces unchanges
        Assert.assertEquals(numNamespacesBefore, numNamespacesAfter);

    }

    @Test
    public void addAndExtractDeleteSingleNamespace() throws Exception {

        final NamespaceRegistry ns = getNamespaceRegistry();

        final int numNamespacesBefore = ns.getNamespaceMap().size();

        namespaceRule.set(DUMMY_PREFIX1, DUMMY_NAMESPACE1);

        final int numNamespacesAfterAdd = ns.getNamespaceMap().size();
        Assert.assertEquals(DUMMY_NAMESPACE1, ns.getNamespace(DUMMY_PREFIX1).get());
        Assert.assertEquals(numNamespacesBefore + 1, numNamespacesAfterAdd);

        namespaceRule.delete(DUMMY_PREFIX1);

        final int numNamespacesAfterDelete = ns.getNamespaceMap().size();
        Assert.assertFalse(ns.getNamespace(DUMMY_PREFIX1).isPresent());
        Assert.assertEquals(numNamespacesBefore, numNamespacesAfterDelete);

    }

    @Test
    public void addAndExtractDeleteMultipleNamespaces() throws Exception {

        final NamespaceRegistry ns = getNamespaceRegistry();

        final int numNamespacesBefore = ns.getNamespaceMap().size();

        namespaceRule.set(DUMMY_PREFIX1, DUMMY_NAMESPACE1);
        namespaceRule.set(DUMMY_PREFIX2, DUMMY_NAMESPACE2);
        namespaceRule.set(DUMMY_PREFIX3, DUMMY_NAMESPACE3);

        final int numNamespacesAfterAdd = ns.getNamespaceMap().size();
        Assert.assertEquals(DUMMY_NAMESPACE1, ns.getNamespace(DUMMY_PREFIX1).get());
        Assert.assertEquals(DUMMY_NAMESPACE2, ns.getNamespace(DUMMY_PREFIX2).get());
        Assert.assertEquals(DUMMY_NAMESPACE3, ns.getNamespace(DUMMY_PREFIX3).get());
        Assert.assertEquals(numNamespacesBefore + 3, numNamespacesAfterAdd);

        // delete only two of them
        namespaceRule.delete(DUMMY_PREFIX1);
        namespaceRule.delete(DUMMY_PREFIX3);

        final int numNamespacesAfterDelete = ns.getNamespaceMap().size();
        Assert.assertFalse(ns.getNamespace(DUMMY_PREFIX1).isPresent());
        Assert.assertTrue(ns.getNamespace(DUMMY_PREFIX2).isPresent());
        Assert.assertFalse(ns.getNamespace(DUMMY_PREFIX3).isPresent());
        Assert.assertEquals(numNamespacesBefore + 1 /* added: 3 - deleted: 2 */, numNamespacesAfterDelete);

    }

    @Test
    public void addAndDeleteReaddSingleNamespace() throws Exception {

        final NamespaceRegistry ns = getNamespaceRegistry();

        final int numNamespacesBefore = ns.getNamespaceMap().size();

        namespaceRule.set(DUMMY_PREFIX1, DUMMY_NAMESPACE1);

        final int numNamespacesAfterAdd = ns.getNamespaceMap().size();
        Assert.assertEquals(DUMMY_NAMESPACE1, ns.getNamespace(DUMMY_PREFIX1).get());
        Assert.assertEquals(numNamespacesBefore + 1, numNamespacesAfterAdd);

        namespaceRule.delete(DUMMY_PREFIX1);

        final int numNamespacesAfterDelete = ns.getNamespaceMap().size();
        Assert.assertFalse(ns.getNamespace(DUMMY_PREFIX1).isPresent());
        Assert.assertEquals(numNamespacesBefore, numNamespacesAfterDelete);

        namespaceRule.set(DUMMY_PREFIX1, DUMMY_NAMESPACE2);

        final int numNamespacesAfterAdd2 = ns.getNamespaceMap().size();
        Assert.assertEquals(DUMMY_NAMESPACE2, ns.getNamespace(DUMMY_PREFIX1).get());
        Assert.assertEquals(numNamespacesBefore + 1, numNamespacesAfterAdd2);

    }

    @Test
    public void changeNamespaceDefinition() throws Exception {

        final NamespaceRegistry ns = getNamespaceRegistry();

        final int numNamespacesBefore = ns.getNamespaceMap().size();

        namespaceRule.set(DUMMY_PREFIX1, DUMMY_NAMESPACE1);

        final int numNamespacesAfterAdd = ns.getNamespaceMap().size();
        Assert.assertEquals(DUMMY_NAMESPACE1, ns.getNamespace(DUMMY_PREFIX1).get());
        Assert.assertEquals(numNamespacesBefore + 1, numNamespacesAfterAdd);

        namespaceRule.set(DUMMY_PREFIX1, DUMMY_NAMESPACE2);

        final int numNamespacesAfterChange = ns.getNamespaceMap().size();
        Assert.assertEquals(DUMMY_NAMESPACE2, ns.getNamespace(DUMMY_PREFIX1).get());
        Assert.assertEquals(numNamespacesBefore + 1, numNamespacesAfterChange);

    }

    @Test
    public void testPrefixedIRISucceedingWithSystemNamespace() throws Exception {

        final NamespaceRegistry ns = getNamespaceRegistry();

        final Optional<IRI> iri = ns.resolveToIRI(NamespaceRegistry.RuntimeNamespace.USER + ":Michael");

        Assert.assertEquals(NamespaceRegistry.DFLT_USER_NAMESPACE + "Michael", iri.get().stringValue());

    }

    @Test
    public void testPrefixedIRISucceedingWithCustomNamespace() throws Exception {

        final NamespaceRegistry ns = getNamespaceRegistry();

        namespaceRule.set(DUMMY_PREFIX1, DUMMY_NAMESPACE1);

        final Optional<IRI> iri1 = ns.resolveToIRI(DUMMY_IRI1_AS_PREFIXED_IRI);

        Assert.assertEquals(DUMMY_IRI1, iri1.get().stringValue());

    }

    @Test
    public void testPrefixedIRISucceedingWithColonInLocalName() throws Exception {
        final NamespaceRegistry ns = getNamespaceRegistry();
        namespaceRule.set(DUMMY_PREFIX1, DUMMY_NAMESPACE1);
        final Optional<IRI> iri1 = ns.resolveToIRI("myns1:skos:Concept");
        Assert.assertEquals("http://myns1.example.com/skos:Concept", iri1.get().stringValue());
    }

    @Test
    public void testIRIResolutionFailingBecausePrefixUndefined() throws Exception {

        final NamespaceRegistry ns = getNamespaceRegistry();

        namespaceRule.set(DUMMY_PREFIX1, DUMMY_NAMESPACE1);

        final Optional<IRI> iri = ns.resolveToIRI("unknownNs:myTest");

        Assert.assertFalse(iri.isPresent());

    }

    @Test
    public void testIRIResolutionFailingBecauseInvalidPrefixedIri() throws Exception {

        final NamespaceRegistry ns = getNamespaceRegistry();

        namespaceRule.set(DUMMY_PREFIX1, DUMMY_NAMESPACE1);

        try {

            ns.resolveToIRI("myns1:mytest/mytest"); // -> should throw IllegalArgumentException

        } catch (IllegalArgumentException e) {

            return; // expected

        }

        throw new RuntimeException("Expected to end up in exception.");

    }

    @Test
    public void testPrefixExtraction() throws Exception {

        final NamespaceRegistry ns = getNamespaceRegistry();

        namespaceRule.set(DUMMY_PREFIX1, DUMMY_NAMESPACE1);

        final Optional<String> userPrefix = ns.getPrefix(NamespaceRegistry.DFLT_USER_NAMESPACE);
        final Optional<String> ns1Prefix = ns.getPrefix(DUMMY_NAMESPACE1);
        final Optional<String> unknownPrefix = ns.getPrefix("http://no.namespace.registered/");

        Assert.assertEquals(NamespaceRegistry.RuntimeNamespace.USER, userPrefix.get());
        Assert.assertEquals(DUMMY_PREFIX1, ns1Prefix.get());
        Assert.assertFalse(unknownPrefix.isPresent());

    }

    @Test
    public void testSpecialTemplatePrefixedIRI() throws Exception {
        final NamespaceRegistry ns = getNamespaceRegistry();

        Assert.assertEquals(vf.createIRI("Template:" + DUMMY_NAMESPACE1 + "templateTest"),
                ns.resolveToIRI("Template:" + DUMMY_NAMESPACE1 + "templateTest").get());

        namespaceRule.set(DUMMY_PREFIX1, DUMMY_NAMESPACE1);

        Assert.assertEquals(vf.createIRI("Template:" + DUMMY_NAMESPACE1 + "templateTest"),
                ns.resolveToIRI("Template:" + DUMMY_PREFIX1 + ":templateTest").get());
        Assert.assertEquals(vf.createIRI("Template:" + DUMMY_NAMESPACE1 + "templateTest"),
                ns.resolveToIRI("Template:" + DUMMY_NAMESPACE1 + "templateTest").get());
    }

    @Test
    public void looksLikePrefixedIriTest() throws Exception {

        final NamespaceRegistry ns = getNamespaceRegistry();
        namespaceRule.set(DUMMY_PREFIX1, DUMMY_NAMESPACE1);

        // in default namespace
        Assert.assertTrue(ns.looksLikePrefixedIri(":Test"));

        // just the prefix, without local name
        Assert.assertTrue(ns.looksLikePrefixedIri(DUMMY_PREFIX1 + ":"));

        // full IRI -> also looks like IRI
        Assert.assertTrue(ns.looksLikePrefixedIri(DUMMY_PREFIX1 + ":localName"));

        Assert.assertFalse(ns.looksLikePrefixedIri("test1"));

        Assert.assertTrue(ns.looksLikePrefixedIri("test1:test2:test3"));
    }

    NamespaceRegistry getNamespaceRegistry() {
        return namespaceRule.getNamespaceRegistry();
    }

}
