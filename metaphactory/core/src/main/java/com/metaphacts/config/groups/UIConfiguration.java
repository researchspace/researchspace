/*
 * Copyright (C) 2015-2017, metaphacts GmbH
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

package com.metaphacts.config.groups;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import com.google.common.collect.Lists;
import com.metaphacts.config.ConfigurationParameter;
import com.metaphacts.config.InvalidConfigurationException;
import com.metaphacts.config.NamespaceRegistry;
import com.google.inject.Provider;
import javax.inject.Inject;

/**
 * Configuration group for options that affect how data is displayed in the UI.
 *
 * @author Michael Schmidt <ms@metaphacts.com>
 */
public class UIConfiguration extends ConfigurationGroupBase {

    private final static String ID = "ui";

    // TODO: outline using locale
    private final static String DESCRIPTION =
        "Configuration options that affect how data is displayed in the UI.";

    @Inject
    private Provider<NamespaceRegistry> registry;

    public UIConfiguration() throws InvalidConfigurationException {

        super(ID, DESCRIPTION, ConfigurationBackingFileType.prop);
    }


    /***************************************************************************
     ************************ CONFIGURATION OPTIONS ****************************
     **************************************************************************/

    /**
     * Returns preferred label property IRIs for rendering resource
     * labels in the UI.
     *
     * @return a list of full IRIs enclosed in angle brackets (&lt;&gt;).
     */
    @ConfigurationParameter
    public List<String> getPreferredLabels() {
        return toFullIRIs(getStringList(
            "preferredLabels",
            Lists.newArrayList("<http://www.w3.org/2000/01/rdf-schema#label>")
        ));
    }

    @ConfigurationParameter
    public List<String> getPreferredLanguages() {
        return getStringList("preferredLanguages", Lists.newArrayList("en"));
    }

    /**
     * Returns preferred thumbnail property IRIs for rendering resource
     * thumbnail images in the UI.
     *
     * @return a list of full IRIs enclosed in angle brackets (&lt;&gt;).
     */
    @ConfigurationParameter
    public List<String> getPreferredThumbnails() {
        return toFullIRIs(getStringList(
            "preferredThumbnails",
            Lists.newArrayList("<http://schema.org/thumbnail>")
        ));
    }

    @ConfigurationParameter
    public String getTemplateIncludeQuery() {
        return getString("templateIncludeQuery", "SELECT ?type WHERE { ?? a ?type }");
    }

    @ConfigurationParameter
    public Boolean getEnableUiComponentBasedSecurity() {
        return getBoolean("enableUiComponentBasedSecurity", false);
    }
//    @ConfigurationParameter
//    public String getDatePattern() {
//        return getString("datePattern"); // TODO: this is not yet in use
//    }
//
//    @ConfigurationParameter
//    public String getTimePattern() {
//        return getString("timePattern"); // TODO: this is not yet in use
//    }

    @ConfigurationParameter
    public String getDeploymentTitle() {
        return getString("deploymentTitle", "metaphactory");
    }

    /****************************** VALIDATION ********************************/
    @Override
    public void assertConsistency() {
        // we can't use 'getPreferredLabels' to check consistency
        // because it depends on NamespaceRegistry which is not initialized when
        // assertConsistency is called
        if (getPreferredLanguages().isEmpty()) {
            throw new IllegalArgumentException("getPreferredLanguages must not be empty.");
        }
    }

    private List<String> toFullIRIs(List<String> iris) {
        NamespaceRegistry ns = registry.get();
        return iris.stream()
            .map(ns::resolveToIRI)
            .filter(Optional::isPresent)
            .map(iri -> '<' + iri.get().stringValue() + '>')
            .collect(Collectors.toList());
    }
}
