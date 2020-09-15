/**
 * ResearchSpace Copyright (C) 2020, © Trustees of the British Museum
 *
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option) any
 * later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

package org.researchspace.services.files.extractors;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.StringReader;
import java.util.ArrayList;

import javax.inject.Inject;

import com.github.jknack.handlebars.Context;
import com.github.jknack.handlebars.Handlebars;
import com.github.jknack.handlebars.Template;
import com.github.jknack.handlebars.context.FieldValueResolver;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.tools.imageio.ImageIOUtil;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.researchspace.repository.MpRepositoryProvider;
import org.researchspace.repository.RepositoryManager;
import org.researchspace.services.files.FileExtractor;
import org.researchspace.services.files.FileManager;
import org.researchspace.services.files.ManagedFileName;
import org.researchspace.services.storage.api.ObjectKind;
import org.researchspace.services.storage.api.ObjectStorage;
import org.researchspace.services.storage.api.PlatformStorage;
import org.researchspace.services.storage.api.SizedStream;
import org.researchspace.services.storage.utils.ExactSizeInputStream;

public class PdfFileExtractor implements FileExtractor<PdfFileExtractorOptions> {

    private static final Logger logger = LogManager.getLogger(PdfFileExtractor.class);

    @Inject
    private FileManager fileManager;

    @Inject
    private PlatformStorage platformStorage;

    @Inject
    private RepositoryManager repositoryManager;

    @Override
    public Class<PdfFileExtractorOptions> getOptionsClass() {
        return PdfFileExtractorOptions.class;
    }

    @Override
    public void handleFile(PdfFileExtractorOptions options, IRI fileIri, String fileName, InputStream file) {

        try (PDDocument document = PDDocument.load(file)) {
            logger.debug("Loading PDF file with IRI - %.", fileIri.stringValue());
            PDFRenderer pr = new PDFRenderer(document);
            final int numberOfPages = document.getNumberOfPages();
            logger.debug("Decomposing PDF into pages. Document has % pages.", numberOfPages);

            Pdf pdf = new Pdf();
            pdf.fileIri = fileIri.stringValue();
            pdf.pages = new ArrayList<Page>(numberOfPages);

            ObjectStorage storage = platformStorage.getStorage("images");
            for (int pageNumber = 0; pageNumber < numberOfPages; pageNumber++) {
                String pageFileName = fileName + "_page_N" + pageNumber + ".jpeg";
                ManagedFileName managedName = ManagedFileName.generateFromFileName(ObjectKind.FILE, pageFileName,
                        fileManager::generateSequenceNumber);

                try {
                    BufferedImage bim = pr.renderImageWithDPI(pageNumber, 300, ImageType.RGB);
                    try (ByteArrayOutputStream renderedImage = new ByteArrayOutputStream()) {
                        ImageIOUtil.writeImage(bim, "jpeg", renderedImage, 300, 1, "");

                        byte[] imageBytes = renderedImage.toByteArray();
                        try (SizedStream imageStream = new SizedStream(
                                new ExactSizeInputStream(new ByteArrayInputStream(imageBytes), imageBytes.length),
                                imageBytes.length)) {
                            fileManager.storeFile(storage, managedName, platformStorage.getDefaultMetadata(),
                                    imageStream);
                        }

                        IRI imageFileIri = fileManager.createLdpResource(managedName,
                                new MpRepositoryProvider(repositoryManager, "assets"), options.generateIriQuery,
                                options.createResourceQuery, fileIri.stringValue(), "image/jpeg");
                        pdf.pages.add(new Page(imageFileIri.stringValue(), pageNumber));
                    }

                } catch (Exception e) {
                    // try to clean up uploaded file if LDP update failed
                    fileManager.deleteFile(storage, managedName, platformStorage.getDefaultMetadata());
                    throw new RuntimeException(e);
                }
            }

            Template rdfTemplate = new Handlebars().compileInline(options.rdfTemplate);
            String rdfTurtle = rdfTemplate.apply(Context.newBuilder(pdf).resolver(FieldValueResolver.INSTANCE).build());
            System.out.println(rdfTurtle);
            try (RepositoryConnection con = this.repositoryManager.getAssetRepository().getConnection()) {
                con.add(new StringReader(rdfTurtle), fileIri.stringValue(), RDFFormat.TURTLE, con.getValueFactory().createIRI(options.namedGraph));
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}

class Pdf {
    public String fileIri;
    public int numberOfPages;
    public ArrayList<Page> pages;
}

class Page {
    public String representationFileIri;
    public int pageNumber;

    public Page(String representationFileIri, int pageNumber) {
        this.representationFileIri = representationFileIri;
        this.pageNumber = pageNumber;
    }

}
