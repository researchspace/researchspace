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

import java.io.File;
import java.io.FileOutputStream;
import java.nio.file.Files;
import java.nio.file.attribute.FileTime;

import javax.inject.Singleton;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.Status;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.shiro.authz.annotation.RequiresAuthentication;
import org.apache.shiro.authz.annotation.RequiresPermissions;

import com.metaphacts.rest.feature.CacheControl.NoCache;
import com.metaphacts.security.Permissions.SYSTEM;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
@Singleton
@Path("admin/system")
public class SystemAdminEndpoint {
    private static final Logger logger = LogManager.getLogger(SystemAdminEndpoint.class);

    @POST()
    @Path("restart")
    @NoCache
    @RequiresAuthentication
    @RequiresPermissions(SYSTEM.RESTART)
    public Response restartSystem() {
        // restart is performed by looking for a file ${jetty.base}/webapps/ROOT.xml
        // and 'touch'ing it (i.e. update write timestamp) to make Jetty reload the webapp 
        File contextXml = null;
        File jettyBase = null;
        String jettyBasePath = System.getProperty("jetty.base", "/var/lib/jetty");
        if (jettyBasePath != null) {
            jettyBase = new File(jettyBasePath);
        }
        if (jettyBase != null && jettyBase.isDirectory()) {
            contextXml = new File(jettyBase, "webapps/ROOT.xml");
        }
        if (contextXml != null && contextXml.isFile()) {
            logger.info("Asking Jetty to restart webapp");
            if (touch(contextXml)) {
                return Response.ok().build();
            } else {
                return Response.status(Status.INTERNAL_SERVER_ERROR).build();
            }
        }
        logger.error("failed to reload app: ${jetty.base}/webapps/ROOT.xml does not exist");
        return Response.status(Status.INTERNAL_SERVER_ERROR).build();
    }

    private boolean touch(File contextXml) {
        try {
            Files.setLastModifiedTime(contextXml.toPath(), FileTime.fromMillis(System.currentTimeMillis()));
            logger.info("Successfully touched {}", contextXml);
            return true;
        }
        catch (Exception e) {
            // setting last modified time seems to require file ownership, if that fails we try to 
            // open the file for writing (in append mode) without actually writing anything
            logger.error("failed to reload app by touching {}: {}", contextXml, e.getMessage());
            logger.error("ROOT.xml: {}, readable: {}, writable: {}", contextXml.getPath(), contextXml.canRead(), contextXml.canWrite());
            logger.error("trying write-append");
            try (FileOutputStream fos = new FileOutputStream(contextXml, true)) {
                byte[] empty = new byte[0];
                fos.write(empty);
                return true;
            }
            catch (Exception e2) {
                // TODO consider calling "touch" via local shell execution as fallback when the 
                // current user is not the owner of the file
                logger.error("failed to reload app by touching {}: {}", contextXml, e2.getMessage());
                return false;
            }
        }
    }

}
