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

import org.apache.commons.lang.StringUtils;
import org.researchspace.config.groups.ConfigurationParameterType;

import java.util.Collection;
import java.util.List;

/**
 * Lightweight wrapper around the value of a configuration parameter. In
 * addition to the configuration parameter itself, it contains meta data such as
 * the information whether the value is shadowed in the configuration.
 *
 * The class overrides toString() to yield a string representation of the
 * parameter's value object.
 *
 * @author msc
 */
public class ConfigParameterValueInfo {
    private final String parameterType;
    private final Object value;
    private final boolean isShadowed;
    private final List<String> definedByApps;

    public ConfigParameterValueInfo(ConfigurationParameterType type, Object value, boolean isShadowed,
            List<String> definedByApps) {
        this.parameterType = type.getTypeName();
        this.value = value;
        this.isShadowed = isShadowed;
        this.definedByApps = definedByApps;
    }

    public String getParameterType() {
        return parameterType;
    }

    public Object getValue() {
        return value;
    }

    /**
     * @return whether config parameter is overridden by system property, e.g.
     *         {@code -Dproperty=...}
     */
    public boolean isShadowed() {
        return isShadowed;
    }

    /**
     * @return list of object storage IDs which defines property files wih values
     *         for this parameter, in override order (e.g. [base, override1,
     *         override2, ...])
     */
    public List<String> getDefinedByApps() {
        return definedByApps;
    }

    @Override
    public String toString() {
        if (parameterType.equals(ConfigurationParameterType.STRING_LIST.getTypeName())) {
            StringUtils.join((Collection<?>) value, ",");
        }
        return value.toString();
    }

}
