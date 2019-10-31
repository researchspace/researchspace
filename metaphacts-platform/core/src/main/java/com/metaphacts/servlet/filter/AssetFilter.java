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

package com.metaphacts.servlet.filter;

import java.io.BufferedOutputStream;
import java.io.IOException;
import java.util.Optional;

import javax.inject.Inject;
import javax.inject.Singleton;
import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.annotation.WebFilter;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.metaphacts.services.storage.api.*;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang.StringUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import com.google.common.net.HttpHeaders;
import com.google.common.net.MediaType;
import com.metaphacts.config.Configuration;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 *
 *         Filter to serve assets from app folder if available and local folders otherwise
 *
 *         TODO use something like COR pattern to make it more generic i.e. to
 *         also serve files from a e.g. upload folder
 */
@Singleton
@WebFilter
public class AssetFilter implements Filter {
    public static final String ASSETS_PATH_PREFIX = "/assets/";
    public static final String IMAGES_PATH_PREFIX = "/images/";

    private static final Logger logger = LogManager.getLogger(AssetFilter.class);

    @Inject
    private Configuration config;
    @Inject
    private PlatformStorage platformStorage;

    @Override
    public void init(FilterConfig filterConfig) throws ServletException {
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        if (request instanceof HttpServletRequest) {
            HttpServletRequest httpRequest = (HttpServletRequest) request;
            HttpServletResponse httpResponse = (HttpServletResponse) response;

            String prefixedPath = httpRequest.getRequestURI().substring(
                httpRequest.getContextPath().length());

            String assetPath;
            if (prefixedPath.startsWith(ASSETS_PATH_PREFIX)) {
                assetPath = prefixedPath.substring(ASSETS_PATH_PREFIX.length());
            } else if (prefixedPath.startsWith(IMAGES_PATH_PREFIX)) {
                assetPath = "images/" + prefixedPath.substring(IMAGES_PATH_PREFIX.length());
            } else {
                assetPath = StringUtils.removeStart(prefixedPath, "/");
            }

            StoragePath objectPath = ObjectKind.ASSET.resolve(assetPath);
            Optional<PlatformStorage.FindResult> found = platformStorage.findObject(objectPath);
            if (found.isPresent()) {
                PlatformStorage.FindResult result = found.get();
                logger.trace("Serving asset file \"" + objectPath + "\" from app \"" + result.getAppId() + "\"");

                String filename = objectPath.getLastComponent();
                String contentType = request.getServletContext().getMimeType(filename);
                if (contentType == null) {
                    contentType = MediaType.OCTET_STREAM.toString();
                }
                httpResponse.setContentType(contentType);

                boolean download = Boolean.parseBoolean(httpRequest.getParameter("attachment"));
                if (download) {
                    httpResponse.setHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"");
                }
                // if not explicitly requesting a forced download, we do not
                // add a content-disposition at all but let the browser
                // decide i.e. using the contentType

                try (SizedStream content = result.getRecord().getLocation().readSizedContent()) {
                    httpResponse.setHeader(HttpHeaders.CONTENT_LENGTH, String.valueOf(content.getLength()));
                    try (BufferedOutputStream output = new BufferedOutputStream(response.getOutputStream())) {
                        IOUtils.copy(content.getStream(), output);
                        output.flush();
                    }
                }
            }
        }

        //proceed with the standard filter chain otherwise
        chain.doFilter(request, response);
    }

    @Override
    public void destroy() {
    }
}
