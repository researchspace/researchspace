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

import org.apache.commons.io.IOUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.shiro.SecurityUtils;
import org.apache.shiro.authz.annotation.RequiresAuthentication;
import org.eclipse.rdf4j.model.*;
import org.glassfish.jersey.media.multipart.FormDataContentDisposition;
import org.glassfish.jersey.media.multipart.FormDataParam;
import org.researchspace.repository.MpRepositoryProvider;
import org.researchspace.repository.RepositoryManager;
import org.researchspace.security.WildcardPermission;
import org.researchspace.security.Permissions.*;
import org.researchspace.services.files.FileManager;
import org.researchspace.services.files.ManagedFileName;
import org.researchspace.services.storage.api.*;
import org.researchspace.services.storage.utils.ExactSizeInputStream;

import java.io.FileNotFoundException;
import javax.inject.Inject;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.StreamingOutput;
import java.io.InputStream;

@Path("")
public class FileStorageEndpoint {
    private static final Logger logger = LogManager.getLogger(FileStorageEndpoint.class);

    private final PlatformStorage platformStorage;
    private final RepositoryManager repositoryManager;
    private final FileManager fileManager;

    @Inject
    public FileStorageEndpoint(PlatformStorage platformStorage, RepositoryManager repositoryManager,
            FileManager fileManager) {
        this.platformStorage = platformStorage;
        this.repositoryManager = repositoryManager;
        this.fileManager = fileManager;
    }

    @POST
    @Path("/direct")
    @RequiresAuthentication
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    public Response postAdminFile(@FormDataParam("storage") String storageId, @FormDataParam("folder") String folder,
            @FormDataParam("fileName") String customFileName,
            @FormDataParam("file") FormDataContentDisposition fileDisposition, @FormDataParam("file") InputStream in,
            @FormDataParam("fileSize") long fileSize) {
        if (logger.isTraceEnabled()) {
            logger.trace("Request to store a file to a storage");
        }

        assertPermission(STORAGE.PREFIX_WRITE + storageId);

        try {
            StoragePath prefix = fileManager.parseTargetDirectory(folder);
            ManagedFileName managedName;
            if (customFileName.isEmpty()) {
                managedName = ManagedFileName.generateFromFileName(prefix, fileDisposition.getFileName(),
                        fileManager::generateSequenceNumber);
            } else {
                managedName = ManagedFileName.validate(prefix, customFileName);
            }

            ObjectStorage storage = platformStorage.getStorage(storageId);
            fileManager.storeFile(storage, managedName, platformStorage.getDefaultMetadata(),
                    new SizedStream(new ExactSizeInputStream(in, fileSize), fileSize));

            return Response.ok().entity(managedName.toObjectId().toString()).build();
        } catch (Exception e) {
            logger.error(e.getMessage());
            logger.debug("Details:", e);
            return Response.serverError().entity(e.getMessage()).build();
        }
    }

    @GET
    @RequiresAuthentication
    public Response getFile(@QueryParam("fileName") String fileName, @QueryParam("storage") String storageId, 
                                    @QueryParam("mode") String mode, @QueryParam("mediaType") String mediaType ) {
        if (logger.isTraceEnabled()) {
            logger.trace("Request to get a file from a storage");
        }

        assertPermission(FILE.PREFIX_READ + storageId);

        try {
            ObjectStorage storage = platformStorage.getStorage(storageId);
            ManagedFileName managedName = ManagedFileName.validate(ObjectKind.FILE, fileName);

            ObjectRecord record = fileManager.fetchFile(storage, managedName).orElseThrow(
                    () -> new WebApplicationException("File not found: " + fileName, Response.Status.NOT_FOUND));

            StreamingOutput fileStream = readObjectContent(record);

            // Set mode=open when the file will be opened in a new browser tab requires the mediaType to be specified in 
            // the client side component e.g. <rs-file-download mode='open' media-type='image/jpeg'>
            if ("open".equals(mode) && mediaType != null) {
                return Response.ok(fileStream, mediaType)
                        .header("content-disposition", "inline; filename = " + fileName).build();
            } else {
                // Download file as the default option
                return Response.ok(fileStream, MediaType.APPLICATION_OCTET_STREAM)
                        .header("content-disposition", "attachment; filename = " + fileName).build();
            }
        } catch (Exception e) {
            String exceptionMessage = "Error fetching file '" + fileName + "': " + e.getMessage();
            logger.error(exceptionMessage);
            logger.debug("Details:", e);
            return Response.serverError().entity(exceptionMessage).build();
        }
    }

