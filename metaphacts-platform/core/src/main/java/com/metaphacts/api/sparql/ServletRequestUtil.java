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

package com.metaphacts.api.sparql;

import java.util.Collection;
import java.util.Collections;
import java.util.Enumeration;
import java.util.Map;
import java.util.Optional;
import java.util.Map.Entry;

import javax.servlet.http.HttpServletRequest;

import com.google.common.base.Strings;
import org.apache.commons.lang.StringUtils;
import org.apache.http.HeaderElement;
import org.apache.http.HttpHeaders;
import org.apache.http.message.BasicHeaderValueParser;
import org.apache.logging.log4j.Logger;
import org.commonjava.mimeparse.MIMEParse;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class ServletRequestUtil {

    /**
     * Pretty logging of request parameters and request headers to supplied
     * loggerif logger is traced enabled.
     *
     * @param req
     * @param logger
     */
    public static void traceLogRequest(HttpServletRequest req, Logger logger) {
        if(logger.isTraceEnabled()) {
            StringBuilder sb = new StringBuilder();
            Map<String, String[]> map = req.getParameterMap();
            if(map==null) return;
            for(Entry<String, String[]> e : map.entrySet()){
                sb.append(e.getKey()+":");
                sb.append(StringUtils.join(e.getValue(), ",") + " | ");
            }
            logger.trace("Request Parameters: "+ sb.toString());
            sb = new StringBuilder();
            Enumeration<String> headers = req.getHeaderNames();
            if(headers==null) return;
            while(headers.hasMoreElements()){
                String h = headers.nextElement();
                sb.append(h +":");
                sb.append(StringUtils.join(Collections.<String>list(req.getHeaders(h)),",") + " | ");
            }
            logger.trace("Request Headers: "+ sb.toString());
        }
    }

    /**
     * Finds the best matching mime type from the {@link HttpHeaders#ACCEPT}
     * header of the supplied {@link HttpServletRequest}.
     *
     * @param possibleMimeTypes
     * @param req
     * @return best matching mime type string
     */
    public static Optional<String> getPreferredMIMEType(Collection<String> possibleMimeTypes, HttpServletRequest req){
        if(possibleMimeTypes==null || possibleMimeTypes.isEmpty()) return Optional.<String>empty();

        /*
         * Most clients will only send one "Accept" header field, for example:
         * Accept: text/csv;q=0.8,application/sparql-results+json;q=0.8,application/sparql-results+xml
         * However HTTP specification also allows to send multiple "Accept" fields (that is, for example, what the sesame sparql client does):
         * Accept: text/csv;q=0.8
         * Accept: application/sparql-results+json;q=0.8
         * Accept: application/sparql-results+xml
         * As such we need to concatenate multiple headers by comma, as input for {@link MIMEParse#bestMatch}.
         */
        Enumeration<String> acceptHeader = req.getHeaders(HttpHeaders.ACCEPT);
        String commaSeparatedAcceptHeader = StringUtils.join(Collections.<String>list(acceptHeader),",");
        String matchType = MIMEParse.bestMatch(possibleMimeTypes, commaSeparatedAcceptHeader);
        return Strings.isNullOrEmpty(matchType) ? Optional.<String>empty() : Optional.of(matchType);
    }


    /**
     * Extracts the MimeType string from the "Content-Type" header string
     * without, for example, charset.
     *
     * @param expectedContentType
     *            list of possible/expected mime types. If no list is supplied,
     *            first element of the header string will be returned (which is
     *            usually the content type).
     * @param req
     * @return best matching content mime type string
     */
    public static Optional<String> getContentType(HttpServletRequest req, Optional<Collection<String>> expectedContentType) {
        if(StringUtils.isEmpty(req.getContentType())){
            return Optional.<String>empty();
        }

        if(!expectedContentType.isPresent()){
            for(HeaderElement e : BasicHeaderValueParser.parseElements(req.getContentType(), new BasicHeaderValueParser())){
                return Optional.<String>of(e.getName());
            }
        }
        Collection<String> expectedTypes = expectedContentType.get();
        if(expectedTypes.isEmpty()){
            throw new IllegalArgumentException("Expected list of possible content types not be empty.");
        }
        String mimeType = MIMEParse.bestMatch(expectedTypes, req.getContentType());
        if(StringUtils.isEmpty(mimeType)){
            return Optional.<String>empty();
        }
        return Optional.<String>of(mimeType);
    }
}
