/**
 * ResearchSpace
 * Copyright (C) 2015-2020, © Trustees of the British Museum
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

package org.researchspace.images;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.researchspace.ldp.OverlayImageContainer;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.plugins.jpeg.JPEGImageWriteParam;
import javax.imageio.stream.FileImageOutputStream;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.net.*;
import java.nio.file.Paths;
import java.util.List;

/**
 * Data and image manipulation for {@link OverlayImageContainer} Will take
 * overlay request from graph, create overlayed image and provide metadata. Will
 * auto-guess original file format but will always save in jpg.
 *
 * @author Yury Emelyanov
 */
public class OverlayImageFileProcessor {

    /**
     * OverlayImageFileProcessor will mimick IIIF server trying to auto-guess file
     * format to open it. First found file will be used with respect to order of
     * extensions.
     */
    private static String[] extensions = new String[] { "jpg", "JPG", "tiff", "TIFF", "tif", "TIF", "png", "PNG" };
    private final java.net.URI iiifFolder;

    public OverlayImageFileProcessor(java.net.URI iiifFolder) {
        this.iiifFolder = iiifFolder;
    }

    String findPathToImage(IRI imageURI) throws URISyntaxException, FileNotFoundException {
        // we will check for different extensions in order
        String basePath = Paths.get(new java.net.URI(iiifFolder + "/" + IIIFMetadataExtractor.assetIdFromUri(imageURI)))
                .toString();
        for (String extension : extensions) {
            String testPath = basePath.endsWith(extension) ? basePath : basePath + "." + extension;
            if (Paths.get(testPath).toFile().exists())
                return testPath;
        }
        throw new FileNotFoundException("No image found for " + basePath + " with registered extensions");
    }

    String createPathToImage(IRI imageURI) throws URISyntaxException {
        return Paths.get(new java.net.URI(iiifFolder + "/" + IIIFMetadataExtractor.assetIdFromUri(imageURI)))
                .toString();
    }

    public void applyOverlay(IRI overlayedImageUri, final List<OverlayImageProcessor.BlendingParam> params)
            throws RepositoryException {

        Value topImage, bottomImage;
        double topOpacity, bottomOpacity;

        topImage = params.get(1).image;
        topOpacity = params.get(1).opacity;

        bottomImage = params.get(0).image;
        bottomOpacity = params.get(0).opacity;

        try {
            // finding out image filename with respect to
            // OverlayImageFileProcessor.extensions
            String topFilename = findPathToImage((IRI) topImage);
            String bottomFilename = findPathToImage((IRI) bottomImage);
            String resultfile = createPathToImage(overlayedImageUri);

            try {
                overlayImages(topFilename, topOpacity, bottomFilename, bottomOpacity, resultfile);
            } catch (IOException e) {
                throw new RuntimeException(String.format("Could not blend images %s %s", topFilename, bottomFilename),
                        e);
            }

        } catch (URISyntaxException e) {
            throw new RuntimeException(String.format("Failed to process filename paths for images"), e);
        } catch (FileNotFoundException fe) {
            throw new RuntimeException(String.format("Failed to locate file for processing"), fe);
        }

    }

    void overlayImages(String topFile, double topOpacity, String bottomFile, double bottomOpacity, String resultingPath)
            throws IOException {
        BufferedImage topImage = ImageIO.read(new File(topFile));
        BufferedImage bottomImage = ImageIO.read(new File(bottomFile));

        // create the new image, canvas size is the max. of both image sizes
        int w = Math.max(topImage.getWidth(), bottomImage.getWidth());
        int h = Math.max(topImage.getHeight(), bottomImage.getHeight());
        BufferedImage combined = new BufferedImage(w, h, BufferedImage.TYPE_INT_ARGB);

        // passing zeros provides bad results, fixing it
        bottomOpacity = bottomOpacity < 0.01 ? 0.01 : bottomOpacity;
        topOpacity = topOpacity < 0.01 ? 0.01 : topOpacity;

        // paint both images, preserving the alpha channels
        // scale both images to the size of the biggest image
        Graphics2D g = combined.createGraphics();
        g.setComposite(AlphaComposite.getInstance(AlphaComposite.SRC, (float) bottomOpacity));
        g.drawImage(bottomImage, 0, 0, w, h, 0, 0, bottomImage.getWidth(), bottomImage.getHeight(), null);
        g.setComposite(AlphaComposite.getInstance(AlphaComposite.SRC_OVER, (float) topOpacity));
        g.drawImage(topImage, 0, 0, w, h, 0, 0, topImage.getWidth(), topImage.getHeight(), null);

        // converting to no alpha channel
        BufferedImage newImage = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        int[] rgb = combined.getRGB(0, 0, w, h, null, 0, w);
        newImage.setRGB(0, 0, w, h, rgb, 0, w);

        // Save as new image
        JPEGImageWriteParam jpegParams = new JPEGImageWriteParam(null);
        jpegParams.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
        jpegParams.setCompressionQuality(0.9f);

        try (FileImageOutputStream fios = new FileImageOutputStream(new File(resultingPath + ".jpg"))) {
            final ImageWriter writer = ImageIO.getImageWritersByFormatName("jpg").next();
            writer.setOutput(fios);
            writer.write(null, new IIOImage(newImage, null, null), jpegParams);

            writer.dispose();
            g.dispose();
        }
    }

}