    @POST
    @RequiresAuthentication
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    public Response uploadFileAsResource(@FormDataParam("storage") String storageId,
            @FormDataParam("repository") String repositoryId,
            @FormDataParam("generateIriQuery") String generateIriQuery,
            @FormDataParam("createResourceQuery") String createResourceQuery,
            @FormDataParam("contextUri") String contextUri,
            @FormDataParam("fileNameHack") String fileNameHack,
            @FormDataParam("file") FormDataContentDisposition fileDisposition, @FormDataParam("file") InputStream in,
            @FormDataParam("fileSize") long fileSize) {
        if (logger.isTraceEnabled()) {
            logger.trace("Request to store a file as LDP resource to the storage");
        }

        assertPermission(FILE.PREFIX_WRITE + storageId);

        try {
            // TODO, currently we allow to disable sequenceNumber generation with fileNameHack param
            ManagedFileName managedName;
            if (fileNameHack.equals("true")) {
                managedName = ManagedFileName.generateFromFileName(ObjectKind.FILE,
                        fileDisposition.getFileName(), null);
            } else {
                managedName = ManagedFileName.generateFromFileName(ObjectKind.FILE,
                        fileDisposition.getFileName(), fileManager::generateSequenceNumber);
            }
            String mediaType = fileDisposition.getType();

            ObjectStorage storage = platformStorage.getStorage(storageId);
            fileManager.storeFile(storage, managedName, platformStorage.getDefaultMetadata(),
                    new SizedStream(new ExactSizeInputStream(in, fileSize), fileSize));

            IRI resourceIri;
            try {
                resourceIri = fileManager.createLdpResource(managedName,
                        new MpRepositoryProvider(repositoryManager, repositoryId), generateIriQuery,
                        createResourceQuery, contextUri, mediaType);
            } catch (Exception e) {
                // try to clean up uploaded file if LDP update failed
                fileManager.deleteFile(storage, managedName, platformStorage.getDefaultMetadata());
                throw e;
            }

            return Response.created(new java.net.URI(resourceIri.toString())).build();
        } catch (Exception e) {
            logger.error(e.getMessage());
            logger.debug("Details:", e);
            return Response.serverError().entity(e.getMessage()).build();
        }
    }

    @DELETE
    @RequiresAuthentication
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    public Response deleteFile(@FormDataParam("storage") String storageId,
            @FormDataParam("repository") String repositoryId, @FormDataParam("resourceIri") IRI resourceIri,
            @FormDataParam("fileName") String fileName) {
        if (logger.isTraceEnabled()) {
            logger.trace("Request to delete an LDP file resource from a storage");
        }

        assertPermission(FILE.PREFIX_WRITE + storageId);

        try {
            ObjectStorage storage = platformStorage.getStorage(storageId);
            ManagedFileName managedName = ManagedFileName.validate(ObjectKind.FILE, fileName);
            MpRepositoryProvider repositoryProvider = new MpRepositoryProvider(repositoryManager, repositoryId);

            fileManager.deleteLdpResource(resourceIri, repositoryProvider);
            fileManager.deleteFile(storage, managedName, platformStorage.getDefaultMetadata());

            return Response.ok().build();
        } catch (Exception e) {
            logger.error("Failed to remove resource " + storageId + ": " + e.getMessage());
            logger.debug("Details:", e);
            return Response.serverError().entity(e.getMessage()).build();
        }
    }

