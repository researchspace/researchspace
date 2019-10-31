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

import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import javax.inject.Inject;
import javax.inject.Singleton;
import javax.ws.rs.ForbiddenException;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.ResponseBuilder;
import javax.ws.rs.core.Response.Status;
import javax.ws.rs.core.StreamingOutput;

import org.apache.commons.io.FilenameUtils;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.shiro.SecurityUtils;
import org.apache.shiro.authz.annotation.RequiresAuthentication;
import org.apache.shiro.authz.annotation.RequiresPermissions;
import org.apache.shiro.authz.permission.WildcardPermission;
import org.glassfish.jersey.media.multipart.FormDataContentDisposition;
import org.glassfish.jersey.media.multipart.FormDataParam;

import com.google.common.collect.Lists;
import com.metaphacts.config.Configuration;
import com.metaphacts.plugin.PlatformPluginManager;
import com.metaphacts.rest.feature.CacheControl.NoCache;
import com.metaphacts.security.Permissions.APP;
import com.metaphacts.security.Permissions.STORAGE;
import com.metaphacts.services.storage.api.ObjectRecord;
import com.metaphacts.services.storage.api.ObjectStorage;
import com.metaphacts.services.storage.api.PlatformStorage;
import com.metaphacts.services.storage.api.StorageException;
import com.metaphacts.services.storage.api.StoragePath;

import ro.fortsoft.pf4j.PluginWrapper;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
@Singleton
@Path("admin")
public class AppAdminEndpoint {

    private static final Logger logger = LogManager.getLogger(AppAdminEndpoint.class);

    @Inject
    private PlatformPluginManager pluginManager;
    
    @Inject
    private PlatformStorage storageManager;

    private class MetaObject {
        public MetaObject(String id, String storageKind, Boolean mutableStorage) {
            this.id = id;
            this.storageKind = storageKind;
            this.mutableStorage = mutableStorage;
        }

        @SuppressWarnings("unused")
        public String id;
        @SuppressWarnings("unused")
        public String storageKind;
        @SuppressWarnings("unused")
        public Boolean mutableStorage;
    }

    /**
     * List apps and respective meta-data,
     * considering the {@link STORAGE#PREFIX_ZIP_EXPORT}
     * permission, i.e. storages to which the user does not have access,
     * will be filtered.
     * 
     * @return JSON array with storage meta-data objects 
     */
    @GET()
    @Path("apps")
    @NoCache
    @RequiresAuthentication
    @Produces(MediaType.APPLICATION_JSON)
    public Response listApps() {
        ArrayList<MetaObject> l = new ArrayList<MetaObject>();
        for (PluginWrapper p : pluginManager.getPlugins()) {
            String appId = p.getPluginId();
            if (checkPermission(APP.PREFIX_CONFIG_VIEW + appId)) {
                l.add(getStorageMetaOject(appId));
            }
        }
        for(String pId : Lists.<String>newArrayList("runtime")){
            l.add(getStorageMetaOject(pId));
        }
        return Response.ok().entity(l).build();
    }
    
    @POST()
    @Path("apps/upload-and-install")
    @NoCache
    @RequiresAuthentication
    @RequiresPermissions(APP.UPLOAD)
    public Response uploadApp(@FormDataParam("file") InputStream fileInputStream,
            @FormDataParam("file") FormDataContentDisposition fileMetaData) {
        final String fileName = fileMetaData.getFileName();
        if (!StringUtils.endsWith(fileName, ".zip")) {
            return Response.serverError().entity("App artefact must be a zip file.").build();
        }
        File targetFile = new File(new File(Configuration.getAppsDirectory()), fileMetaData.getFileName());
        if (targetFile.exists()) {
            return Response.status(Status.INTERNAL_SERVER_ERROR).entity(
                    "\""+targetFile+"\" already exists. This either indicates that a previous installation was not completed successfully "+
                    "and/or that there are some issues with the file system permissions (for example, in case the zip has been mounted into the platform)")
                    .build();
        }
        try (OutputStream out = new FileOutputStream(targetFile)) {

            IOUtils.copyLarge(fileInputStream,out);
            out.flush();
        } catch (IOException e) {
            throw new WebApplicationException(
                    "Error while uploading the app: " + e.getMessage());
        }
        String pluginName= FilenameUtils.getBaseName(fileName);

        /**
         * catch any errors while (trying) to load the app
         */
        try{
            
            // TODO not easy to unload apps (dependency order or storages etc)
            // // try to load plugin
            //
            //  logger.info("Trying to unload {} if exist.",pluginName);
            //  if(pluginManager.unloadPlugin(pluginName)) {
            //      logger.info("Unloaded plugin");
            //  }
            if (pluginManager.getPlugin(pluginName) == null) {
                String pluginId = pluginManager.loadPlugin(targetFile.toPath());
                if (StringUtils.isBlank(pluginId)) {
                    return Response.ok(
                            "Uploaded the app artefact \""+fileName+"\" successfully. However, the unpackaging/installation was not successful. Please refer to the platform logs for details.")
                            .build();
                } else {
                    return Response.ok("Uploaded and unpackaged the app artefact \""+fileName+"\" with the id \"" + pluginName
                            + "\" successfully. However, you will need to restart the platform to make sure that the app is installed correctly.")
                            .build();
                }
            }
            return Response.ok(
                    "Uploaded app successfully. However, the app already exists and can not be updated during runtime. "
                            + "Please restart the platform to re-install the app properly.")
                    .build(); 
        }catch(Exception e) {
            return Response.serverError().entity("Error while installing/unpackaging the app artefact. Please refer to the platform logs for details.").build();
        }

    }
    
