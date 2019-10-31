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

package com.metaphacts.plugin;

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
     * Overrides the default behavior and returns
     * {@link PlatformPlugin} class a default in case
     * this is not set in plugin.properties
     *
     * @see ro.fortsoft.pf4j.PluginDescriptor#getPluginClass()
     */
    @Override
    public String getPluginClass() {
        return StringUtils.isEmpty(super.getPluginClass()) ? PlatformPlugin.class.getCanonicalName() : super.getPluginClass();
    }
}
