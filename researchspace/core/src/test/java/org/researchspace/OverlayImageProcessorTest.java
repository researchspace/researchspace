/*
 * Copyright (C) 2015-2019, © Trustees of the British Museum
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

package org.researchspace;

import static org.junit.Assert.assertTrue;

import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.math.BigInteger;
import java.nio.file.Files;
import java.security.SecureRandom;
import java.util.List;

import javax.imageio.ImageIO;

import org.apache.commons.io.FileUtils;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.LinkedHashModel;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.junit.AfterClass;
import org.junit.BeforeClass;
import org.junit.Test;
import org.researchspace.images.OverlayImageFileProcessor;
import org.researchspace.images.OverlayImageProcessor;
import org.researchspace.vocabulary.CRMdig;
import org.researchspace.vocabulary.CidocCRM;
import org.researchspace.vocabulary.RSO;

import com.google.common.collect.Lists;
import com.metaphacts.data.rdf.PointedGraph;
import com.metaphacts.junit.AbstractIntegrationTest;

/**
 * @author Yury Emelyanov
 */
public class OverlayImageProcessorTest extends AbstractIntegrationTest {

    private ValueFactory vf = SimpleValueFactory.getInstance();

    
    PointedGraph getSimpleOperation(String topImage, double topOpacity, String bottomImage, double bottomOpacity, String name) {
        IRI overlayIri = vf.createIRI("http://researchspace.org/test/" + name);
        IRI topImageUri = vf.createIRI("http://researchspace.org/test/Overlay1/" + topImage);
        IRI bottomImageUri = vf.createIRI("http://researchspace.org/test/Overlay1/" + bottomImage);
        IRI eventIri = vf.createIRI("http://researchspace.org/test/Overlay1/event");
        IRI param1 = vf.createIRI("http://researchspace.org/test/Overlay1/param1");
        IRI param2 = vf.createIRI("http://researchspace.org/test/Overlay1/param2");
        Model model = new LinkedHashModel(Lists.newArrayList(
            vf.createStatement(overlayIri, RDF.TYPE, RSO.THING_CLASS),
            vf.createStatement(overlayIri, RDF.TYPE, CRMdig.D9_DATA_OBJECT_CLASS),
            vf.createStatement(overlayIri, RDFS.LABEL, vf.createLiteral(name)),
            vf.createStatement(overlayIri, RSO.DISPLAYLABEL_PROPERTY, vf.createLiteral(name)),
            vf.createStatement(topImageUri, CRMdig.L21_USED_AS_DERIVATION_SOURCE, eventIri),
            vf.createStatement(bottomImageUri, CRMdig.L21_USED_AS_DERIVATION_SOURCE, eventIri),
            vf.createStatement(eventIri, RDF.TYPE, CRMdig.D3_FORMAL_DERIVATION_CLASS),
            vf.createStatement(eventIri, CRMdig.L22_CREATED_DERIVATIVE, overlayIri),
            //Parameters - param1
            vf.createStatement(eventIri, CRMdig.L13_USED_PARAMETERS_PROPERTY, param1),
            vf.createStatement(param1, RDF.TYPE, CRMdig.D1_DIGITAL_OBJECT_CLASS),
            vf.createStatement(param1, RSO.OVERLAY_IMAGESOURCE_PROPERTY, bottomImageUri),
            vf.createStatement(param1, RSO.OVERLAY_ORDER_PROPERTY, vf.createLiteral(1)),
            vf.createStatement(param1, RSO.OVERLAY_OPACITY_PROPERTY, vf.createLiteral(bottomOpacity)),
            //Parameters - param2
            vf.createStatement(eventIri, CRMdig.L13_USED_PARAMETERS_PROPERTY, param2),
            vf.createStatement(param2, RDF.TYPE, CRMdig.D1_DIGITAL_OBJECT_CLASS),
            vf.createStatement(param2, RSO.OVERLAY_IMAGESOURCE_PROPERTY, topImageUri),
            vf.createStatement(param2, RSO.OVERLAY_ORDER_PROPERTY, vf.createLiteral(2)),
            vf.createStatement(param2, RSO.OVERLAY_OPACITY_PROPERTY, vf.createLiteral(topOpacity))
        )
        );
        return new PointedGraph(overlayIri, model);
    }

    List<OverlayImageProcessor.BlendingParam> getParams(String topImage, double topOpacity, String bottomImage, double bottomOpacity) {
        IRI topImageUri = vf.createIRI("http://researchspace.org/test/Overlay1/" + topImage);
        IRI bottomImageUri = vf.createIRI("http://researchspace.org/test/Overlay1/" + bottomImage);
        return Lists.newArrayList(
            new OverlayImageProcessor.BlendingParam(topImageUri, 1, topOpacity),
            new OverlayImageProcessor.BlendingParam(bottomImageUri, 2, bottomOpacity)
        );
    }

    @Test
    public void testImageOverlay5050() throws Exception {
        getOverlayImageFileProcessor().applyOverlay(vf.createIRI("http://researchspace.org/images/5050"), getParams("circlePNG", 0.5, "squarePNG", 0.5));
        assertTrue("Image should exist", new File(tempWorkingDir, "5050.jpg").exists());
        assertTrue("Image should be equal", compareImages("5050.jpg", "5050.jpg"));
    }

    @Test
    public void testImageOverlay0100() throws Exception {
        getOverlayImageFileProcessor().applyOverlay(vf.createIRI("http://researchspace.org/images/100"), getParams("circlePNG", 0.0, "squarePNG", 1.0));
        assertTrue("Image should exist", new File(tempWorkingDir, "100.jpg").exists());
        assertTrue("Image should be equal", compareImages("100.jpg", "100.jpg"));
    }

