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
import java.util.Iterator;

import org.apache.commons.lang3.StringEscapeUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.query.BindingSet;

import com.github.jknack.handlebars.Handlebars;
import com.github.jknack.handlebars.Options;
import com.metaphacts.templates.helper.HelperUtil.QueryResult;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class JsonArrayFromSelectSource {
    private static final Logger logger = LogManager.getLogger(JsonArrayFromSelectSource.class);

    public String jsonArrayFromSelect(String param0, Options options) throws IOException {
        QueryResult result = HelperUtil.evaluateSelectQuery(param0, options, logger);
        String bindingVariable = options.hash("binding");

        StringBuilder sb = new StringBuilder();
        if (!StringUtils.isEmpty(bindingVariable) && !result.bindingNames.contains(bindingVariable)) {
          throw new IllegalArgumentException("Binding variable "+bindingVariable+" does not exist in query result");
        }
        if (StringUtils.isEmpty(bindingVariable)) {
            bindingVariable = result.bindingNames.get(0);
        }
        sb.append("[");
        Iterator<BindingSet> iter = result.bindings.iterator();
        while (iter.hasNext()) {
            BindingSet binding = iter.next();
            Value value = binding.getValue(bindingVariable);
            if (value != null) {
                sb.append("\"");
                sb.append(StringEscapeUtils.escapeJson(value.stringValue()));
                sb.append("\"");
                if (iter.hasNext()) {
                    sb.append(",");
                }
            }
        }
        sb.append("]");
        //TODO check whether this is safe enough or even to restrictive
        return new Handlebars.SafeString(StringEscapeUtils.escapeHtml4(sb.toString())).toString();
    }
}
