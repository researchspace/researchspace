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

package org.researchspace.plugin;

import org.apache.commons.lang3.StringUtils;

import ro.fortsoft.pf4j.PluginDescriptor;

/**
 * Custom platform extension of the default {@link PluginDescriptor} to support
 * configuration via plugin.properties.
 *
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class PlatformPluginDescriptor extends PluginDescriptor {
    /**
     * Overrides the default behavior and returns {@link PlatformPlugin} class a
     * default in case this is not set in plugin.properties
     *
     * @see ro.fortsoft.pf4j.PluginDescriptor#getPluginClass()
     */
    @Override
    public String getPluginClass() {
        return StringUtils.isEmpty(super.getPluginClass()) ? PlatformPlugin.class.getCanonicalName()
                : super.getPluginClass();
    }
}
