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

package org.researchspace.junit;

import java.io.Serializable;
import java.util.List;
import java.util.Map;

import org.apache.logging.log4j.core.Filter;
import org.apache.logging.log4j.core.Layout;
import org.apache.logging.log4j.core.LogEvent;
import org.apache.logging.log4j.core.appender.AbstractAppender;
import org.apache.logging.log4j.core.config.plugins.Plugin;
import org.apache.logging.log4j.core.config.plugins.PluginAttribute;
import org.apache.logging.log4j.core.config.plugins.PluginElement;
import org.apache.logging.log4j.core.config.plugins.PluginFactory;
import org.apache.logging.log4j.core.layout.PatternLayout;

import com.google.common.collect.Lists;
import com.google.common.collect.Maps;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
@Plugin(name = "TestLogAppender", category = "Core", elementType = "appender", printObject = true)
public class TestLogAppender extends AbstractAppender {
    private static final long serialVersionUID = -8567302632487170325L;
    private final Map<String, Map<String, String>> logs = Maps.newLinkedHashMap();

    protected TestLogAppender(String name, Filter filter, Layout<? extends Serializable> layout) {
        super(name, filter, layout);
    }

    @Override
    public void append(LogEvent event) {
        this.logs.put(event.getMessage().getFormattedMessage(), event.getContextMap());
    }

    @PluginFactory
    public static TestLogAppender createAppender(@PluginAttribute("name") String name,
            @PluginElement("Layout") Layout<? extends Serializable> layout,
            @PluginElement("Filter") final Filter filter, @PluginAttribute("otherAttribute") String otherAttribute) {
        if (name == null) {
            return null;
        }
        if (layout == null) {
            layout = PatternLayout.createDefaultLayout();
        }
        return new TestLogAppender(name, filter, layout);
    }

    public List<String> getLogMessages() {
        return Lists.newArrayList(this.logs.keySet());
    }

    public Map<String, Map<String, String>> getLogMessagesWithContextMap() {
        return this.logs;
    }

    public void clearLogMessages() {
        this.logs.clear();
    }
}