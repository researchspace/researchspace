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

package com.metaphacts.templates.helper;

import static com.google.common.base.Preconditions.checkNotNull;

import java.util.List;
import java.util.Map.Entry;

import javax.ws.rs.core.UriInfo;

import org.apache.commons.lang.StringUtils;
import org.apache.commons.lang3.StringEscapeUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import com.github.jknack.handlebars.Handlebars;
import com.github.jknack.handlebars.Options;
import com.metaphacts.templates.TemplateContext;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 */
public class UrlParamHelperSource {

    private static final Logger logger = LogManager.getLogger(UrlParamHelperSource.class);

    public String urlParam(String param0, Options options) {
        TemplateContext context = (TemplateContext) options.context.model();
        UriInfo uriInfo = context.getUriInfo();
        String paramName = checkNotNull(param0,"Parameter name must not null or empty.");
        if (uriInfo != null) {
            for (Entry<String, List<String>> e : uriInfo.getQueryParameters().entrySet())
                if(e.getKey().equals(paramName)){
                    //TODO later we may provide additional hashParameter separator
                    String params = StringUtils.join(e.getValue(), ",");
                    logger.trace("Extracted requested url param with name {}: {}", paramName, params);
                    return new Handlebars.SafeString(StringEscapeUtils.escapeHtml4(params).toString()).toString();
                }
        }
        logger.debug("Did not find requested url param with name {}", paramName);
        return "";
      }
}