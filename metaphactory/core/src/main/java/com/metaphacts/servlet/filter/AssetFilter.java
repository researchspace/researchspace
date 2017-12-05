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

package com.metaphacts.servlet.filter;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;

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

import org.apache.commons.io.IOUtils;
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
    
    private static final Logger logger = LogManager.getLogger(AssetFilter.class);

    @Inject
    private Configuration config;
   
    @Override
    public void init(FilterConfig filterConfig) throws ServletException {
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        if (request instanceof HttpServletRequest) {
            HttpServletRequest httpRequest = ((HttpServletRequest) request);
            String path = httpRequest.getRequestURI().substring(
                    httpRequest.getContextPath().length());
            
             for(File d : config.getEnvironmentConfig().getApplicationFolders()){
                 File f = new File(d, path);
                 if(f.exists()) {
                     logger.trace("Serving asset file \""+path+"\" from app folder : " + f.getAbsolutePath());

                     String contentType = request.getServletContext().getMimeType(f.getName());
                     if (contentType == null)  contentType = MediaType.OCTET_STREAM.toString();
                     response.setContentType(contentType);
                     
                     ((HttpServletResponse) response).setHeader(HttpHeaders.CONTENT_LENGTH, String.valueOf(f.length()));
                     
                     boolean download = Boolean.parseBoolean(httpRequest.getParameter("attachment"));
                     if(download){
                         ((HttpServletResponse) response).setHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + f.getName() + "\"");
                     }
                    // if not explicitly requesting a forced download, we do not
                    // add a content-disposition at all but let the browser
                    // decide i.e. using the contentType
                     
                     try(BufferedOutputStream output = new BufferedOutputStream(response.getOutputStream())){
                         try(BufferedInputStream input = new BufferedInputStream(new FileInputStream(f))) {
                             IOUtils.copy(input, output);
                             output.flush();
                             return;
                         } 
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