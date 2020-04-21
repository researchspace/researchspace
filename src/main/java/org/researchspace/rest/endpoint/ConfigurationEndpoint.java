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

package org.researchspace.rest.endpoint;

import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;

import javax.inject.Inject;
import javax.inject.Singleton;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.Status;

import org.apache.commons.configuration2.ex.ConfigurationException;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.shiro.SecurityUtils;
import org.apache.shiro.authz.UnauthorizedException;
import org.apache.shiro.authz.annotation.RequiresAuthentication;
import org.researchspace.cache.CacheManager;
import org.researchspace.config.ConfigParameterValueInfo;
import org.researchspace.config.Configuration;
import org.researchspace.config.UnknownConfigurationException;
import org.researchspace.rest.feature.CacheControl.NoCache;
import org.researchspace.security.Permissions.APIUsageMode;
import org.researchspace.security.Permissions.CONFIGURATION;
import org.researchspace.services.storage.api.ObjectKind;
import org.researchspace.services.storage.api.PlatformStorage;

import com.google.common.collect.Maps;

/**
 * Endpoint exposing the configuration via a REST-style protocol. Supports both
 * read and write access to the configuration, backed by SHIRO permission
 * management.
 * 
 * @author Michael Schmidt <ms@metaphacts.com>
 */
@Path("config")
@Singleton
public class ConfigurationEndpoint {

    private static final Logger logger = LogManager.getLogger(ConfigurationEndpoint.class);

    @Inject
    private PlatformStorage platformStorage;

    /**
     * The backing system configuration class, which is exposed via this endpoint.
     */
    @Inject
    private Configuration systemConfig;

    @Inject
    private CacheManager cacheManager;

    /**
     * Lists all configuration groups (sorted lexicographically).
     * 
     * @return all configuration groups, independently from whether the user has
     *         access rights to (any of) their items
     */
    @GET()
    @NoCache
    @RequiresAuthentication
    @Produces(MediaType.APPLICATION_JSON)
    public Response listConfigurationGroups() {

        return Response.ok().entity(systemConfig.listGroups()).build();

    }

    /**
     * Lists all configuration values in the configuration group for which the user
     * currently has access (sorted lexicographically).
     * 
     * @param configGroup the config group for which the lookup is performed
     * @return the string identifiers of the configuration values
     */
    @GET()
    @NoCache
    @Path("{configGroup}")
    @RequiresAuthentication
    @Produces(MediaType.APPLICATION_JSON)
    public Response listConfigurationParamsInGroup(@PathParam("configGroup") String configGroup) {

        try {
            Map<String, ConfigParameterValueInfo> unfilteredMap = systemConfig.listParamsInGroups(configGroup);
            Map<String, ConfigParameterValueInfo> filteredMap = Maps.newHashMap();
            for (Entry<String, ConfigParameterValueInfo> entry : unfilteredMap.entrySet()) {
                final String configIdInGroup = entry.getKey();
                // check user has permission
                String requiredReadPermission = CONFIGURATION.getPermissionString(configGroup, configIdInGroup,
                        APIUsageMode.read);

                if (SecurityUtils.getSubject().isPermitted(requiredReadPermission)) {
                    filteredMap.put(entry.getKey(), entry.getValue());
                }
            }

            return Response.ok().entity(filteredMap).build();

        } catch (UnknownConfigurationException e) {

            logger.trace("Lookup for unknown configuration group: " + configGroup);
            return Response.status(Response.Status.NOT_FOUND).build();

        }
    }

    /**
     * Read the current configuration value identified by the parameter pair.
     * 
     * @param configGroup
     * @param configIdInGroup
     * @return the value; returns NOT_FOUND if the config value does not exist and
     *         FORBIDDEN if the config value exists but has no value
     */
    @GET()
    @NoCache
    @Path("{configGroup}/{configIdInGroup}")
    @RequiresAuthentication
    @Produces(MediaType.APPLICATION_JSON)
    public Response getConfigurationValue(@PathParam("configGroup") String configGroup,
            @PathParam("configIdInGroup") String configIdInGroup) {

        try {
            // assert user permissions sufficient
            String requiredReadPermission = CONFIGURATION.getPermissionString(configGroup, configIdInGroup,
                    APIUsageMode.read);

            if (!SecurityUtils.getSubject().isPermitted(requiredReadPermission)) {
                throw new UnauthorizedException(); // no read permissions
            }

            return Response.ok().entity(systemConfig.lookupProperty(configGroup, configIdInGroup)).build();

        } catch (UnknownConfigurationException e) {

            logger.trace("Lookup for unknown configuration item: " + configGroup + " / " + configIdInGroup);
            return Response.status(Response.Status.NOT_FOUND).build();

        } catch (UnauthorizedException e) {

            logger.trace("User has no access to configuration item (please enable in shiro.ini if you "
                    + "believe this should be accessible): " + configGroup + " / " + configIdInGroup);
            return Response.status(Response.Status.FORBIDDEN).build();

        }
    }