    private MetaObject getStorageMetaOject(String id){
        ObjectStorage s = storageManager.getStorage(id);
        return new MetaObject(id, s.getClass().getCanonicalName(), s.isMutable() );
    }
    
    /**
     * List storages and respective meta-data,
     * considering the {@link STORAGE#PREFIX_ZIP_EXPORT}
     * permission, i.e. storages to which the user does not have access,
     * will be filtered.
     * 
     * @return JSON array with storage meta-data objects 
     */
    @GET()
    @Path("storages")
    @NoCache
    @RequiresAuthentication
    @Produces(MediaType.APPLICATION_JSON)
    public Response listStorages() {
        ArrayList<MetaObject> list = Lists.newArrayList();
        for (String storageId : storageManager.getOverrideOrder()) {
            if (checkPermission(STORAGE.PREFIX_VIEW_CONFIG + storageId)) {
                list.add(getStorageMetaOject(storageId));
            }
        }
        return Response.ok().entity(list).build();
    }
    
    @GET()
    @Path("/storages/{storageId}/zip")
    @NoCache
    @RequiresAuthentication
    public Response downloadAppStorage(@PathParam("storageId") String storageId) throws StorageException {
        if (!checkPermission(STORAGE.PREFIX_ZIP_EXPORT + storageId)) {
            throw new ForbiddenException();
        }
        String fileName = new SimpleDateFormat("yyyy_MM_dd-HH_mm").format(new Date())+"-app_"+storageId+"_export.zip";

        logger.info("Exporting storage {} as zip.", storageId);
        StreamingOutput stream = new StreamingOutput() {
            @Override
            public void write(OutputStream output) throws IOException {


                try (ZipOutputStream zip = new ZipOutputStream(new BufferedOutputStream(output))){
                    ObjectStorage storage = storageManager.getStorage(storageId);
                    List<ObjectRecord> objects = Lists.newArrayList();
                    objects.addAll(storage.getAllObjects(StoragePath.EMPTY));
                    for (ObjectRecord storageObject : objects) {
                        // Get InputStream from storage
                        try (InputStream in = storageObject.getLocation().readContent()) {
                            // Add Zip Entry
                            Optional<StoragePath> path = storageManager.getPathMapping()
                                .mapForward(storageObject.getPath());
                            zip.putNextEntry(new ZipEntry(storageId + "/" + path.get().toString()));
                            // Write file into zip
                            IOUtils.copy(in, zip);
                            zip.closeEntry();
                        }
                    }
                } catch (Exception e) {
                    throw new RuntimeException(e);
                } finally {
                    // flush and close
                    output.flush();
                    output.close();
                }
            }
        };

        // Set response headers and return 
        ResponseBuilder response = Response.ok(stream);
        response.header("Content-Disposition", "attachment; filename=\""+ fileName +"\"");
        return response.build();

    }
    
    /**
     * Return true if the currently logged-in user has the respective permission.
     * @param permission
     * @return true if the current user has the permission
     */
    private boolean checkPermission(String permission) {
        return SecurityUtils.getSubject().isPermitted(new WildcardPermission(permission));
    }


}