    @Test
    public void testImageOverlay1090() throws Exception {
        getOverlayImageFileProcessor().applyOverlay(vf.createIRI("http://researchspace.org/images/1090"), getParams("circlePNG", 0.1, "squarePNG", 0.9));
        assertTrue("Image should exist", new File(tempWorkingDir, "1090.jpg").exists());
        assertTrue("Image should be equal", compareImages("1090.jpg", "1090.jpg"));
    }

    @Test
    public void testImageOverlay9010() throws Exception {
        getOverlayImageFileProcessor().applyOverlay(vf.createIRI("http://researchspace.org/images/9010"), getParams("circlePNG", 0.9, "squarePNG", 0.1));
        assertTrue("Image should exist", new File(tempWorkingDir, "9010.jpg").exists());
        assertTrue("Image should be equal", compareImages("9010.jpg", "9010.jpg"));
    }

    @Test
    public void testImageOverlay1000() throws Exception {
        getOverlayImageFileProcessor().applyOverlay(vf.createIRI("http://researchspace.org/images/1000"), getParams("circlePNG", 1.0, "squarePNG", 0.0));
        assertTrue("Image should exist", new File(tempWorkingDir, "1000.jpg").exists());
        assertTrue("Image should be equal", compareImages("1000.jpg", "1000.jpg"));
    }

    @Test
    public void testImageOverlayTIFF() throws Exception {
        getOverlayImageFileProcessor().applyOverlay(vf.createIRI("http://researchspace.org/images/testTIFF"), getParams("circleTIFF", 0.5, "squareTIFF", 0.5));
        assertTrue("Image should exist", new File(tempWorkingDir, "testTIFF.jpg").exists());
        assertTrue("Image should be equal", compareImages("testTIFF.jpg", "testTIFF.jpg"));
    }

    @Test
    public void testImageOverlayJPG() throws Exception {
        getOverlayImageFileProcessor().applyOverlay(vf.createIRI("http://researchspace.org/images/testJPG"), getParams("circleJPG", 0.5, "squareJPG", 0.5));
        assertTrue("Image should exist", new File(tempWorkingDir, "testJPG.jpg").exists());
        assertTrue("Image should be equal", compareImages("testJPG.jpg", "testJPG.jpg"));
    }

    @Test
    public void testGraphParse() throws Exception {
        PointedGraph graph = getOverlayImageProcessor().convertToCRMDig(getSimpleOperation("circlePNG", 0.1, "squarePNG", 0.9, "parseTest"));
        assertTrue("Graph should have rewritten IRI for event", graph.getGraph().contains(vf.createIRI("http://researchspace.org/test/parseTest/event"), CidocCRM.P14_CARRIED_OUT_BY_PROPERTY, getUserURI()));
    }

    private boolean compareImages(String referenceInClasspath, String testInTempFolder) throws Exception {
        BufferedImage referenceImg = ImageIO.read(OverlayImageProcessorTest.class.getResourceAsStream("/org/researchspace/imageoverlay/" + referenceInClasspath));
        BufferedImage testImage = ImageIO.read(new File(tempWorkingDir, testInTempFolder));
      if (referenceImg.getWidth() == testImage.getWidth() && referenceImg.getHeight() == testImage.getHeight()) {
        for (int x = 0; x < referenceImg.getWidth(); x++) {
          for (int y = 0; y < referenceImg.getHeight(); y++) {
            if (referenceImg.getRGB(x, y) != testImage.getRGB(x, y))
              return false;
          }
        }
      } else {
        return false;
      }
      return true;
    }

    OverlayImageFileProcessor getOverlayImageFileProcessor() {
        return new OverlayImageFileProcessor(tempWorkingDir.toURI());
    }

    public OverlayImageProcessor getOverlayImageProcessor() {
        return new OverlayImageProcessor(tempWorkingDir.toURI(), getUserURI());
    }

    private IRI getUserURI() {
        return vf.createIRI("http://researchspace.org/users/admin");
    }

    static File tempWorkingDir;

    @BeforeClass
    public static void setup() throws Exception {
        tempWorkingDir = Files.createTempDirectory("imageoverlay").toFile();
        FileUtils.copyInputStreamToFile(OverlayImageProcessorTest.class.getResourceAsStream("/org/researchspace/imageoverlay/circlePNG.png"), new File(tempWorkingDir, "circlePNG.png"));
        FileUtils.copyInputStreamToFile(OverlayImageProcessorTest.class.getResourceAsStream("/org/researchspace/imageoverlay/squarePNG.png"), new File(tempWorkingDir, "squarePNG.png"));
        FileUtils.copyInputStreamToFile(OverlayImageProcessorTest.class.getResourceAsStream("/org/researchspace/imageoverlay/circleJPG.jpg"), new File(tempWorkingDir, "circleJPG.jpg"));
        FileUtils.copyInputStreamToFile(OverlayImageProcessorTest.class.getResourceAsStream("/org/researchspace/imageoverlay/squareJPG.jpg"), new File(tempWorkingDir, "squareJPG.jpg"));
        FileUtils.copyInputStreamToFile(OverlayImageProcessorTest.class.getResourceAsStream("/org/researchspace/imageoverlay/circleTIFF.tiff"), new File(tempWorkingDir, "circleTIFF.tiff"));
        FileUtils.copyInputStreamToFile(OverlayImageProcessorTest.class.getResourceAsStream("/org/researchspace/imageoverlay/squareTIFF.tiff"), new File(tempWorkingDir, "squareTIFF.tiff"));
    }
    @AfterClass
    public static void tearDown() throws IOException {
        FileUtils.deleteDirectory(tempWorkingDir);
    }

    private static SecureRandom random = new SecureRandom();

    public static String nextRandom() {
        return new BigInteger(130, random).toString(32);
    }


}