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

package com.metaphacts.rest.endpoint;

import java.io.IOException;
import java.util.ArrayList;

import javax.inject.Inject;
import javax.inject.Singleton;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;

import com.google.common.collect.Lists;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.shiro.SecurityUtils;
import org.apache.shiro.authz.annotation.RequiresPermissions;

import com.metaphacts.api.dto.querytemplate.SelectQueryTemplate;
import com.metaphacts.config.Configuration;
import com.metaphacts.querycatalog.QueryCatalogRESTServiceRegistry;
import com.metaphacts.rest.feature.CacheControl.NoCache;
import com.metaphacts.ui.templates.MainTemplate;
import com.metaphacts.security.Permissions.QAAS;
import com.metaphacts.security.ShiroGuiceModule.ShiroFilter;


/**
 * @author Johannes Trame <jt@metaphacts.com>
 */
@Singleton
@Path("")
@NoCache
public class TableauEndpoint {
    private static final String TABLEAU_TEMPLATE_NAME = "tableau";

    @Inject
    private MainTemplate mainTemplate;

    @Inject
    private Configuration config;
    
    @Inject
    protected QueryCatalogRESTServiceRegistry queryCatalogRESTServiceRegistry;
    
    private static final Logger logger = LogManager
            .getLogger(TableauEndpoint.class);
    
    @GET()
    public Response invalidateCache() throws IOException {
        return Response.ok().entity(
            mainTemplate.renderMainPageLayout(TABLEAU_TEMPLATE_NAME)
        ).build();
    }
    
    @GET()
    @NoCache
    @Path("isAnonymousEnabled")
    public Boolean isAuthenticated() {
        return config.getEnvironmentConfig().getShiroAuthenticationFilter().contains(ShiroFilter.anon.name());
    }
    
    @GET()
    @Path("qaas")
    @Produces(MediaType.APPLICATION_JSON)
    @RequiresPermissions(QAAS.INFO)
    public ArrayList<String> getQaasServives() {
        //TODO this is probably not really efficient and needed to call every time
        return Lists.newArrayList(queryCatalogRESTServiceRegistry.getServices().stream()
                // filter only select templates and where current user is permitted to execute the service
                .filter(s -> {
                    try {
                        return  SelectQueryTemplate.class.isAssignableFrom(s.getQueryTemplate().getClass())
                                && 
                                SecurityUtils.getSubject().isPermitted(s.getAclPermission())
                                && !s.isDisabled();
                    } catch (Exception e) {
                        logger.error("Failed to get query template for REST Service \"{}\".", s.getId());
                        logger.trace("Details: {}", e);
                        
                        return false;
                    }
                })
                .<String>map(s -> s.getId()).toArray(String[]::new)
                );
    }


}
