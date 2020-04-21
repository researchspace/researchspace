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

import java.util.List;
import java.util.Map;
import java.util.Map.Entry;

import org.apache.logging.log4j.Level;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.core.LoggerContext;
import org.apache.logging.log4j.core.config.LoggerConfig;
import org.junit.rules.ExternalResource;

import com.google.common.collect.Maps;

public class LogAppenderRule<T> extends ExternalResource {
    protected TestLogAppender appender;
    private Map<Class<? extends Object>, Level> classesToLog;
    final LoggerContext ctx = (LoggerContext) LogManager.getContext(false);
    final org.apache.logging.log4j.core.config.Configuration logConfig = ctx.getConfiguration();

    public LogAppenderRule(Map<Class<?>, Level> classesToLog) {
        this.init(classesToLog);
    }

    public LogAppenderRule(List<Class<? extends T>> classesToLog, Level level) {
        Map<Class<?>, Level> classMap = Maps.newHashMap();
        for (Class<?> cl : classesToLog) {
            classMap.put(cl, level);
        }
        this.init(classMap);
    }

    private void init(Map<Class<?>, Level> classesToLog) {
        appender = TestLogAppender.createAppender("TestAppender", null, null, null);
        appender.start();
        this.classesToLog = classesToLog;
    }

    @Override
    protected void before() throws Throwable {

        for (Entry<Class<?>, Level> e : this.classesToLog.entrySet()) {
            Logger classLogger = LogManager.getLogger(e.getKey());
            logConfig.addLoggerAppender((org.apache.logging.log4j.core.Logger) classLogger, appender);
            LoggerConfig loggerConfig = logConfig.getLoggerConfig(classLogger.getName());
            loggerConfig.setLevel(e.getValue());
        }

        ctx.updateLoggers();

        super.before();
    }

    @Override
    protected void after() {
        appender.clearLogMessages();
        for (String appender : logConfig.getLoggers().keySet()) {
            logConfig.removeLogger(appender);
        }
        super.after();
    }

    public List<String> getLogMessages() {
        return this.appender.getLogMessages();
    }

    public Map<String, Map<String, String>> getLogMessagesWithContextMap() {
        return this.appender.getLogMessagesWithContextMap();
    }
}
