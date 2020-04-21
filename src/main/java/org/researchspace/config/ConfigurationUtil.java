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

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

import org.apache.commons.configuration2.CombinedConfiguration;
import org.apache.commons.configuration2.PropertiesConfiguration;
import org.apache.commons.configuration2.builder.FileBasedConfigurationBuilder;
import org.apache.commons.configuration2.builder.fluent.Parameters;
import org.apache.commons.configuration2.convert.DefaultListDelimiterHandler;
import org.apache.commons.configuration2.convert.ListDelimiterHandler;
import org.apache.commons.configuration2.ex.ConfigurationException;
import org.apache.commons.configuration2.io.FileHandler;
import org.apache.commons.configuration2.tree.OverrideCombiner;
import org.apache.commons.lang.StringUtils;
import org.researchspace.services.storage.api.ObjectRecord;
import org.researchspace.services.storage.api.PlatformStorage;
import org.researchspace.services.storage.api.StoragePath;

import javax.annotation.Nullable;

/**
 * Utility class for configuration management. Contains methods for setting up
 * configuration builders as well as generic string manipulation and conversion
 * methods related to configuration management
 * 
 * 
 * @author Artem Kozlov <ak@metaphacts.com>
 * @author Michael Schmidt <ms@metaphacts.com>
 */
public class ConfigurationUtil {

    /**
     * Return a comma-based delimiter handler, which is what we use for encoding
     * arrays in the configuration.
     * 
     * @return the list delimiter handler used by the configuration
     */
    public static ListDelimiterHandler commaBasedDelimiterHandler() {
        return new DefaultListDelimiterHandler(',');
    }

    /**
     * Splits the configuration value to a list using the commonly used
     * {@link DefaultListDelimiterHandler}.
     */
    public static List<String> configValueAsList(String val) {
        ListDelimiterHandler delimHandler = ConfigurationUtil.commaBasedDelimiterHandler();
        return new ArrayList<>(delimHandler.split(val, true));
    }

    /**
     * Escapes a list of configuration values using
     * {@link DefaultListDelimiterHandler}.
     */
    @Nullable
    public static Object listAsConfigValue(List<String> list) {
        if (list.isEmpty()) {
            return null;
        }
        ListDelimiterHandler delimHandler = ConfigurationUtil.commaBasedDelimiterHandler();
        return delimHandler.escapeList(list, item -> item);
    }

    @SuppressWarnings("unchecked")
    public static PropertiesConfiguration createEmptyConfig() {
        FileBasedConfigurationBuilder builder = new FileBasedConfigurationBuilder(PropertiesConfiguration.class)
                .configure(new Parameters().properties().setListDelimiterHandler(commaBasedDelimiterHandler())
                        .setEncoding("UTF-8"));

        try {
            return (PropertiesConfiguration) builder.getConfiguration();
        } catch (ConfigurationException e) {
            throw new RuntimeException(e);
        }
    }

    public static CombinedConfiguration readConfigFromStorageOverrides(PlatformStorage platformStorage,
            StoragePath objectId) throws IOException, ConfigurationException {
        CombinedConfiguration combined = new CombinedConfiguration(new OverrideCombiner());

        List<PlatformStorage.FindResult> overrides = platformStorage.findOverrides(objectId);
        // use inverted order [...override2, override1, base] for OverrideCombiner
        Collections.reverse(overrides);

        for (PlatformStorage.FindResult override : overrides) {
            ObjectRecord record = override.getRecord();
            PropertiesConfiguration config = createEmptyConfig();
            FileHandler handler = new FileHandler(config);
            try (InputStream content = record.getLocation().readContent()) {
                handler.load(content);
            }
            combined.addConfiguration(config, override.getAppId());
        }

        return combined;
    }

    /**
     * @return a list of storage IDs which override specified parameter in override
     *         order [base, override1, override2, ...]
     */
    public static List<String> getStorageIdsInOverrideOrderForParam(CombinedConfiguration combined,
            String parameterId) {
        List<String> order = combined.getConfigurationNameList().stream()
                .filter(appId -> combined.getConfiguration(appId).containsKey(parameterId))
                .collect(Collectors.toList());
        // restore override order (it's reversed for OverrideCombiner)
        Collections.reverse(order);
        return order;
    }

    /**
     * Converts a config parameter for the given group ID its unique system
     * parameter name. More precisely, a config parameter <PARAM> in group <GROUP>
     * is referenced via config.<GROUP>.<PARAM>. Throws an
     * {@link IllegalArgumentException} if the config parameter passed in is null or
     * empty.
     * 
     * @param groupId     the ID of the group the parameter belongs to
     * @param configParam the ID of the parameter itself
     * 
     * @return the associated system parameter string
     */
    public static String configParamToSystemParam(final String groupId, final String configParam) {

        if (StringUtils.isEmpty(configParam))
            throw new IllegalArgumentException();

        final StringBuilder sb = new StringBuilder();
        sb.append("config.").append(groupId).append(".").append(configParam);

        return sb.toString();
    }
}
