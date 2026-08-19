/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * 
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

package org.researchspace.federation.repository;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.io.StringReader;
import java.util.Arrays;
import java.util.HashSet;

import org.eclipse.rdf4j.federated.repository.FedXRepositoryConfig;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.LinkedHashModel;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.eclipse.rdf4j.rio.Rio;
import org.eclipse.rdf4j.sail.config.SailConfigException;
import org.junit.Test;

public class MpFederationConfigTest {

    private static final ValueFactory vf = SimpleValueFactory.getInstance();

    private static final String PREFIXES = "@prefix fedx: <http://rdf4j.org/config/federation#> .\n"
            + "@prefix ephedra: <http://www.researchspace.org/resource/system/ephedra#> .\n"
            + "@prefix config: <tag:rdf4j.org,2023:config/> .\n"
            + "@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .\n";

    private static final String FEDX_MEMBERS_ONLY = "<urn:impl> ephedra:defaultMember \"default\" ;\n"
            + "  fedx:member [ fedx:store \"ResolvableRepository\" ; fedx:repositoryName \"wikidata-sparql\" ] ;\n"
            + "  fedx:member [ fedx:store \"ResolvableRepository\" ; fedx:repositoryName \"artresearch-sparql\" ] .\n";

    private MpFederationConfig parse(String ttlBody) throws Exception {
        Model model = Rio.parse(new StringReader(PREFIXES + ttlBody), "", RDFFormat.TURTLE);
        MpFederationConfig config = new MpFederationConfig();
        config.parse(model, vf.createIRI("urn:impl"));
        return config;
    }

    /**
     * A federation declaring its members only via fedx:member (the shape of the
     * shipped default fedx.ttl) must be considered valid. Regression test for the
     * repository manager UI returning HTTP 500 "No federation members were
     * configured." for such configs.
     */
    @Test
    public void validateAcceptsFedxMemberOnlyFederation() throws Exception {
        MpFederationConfig config = parse(FEDX_MEMBERS_ONLY);
        config.validate();
    }

    @Test(expected = SailConfigException.class)
    public void validateRejectsFederationWithoutMembers() throws Exception {
        MpFederationConfig config = parse("<urn:impl> ephedra:defaultMember \"default\" .\n");
        config.validate();
    }

    @Test(expected = SailConfigException.class)
    public void validateRejectsFederationWithoutDefaultMember() throws Exception {
        MpFederationConfig config = parse(
                "<urn:impl> fedx:member [ fedx:store \"ResolvableRepository\" ; fedx:repositoryName \"repo1\" ] .\n");
        config.validate();
    }

    /**
     * The repository manager UI round-trips configs through parse() and export().
     * fedx:member entries must survive that round-trip, otherwise saving a
     * federation config from the UI silently drops all FedX members.
     */
    @Test
    public void exportPreservesFedxMembersOnRoundTrip() throws Exception {
        MpFederationConfig config = parse(FEDX_MEMBERS_ONLY);

        Model exported = new LinkedHashModel();
        Resource implNode = config.export(exported);

        MpFederationConfig reparsed = new MpFederationConfig();
        reparsed.parse(exported, implNode);

        assertEquals(new HashSet<>(Arrays.asList("wikidata-sparql", "artresearch-sparql")),
                new HashSet<>(reparsed.getFedxMemberRepositoryIds()));
        // the exported model must remain valid
        reparsed.validate();
    }

    @Test
    public void exportPreservesRestServicePrefetchSizeOnRoundTrip() throws Exception {
        MpFederationConfig config = parse(FEDX_MEMBERS_ONLY.replace(" .\n", " ;\n")
                + "  ephedra:restServicePrefetchSize 7 .\n");
        assertEquals(7, config.getRestServicePrefetchSize());

        Model exported = new LinkedHashModel();
        Resource implNode = config.export(exported);

        MpFederationConfig reparsed = new MpFederationConfig();
        reparsed.parse(exported, implNode);
        assertEquals(7, reparsed.getRestServicePrefetchSize());
    }

    /**
     * Only fedx:member entries resolvable through the local RepositoryManager
     * (fedx:store "ResolvableRepository") may be treated as local repository
     * dependencies; other member types must not produce phantom dependencies
     * that break repository dependency sorting at startup.
     */
    @Test
    public void parseIgnoresNonResolvableFedxMembers() throws Exception {
        MpFederationConfig config = parse("<urn:impl> ephedra:defaultMember \"default\" ;\n"
                + "  fedx:member [ fedx:store \"RemoteRepository\" ; "
                + "fedx:repositoryServer <http://example.org/rdf4j-server> ; fedx:repositoryName \"remote-repo\" ] ;\n"
                + "  fedx:member [ fedx:store \"ResolvableRepository\" ; fedx:repositoryName \"wikidata-sparql\" ] .\n");

        assertEquals(Arrays.asList("wikidata-sparql"), config.getFedxMemberRepositoryIds());
        assertFalse(config.getDelegateRepositoryIDs().contains("remote-repo"));
    }

