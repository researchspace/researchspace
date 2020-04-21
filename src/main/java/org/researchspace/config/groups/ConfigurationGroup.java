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

package org.researchspace.config.groups;

import java.util.List;
import java.util.Map;

import org.researchspace.config.ConfigParameterValueInfo;
import org.researchspace.config.UnknownConfigurationException;

/**
 * A configuration group, summarizing thematically grouped configurations.
 * 
 * @author Michael Schmidt <ms@metaphacts.com>
 */
public interface ConfigurationGroup {
    /**
     * @return the unique ID of the configuration group
     */
    String getId();

    /**
     * @return the description of the configuration group
     */
    String getDescription();

    /**
     * Asserts that the configuration is semantically sound and complete, i.e. that
     * required parameters are given etc.
     */
    void assertConsistency();

    /**
     * Returns the value of the parameter interpreted as a string. This method
     * considers overrides via -Dconfig.<ConfigGroup>.<ParamId>, i.e. if the
     * parameter is overriden as a system parameter, the override will be returned.
     * 
     * @param paramName the configuration parameter name relative to the group
     * @return the current string value of the parameter
     */
    String getString(String paramName);

    /**
     * Returns the value of the parameter interpreted as an integer. This method
     * considers overrides via -Dconfig.<ConfigGroup>.<ParamId>, i.e. if the
     * parameter is overriden as a valid system parameter, the override will be
     * returned.
     * 
     * @param paramName     the configuration parameter name relative to the group
     * @param fallbackValue the fallback value
     * @return the current string value of the parameter
     */
    Integer getInteger(String paramName, Integer fallbackValue);

    /**
     * Returns the value of the parameter interpreted as an integer. This method
     * considers overrides via -Dconfig.<ConfigGroup>.<ParamId>, i.e. if the
     * parameter is overriden as a valid system parameter, the override will be
     * returned.
     *
     * @param paramName the configuration parameter name relative to the group
     * @return the current string value of the parameter
     */
    Integer getInteger(String paramName);

    /**
     * Returns the value of the parameter interpreted as a string. This method
     * considers overrides via -Dconfig.<ConfigGroup>.<ParamId>, i.e. if the
     * parameter is overriden as a system parameter, the override will be returned.
     * 
     * @param paramName     the configuration parameter name relative to the group
     * @param fallbackValue the fallback value
     * @return the current string value of the parameter the fallback value, in case
     *         the parameter value is undefined
     */
    String getString(String paramName, String fallbackValue);

    /**
     * Returns the value of the parameter interpreted as a boolean.
     *
     * @see ConfigurationGroup#getString(String)
     */
    Boolean getBoolean(String paramName);

    /**
     * Returns the value of the parameter interpreted as a boolean.
     *
     * @see ConfigurationGroup#getString(String, String)
     */
    Boolean getBoolean(String paramName, Boolean fallbackValue);

    /**
     * Returns the configuration parameter by (group-specific) name or null if the
     * configuration parameter is not defined. This method considers overrides via
     * -Dconfig.<ConfigGroup>.<ParamId>, i.e. if the parameter is overriden as a
     * system parameter, the override will be returned.
     * 
     * @return The parameters is returned as a List<String>. If the value has no
     *         String
     * @return array representation or the parameter is not set, the method returns
     *         null.
     */
    List<String> getStringList(String paramName);

    /**
     * Returns the configuration parameter by (group-specific) name or dfltValue if
     * the configuration parameter is not defined. This method considers overrides
     * via -Dconfig.<ConfigGroup>.<ParamId>, i.e. if the parameter is overriden as a
     * system parameter, the override will be returned.
     * 
     * @return the parameter value is returned as a List<String>. If the value has
     *         no String Array representation or the parameter is not set, the
     *         method returns {@code fallbackValue}.
     */
    List<String> getStringList(String paramName, List<String> fallbackValue);

    /**
     * Returns static type of the configuration parameter.
     *
     * @throws UnknownConfigurationException
     */
    ConfigurationParameterType getParameterType(String paramName) throws UnknownConfigurationException;

    ConfigParameterValueInfo getParameterInfo(String paramName) throws UnknownConfigurationException;

    Map<String, ConfigParameterValueInfo> getAllParametersInfo() throws UnknownConfigurationException;
}
