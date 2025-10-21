package org.researchspace.rest.endpoint;

import org.apache.commons.io.FilenameUtils;
import org.apache.commons.io.IOUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.glassfish.jersey.media.multipart.FormDataContentDisposition;
import org.glassfish.jersey.media.multipart.FormDataParam;
import org.researchspace.services.files.FileManager;
import org.researchspace.services.files.ManagedFileName;
import org.researchspace.services.storage.api.*;

import javax.imageio.ImageIO;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
import javax.inject.Inject;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.StreamingOutput;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;

@Path("/image-upload")
public class ImageUploadEndpoint {

    private static final Logger logger = LogManager.getLogger(ImageUploadEndpoint.class);

    private final PlatformStorage platformStorage;
    private final FileManager fileManager;

    @Inject
    public ImageUploadEndpoint(PlatformStorage platformStorage, FileManager fileManager) {
        this.platformStorage = platformStorage;
        this.fileManager = fileManager;
    }

    @POST
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.APPLICATION_JSON)
    public Response uploadImage(@FormDataParam("file") InputStream fileInputStream,
                                @FormDataParam("file") FormDataContentDisposition fileDisposition,
                                @FormDataParam("storageId") String storageId) {
        try {
            byte[] fileBytes = IOUtils.toByteArray(fileInputStream);

            String extension = FilenameUtils.getExtension(fileDisposition.getFileName());
            String newFileNameStr = fileManager.generateSequenceNumber() + "." + extension;
            ManagedFileName originalFileName = ManagedFileName.generateFromFileName(ObjectKind.FILE,
                newFileNameStr, null);
            ObjectStorage storage = platformStorage.getStorage(storageId);

            SizedStream sizedStream = new SizedStream(new ByteArrayInputStream(fileBytes), fileBytes.length);
            fileManager.storeFile(storage, originalFileName, platformStorage.getDefaultMetadata(), sizedStream);

            BufferedImage originalImage = ImageIO.read(new ByteArrayInputStream(fileBytes));
            if (originalImage == null) {
                return Response.status(Response.Status.BAD_REQUEST).entity("{\"error\":\"Unsupported image format\"}").build();
            }

            BufferedImage thumbnail = createThumbnail(originalImage);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageWriter writer = ImageIO.getImageWritersByFormatName("jpeg").next();
            ImageOutputStream ios = ImageIO.createImageOutputStream(baos);
            writer.setOutput(ios);
            writer.write(thumbnail);
            ios.close();
            writer.dispose();

            byte[] thumbnailBytes = baos.toByteArray();
            String thumbName = "thumb_" + originalFileName.getName();
            ManagedFileName thumbnailFileName = ManagedFileName.validate(ObjectKind.FILE, thumbName);
            SizedStream thumbnailStream = new SizedStream(new ByteArrayInputStream(thumbnailBytes), thumbnailBytes.length);
            fileManager.storeFile(storage, thumbnailFileName, platformStorage.getDefaultMetadata(), thumbnailStream);


            String thumbnailUrl = String.format("/file/image-upload/thumbnail?fileName=%s&storageId=%s",
                    thumbnailFileName.getName(), storageId);
            String responseJson = String.format("{\"fileName\":\"%s\", \"thumbnailUrl\":\"%s\", \"storageId\":\"%s\"}",
                    originalFileName.getName(), thumbnailUrl, storageId);

            return Response.ok(responseJson).build();
        } catch (Exception e) {
            logger.error(e.getMessage(), e);
            return Response.serverError().entity("{\"error\":\"" + e.getMessage() + "\"}").build();
        }
    }

    @GET
    @Path("/thumbnail")
    @Produces("image/jpeg")
    public Response getThumbnail(@QueryParam("fileName") String fileName, @QueryParam("storageId") String storageId) {
        try {
            ObjectStorage storage = platformStorage.getStorage(storageId);
            ManagedFileName managedName = ManagedFileName.validate(ObjectKind.FILE, fileName);

            ObjectRecord record = fileManager.fetchFile(storage, managedName).orElseThrow(
                    () -> new WebApplicationException("File not found: " + fileName, Response.Status.NOT_FOUND));

            StreamingOutput fileStream = output -> {
                try (InputStream content = record.getLocation().readContent()) {
                    IOUtils.copy(content, output);
                }
                output.flush();
            };
            return Response.ok(fileStream).build();
        } catch (Exception e) {
            logger.error("Error fetching file '{}': {}", fileName, e.getMessage(), e);
            return Response.serverError().entity("Error fetching file").build();
        }
    }

    @DELETE
    public Response deleteImage(@QueryParam("fileName") String fileName,
                                @QueryParam("storageId") String storageId) {
        try {
            ObjectStorage storage = platformStorage.getStorage(storageId);
            if (fileName != null && !fileName.isEmpty()) {
                ManagedFileName managedName = ManagedFileName.validate(ObjectKind.FILE, fileName);
                fileManager.deleteFile(storage, managedName, platformStorage.getDefaultMetadata());
                String thumbnailFileName = "thumb_" + fileName;
                ManagedFileName thumbManagedName = ManagedFileName.validate(ObjectKind.FILE, thumbnailFileName);
                fileManager.deleteFile(storage, thumbManagedName, platformStorage.getDefaultMetadata());
            }
            return Response.noContent().build();
        } catch (Exception e) {
            logger.error("Failed to remove from temporary storage ({}): {}", storageId, e.getMessage(), e);
            return Response.serverError().entity(e.getMessage()).build();
        }
    }

    private BufferedImage createThumbnail(BufferedImage originalImage) {
        int width = 200;
        int height = 200;
        BufferedImage resizedImage = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        resizedImage.createGraphics().drawImage(originalImage.getScaledInstance(width, height, java.awt.Image.SCALE_SMOOTH), 0, 0, null);
        return resizedImage;
    }
}