    @PUT
    @Path("{configGroup}/{configIdInGroup}")
    @Consumes(MediaType.APPLICATION_JSON)
    @RequiresAuthentication
    public Response setConfigurationValue(@PathParam("configGroup") String configGroup,
            @PathParam("configIdInGroup") String configIdInGroup, @QueryParam("targetAppId") String targetAppId,
            List<String> configValues) {
        try {
            // prevent writing if user does not have permissions
            String requiredWritePermission = CONFIGURATION.getPermissionString(configGroup, configIdInGroup,
                    APIUsageMode.write);

            if (!SecurityUtils.getSubject().isPermitted(requiredWritePermission)) {
                throw new UnauthorizedException(); // no write permissions
            }

            systemConfig.setProperty(configGroup, configIdInGroup, configValues, targetAppId);

            // TODO temporary workaround for invalidating caches after updates
            // should go into proper event system within configuration management
            cacheManager.invalidateAll();

            return Response.ok().build();
        } catch (UnauthorizedException e) {
            logger.trace("User has no access to set configuration item (please enable in shiro.ini if you "
                    + "believe this should be accessible): " + configGroup + " / " + configIdInGroup);
            return Response.status(Response.Status.FORBIDDEN).entity(e.getMessage()).build();
        } catch (UnknownConfigurationException e) {
            return Response.status(Status.INTERNAL_SERVER_ERROR).entity(e.getMessage()).type("text/plain").build();
        } catch (Exception e) {
            if (e.getCause() instanceof ConfigurationException) {
                return Response.status(Response.Status.NOT_ACCEPTABLE).entity(e.getCause().getMessage()).build();
            }
            return Response.status(Response.Status.NOT_ACCEPTABLE).entity(e.getMessage()).build();
        }
    }

    @DELETE
    @Path("{configGroup}/{configIdInGroup}")
    @RequiresAuthentication
    public Response deleteConfigurationValue(@PathParam("configGroup") String configGroup,
            @PathParam("configIdInGroup") String configIdInGroup, @QueryParam("targetAppId") String targetAppId)
            throws ConfigurationException {
        try {
            // prevent writing if user does not have permissions
            String requiredWritePermission = CONFIGURATION.getPermissionString(configGroup, configIdInGroup,
                    APIUsageMode.write);

            if (!SecurityUtils.getSubject().isPermitted(requiredWritePermission)) {
                throw new UnauthorizedException(); // no write permissions
            }

            systemConfig.setProperty(configGroup, configIdInGroup, Collections.emptyList(), targetAppId);

            // TODO temporary workaround for invalidating caches after updates
            // should go into proper event system within configuration management
            cacheManager.invalidateAll();

            return Response.ok().build();
        } catch (UnauthorizedException e) {
            logger.trace("User has no access to set configuration item (please enable in shiro.ini if you "
                    + "believe this should be accessible): " + configGroup + " / " + configIdInGroup);
            return Response.status(Response.Status.FORBIDDEN).entity(e.getMessage()).build();
        } catch (UnknownConfigurationException e) {
            return Response.status(Status.INTERNAL_SERVER_ERROR).entity(e.getMessage()).type("text/plain").build();
        }
    }

    @GET
    @Path("storageStatus")
    @Produces(MediaType.APPLICATION_JSON)
    @RequiresAuthentication
    public Response getStorageStatus() throws IOException {
        List<PlatformStorage.StorageStatus> writableApps = platformStorage.getStorageStatusFor(ObjectKind.TEMPLATE);
        return Response.ok(writableApps).build();
    }
}
