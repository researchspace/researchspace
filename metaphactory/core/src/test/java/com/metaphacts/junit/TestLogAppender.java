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

package com.metaphacts.junit;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

import org.apache.logging.log4j.core.Filter;
import org.apache.logging.log4j.core.Layout;
import org.apache.logging.log4j.core.LogEvent;
import org.apache.logging.log4j.core.appender.AbstractAppender;
import org.apache.logging.log4j.core.config.plugins.Plugin;
import org.apache.logging.log4j.core.config.plugins.PluginAttribute;
import org.apache.logging.log4j.core.config.plugins.PluginElement;
import org.apache.logging.log4j.core.config.plugins.PluginFactory;
import org.apache.logging.log4j.core.layout.PatternLayout;


/**
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
@Plugin(name = "TestLogAppender", category = "Core", elementType = "appender", printObject = true)
public class TestLogAppender extends AbstractAppender {
    private static final long serialVersionUID = -8567302632487170325L;
    private List<String> logs = new ArrayList<String>();

    protected TestLogAppender(String name, Filter filter, Layout<? extends Serializable> layout) {
        super(name, filter, layout);
    }

    @Override
    public void append(LogEvent event) {
        this.logs.add(event.getMessage().getFormattedMessage());
    }

    @PluginFactory
    public static TestLogAppender createAppender(@PluginAttribute("name") String name,
            @PluginElement("Layout") Layout<? extends Serializable> layout, 
            @PluginElement("Filter") final Filter filter,
            @PluginAttribute("otherAttribute") String otherAttribute) {
        if (name == null) {
            return null;
        }
        if (layout == null) {
            layout = PatternLayout.createDefaultLayout();
        }
        return new TestLogAppender(name, filter, layout);
    }

    public List<String> getLogMessages() {
        return logs;
    }
    
    public void clearLogMessages(){
        logs.clear();
    }
}