    @Test
    public void getDelegateRepositoryIDsOmitsNullDefaultMember() throws Exception {
        MpFederationConfig config = parse(
                "<urn:impl> fedx:member [ fedx:store \"ResolvableRepository\" ; fedx:repositoryName \"repo1\" ] .\n");
        assertFalse("must not report null as a repository dependency",
                config.getDelegateRepositoryIDs().contains(null));
        assertTrue(config.getDelegateRepositoryIDs().contains("repo1"));
    }

    /**
     * An explicit fedx:enableServiceAsBoundJoin in fedx:config must not be
     * clobbered by the legacy ephedra:useBoundJoin default when the federation
     * sail is instantiated.
     */
    @Test
    public void explicitEnableServiceAsBoundJoinIsRespected() throws Exception {
        MpFederationConfig config = parse(FEDX_MEMBERS_ONLY.replace(" .\n", " ;\n")
                + "  fedx:config [ fedx:enableServiceAsBoundJoin false ] .\n");

        new MpFederation(config);
        assertFalse(config.getFedXConfig().getEnableServiceAsBoundJoin());
    }

    @Test
    public void legacyUseBoundJoinDisablesServiceAsBoundJoin() throws Exception {
        MpFederationConfig config = parse(FEDX_MEMBERS_ONLY.replace(" .\n", " ;\n")
                + "  ephedra:useBoundJoin false .\n");

        new MpFederation(config);
        assertFalse(config.getFedXConfig().getEnableServiceAsBoundJoin());
    }

    @Test
    public void serviceAsBoundJoinDefaultsToTrue() throws Exception {
        MpFederationConfig config = parse(FEDX_MEMBERS_ONLY);

        new MpFederation(config);
        assertTrue(config.getFedXConfig().getEnableServiceAsBoundJoin());
    }

    /**
     * Ephedra-style configs (config:fed.member service members only) must stay
     * valid and keep exporting their members.
     */
    @Test
    public void ephedraMembersRoundTrip() throws Exception {
        MpFederationConfig config = parse("<urn:impl> ephedra:defaultMember \"default\" ;\n"
                + "  config:fed.member [ ephedra:delegateRepositoryID \"assets\" ; "
                + "ephedra:serviceReference <http://example.org/assets> ] .\n");
        config.validate();

        Model exported = new LinkedHashModel();
        Resource implNode = config.export(exported);

        MpFederationConfig reparsed = new MpFederationConfig();
        reparsed.parse(exported, implNode);
        reparsed.validate();
        assertEquals(1, reparsed.getRepositoryIDMappings().size());
        assertTrue(reparsed.getDelegateRepositoryIDs().contains("assets"));
    }

    /**
     * The old engine's join-algorithm selectors have no FedX equivalent; a
     * config that still sets them must parse fine (with a logged warning) —
     * silently rejecting existing configs would break deployments on upgrade.
     */
    @Test
    public void legacyJoinOptionsAreAcceptedAndIgnored() throws Exception {
        MpFederationConfig config = parse("<urn:impl> ephedra:defaultMember \"default\" ;\n"
                + "  ephedra:useAsyncParallelJoin \"false\"^^xsd:boolean ;\n"
                + "  ephedra:useCompetingJoin \"false\"^^xsd:boolean ;\n"
                + "  config:fed.member [ ephedra:delegateRepositoryID \"assets\" ; "
                + "ephedra:serviceReference <http://example.org/assets> ] .\n");
        config.validate();

        // the ignored options are not re-exported
        Model exported = new LinkedHashModel();
        config.export(exported);
        assertTrue(exported.filter(null,
                org.researchspace.repository.MpRepositoryVocabulary.USE_ASYNCHRONOUS_PARALLEL_JOIN, null).isEmpty());
        assertTrue(exported.filter(null,
                org.researchspace.repository.MpRepositoryVocabulary.USE_COMPETING_JOIN, null).isEmpty());
    }

    /**
     * The admin UI round-trips repository configurations through
     * parse → export on every save (and even on GET). Every FedXConfig setting
     * upstream can parse must survive that round trip — in particular
     * {@code fedx:prefixDeclarations}, which is consumed at runtime.
     */
    @Test
    public void exportRoundTripsPrefixDeclarations() throws Exception {
        MpFederationConfig config = parse("<urn:impl> ephedra:defaultMember \"default\" ;\n"
                + "  config:fed.member [ ephedra:delegateRepositoryID \"assets\" ; "
                + "ephedra:serviceReference <http://example.org/assets> ] ;\n"
                + "  fedx:config [ fedx:prefixDeclarations \"/runtime-data/prefixes.prop\" ] .\n");

        Model exported = new LinkedHashModel();
        config.export(exported);

        assertTrue("fedx:prefixDeclarations must survive the config round trip",
                exported.contains(null, FedXRepositoryConfig.CONFIG_PREFIX_DECLARATIONS,
                        vf.createLiteral("/runtime-data/prefixes.prop")));
    }
}