    @POST
    @Path("/temporary")
    @RequiresAuthentication
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    public Response saveToTemporaryStorage(@FormDataParam("storage") String storageId,
            @FormDataParam("file") FormDataContentDisposition fileDisposition, @FormDataParam("file") InputStream in,
            @FormDataParam("fileSize") long fileSize) {
        if (logger.isTraceEnabled()) {
            logger.trace("Request to store a file to a storage");
        }

        assertPermission(FILE.PREFIX_WRITE + storageId);

        try {
            ManagedFileName managedName = ManagedFileName.generateFromFileName(ObjectKind.FILE,
                    fileDisposition.getFileName(), fileManager::generateSequenceNumber);

            fileManager.storeFile(platformStorage.getStorage(storageId), managedName,
                    platformStorage.getDefaultMetadata(),
                    new SizedStream(new ExactSizeInputStream(in, fileSize), fileSize));

            return Response.ok().entity(managedName.getName()).build();
        } catch (Exception e) {
            logger.error(e.getMessage());
            logger.debug("Details:", e);
            return Response.serverError().entity(e.getMessage()).build();
        }
    }

    @POST
    @Path("/move")
    @RequiresAuthentication
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    public Response createResourceFromTemporaryFile(@FormDataParam("storage") String storageId,
            @FormDataParam("temporaryStorage") String temporaryStorageId,
            @FormDataParam("repository") String repositoryId, @FormDataParam("fileName") String fileName,
            @FormDataParam("generateIriQuery") String generateIriQuery,
            @FormDataParam("createResourceQuery") String createResourceQuery,
            @FormDataParam("contextUri") String contextUri, @FormDataParam("mediaType") String mediaType) {
        if (logger.isTraceEnabled()) {
            logger.trace("Request to save an LDP file resource from a temporary storage to a storage");
        }

        assertPermission(FILE.PREFIX_READ + temporaryStorageId);
        assertPermission(FILE.PREFIX_WRITE + temporaryStorageId);
        assertPermission(FILE.PREFIX_WRITE + storageId);

        try {
            ObjectStorage fromStorage = platformStorage.getStorage(temporaryStorageId);
            ObjectStorage toStorage = platformStorage.getStorage(storageId);
            ManagedFileName managedName = ManagedFileName.validate(ObjectKind.FILE, fileName);

            try {
                fileManager.moveFile(fromStorage, toStorage, managedName);
            } catch (FileNotFoundException e) {
                throw new WebApplicationException("File not found: " + managedName.getName(),
                        Response.Status.NOT_FOUND);
            }

            IRI resourceIri;
            try {
                resourceIri = fileManager.createLdpResource(managedName,
                        new MpRepositoryProvider(repositoryManager, repositoryId), generateIriQuery,
                        createResourceQuery, contextUri, mediaType);
            } catch (Exception e) {
                // try to clean up uploaded file if LDP update failed
                fileManager.deleteFile(toStorage, managedName, platformStorage.getDefaultMetadata());
                throw e;
            }

            return Response.created(new java.net.URI(resourceIri.toString())).build();
        } catch (Exception e) {
            logger.error(e.getMessage());
            logger.debug("Details:", e);
            return Response.serverError().entity(e.getMessage()).build();
        }
    }

    @DELETE
    @Path("/temporary")
    @RequiresAuthentication
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    public Response removeTemporaryFile(@FormDataParam("fileName") String fileName,
            @FormDataParam("storage") String storageId) {
        if (logger.isTraceEnabled()) {
            logger.trace("Request to delete an LDP file resource from a storage");
        }

        assertPermission(FILE.PREFIX_WRITE + storageId);

        try {
            ObjectStorage storage = platformStorage.getStorage(storageId);
            ManagedFileName managedName = ManagedFileName.validate(ObjectKind.FILE, fileName);

            fileManager.deleteFile(storage, managedName, platformStorage.getDefaultMetadata());
            return Response.ok().build();
        } catch (Exception e) {
            logger.error("Failed to remove from temporary storage (" + storageId + "): " + e.getMessage());
            logger.debug("Details:", e);
            return Response.serverError().entity(e.getMessage()).build();
        }
    }

    private void assertPermission(String permission) {
        if (!SecurityUtils.getSubject().isPermitted(new WildcardPermission(permission))) {
            ForbiddenException e = new ForbiddenException("Permission denied");
            logger.error("Denied permission \"" + permission + "\":", e);
            throw new WebApplicationException(e.getMessage(), Response.Status.FORBIDDEN);
        }
    }

    private StreamingOutput readObjectContent(ObjectRecord record) {
        return output -> {
            try (InputStream content = record.getLocation().readContent()) {
                IOUtils.copy(content, output);
            }
            output.flush();
        };
    }
}
