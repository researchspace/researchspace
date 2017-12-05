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

package com.metaphacts.templates.helper;

import java.io.IOException;

import org.apache.commons.lang3.StringEscapeUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import com.github.jknack.handlebars.Options;

/**
 * Same helper as {@link SingleValueFromSelectSource}, however, everything properly HTML and JSON escaped.
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class JsonValueFromSelectSource {

    private static final Logger logger = LogManager.getLogger(JsonValueFromSelectSource.class);

    public String jsonValueFromSelect(String param0, Options options) throws IOException {
        logger.trace("Evaluating {} Template Helper by delegating to singleValueFromSelectSource.", options.helperName);
        String result = StringEscapeUtils.escapeHtml4(
                        StringEscapeUtils.escapeJson(
                            new SingleValueFromSelectSource().singleValueFromSelect(param0, options)
                        )
                    );
        return StringUtils.isEmpty(result) ? "null" :"\""+result+"\"";
    }
}