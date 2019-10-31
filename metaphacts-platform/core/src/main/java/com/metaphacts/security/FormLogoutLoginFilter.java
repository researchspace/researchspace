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

package com.metaphacts.security;

import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;

import org.apache.commons.lang.StringUtils;
import org.apache.http.client.methods.HttpGet;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.shiro.SecurityUtils;
import org.apache.shiro.session.Session;
import org.apache.shiro.session.SessionException;
import org.apache.shiro.subject.Subject;
import org.apache.shiro.web.servlet.AdviceFilter;
import org.apache.shiro.web.util.SavedRequest;
import org.apache.shiro.web.util.WebUtils;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 */
public class FormLogoutLoginFilter extends AdviceFilter{
    
    private static final Logger logger = LogManager.getLogger(FormLogoutLoginFilter.class);
   
    @Override
    protected boolean preHandle(ServletRequest request, ServletResponse response)
            throws Exception {
        


        Subject subject = SecurityUtils.getSubject();
        if(subject.getPrincipal()!=null){
            //try/catch added for SHIRO-298:
            try {
                subject.logout();
            } catch (SessionException ise) {
                logger.debug("Encountered session exception during logout.  This can generally safely be ignored.", ise);
            }
        }
        
        if (request instanceof HttpServletRequest ) {
            HttpServletRequest httpRequest = (HttpServletRequest) request;
            String referer = httpRequest.getHeader("Referer");
            if(StringUtils.isNotBlank(referer) && !referer.contains(ShiroGuiceModule.LOGIN_PATH))
           
            saveRequest(httpRequest, referer);
        }
        return true;

//        return super.executeLogin(request, response);
    }
    
    private void saveRequest(HttpServletRequest request, String referer) {
        java.net.URI refererUri = java.net.URI.create(referer);
        String refererHost = refererUri.getHost();
        String redirectPath = refererHost.equals(request.getServerName()) ? refererUri.getPath() : "/";
        Subject subject = SecurityUtils.getSubject();
        Session session = subject.getSession();
        SavedRequest savedRequest = new FakedSavedRequest(request,redirectPath);
        session.setAttribute(WebUtils.SAVED_REQUEST_KEY, savedRequest);
    }
    
    
    private static class FakedSavedRequest extends SavedRequest{

        private static final long serialVersionUID = 711449012558157479L;
        
        private String referer;
        public FakedSavedRequest(HttpServletRequest request, String referer) {
           super(request);
           this.referer = referer;
        }
        
        @Override
        public String getMethod() {
            return HttpGet.METHOD_NAME;
        }
        
        @Override
        public String getRequestURI() {
                return referer;
        }
        
        @Override
        public String getQueryString() {
                return null;
        }
        
    }
    
}