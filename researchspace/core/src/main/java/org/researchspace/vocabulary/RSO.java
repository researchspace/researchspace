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

package org.researchspace.vocabulary;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;

/**
 * @author Artem Kozlov <ak@metaphacts.com>
 */
public class RSO {

    public static String NAMESPACE = "http://www.researchspace.org/ontology/";
    /*
     * CLASSES
     */
    public static final IRI EX_DIGITAL_IMAGE_REGION_CLASS;
    public static final IRI THING_CLASS;
    public static final IRI EX_Assertion;
    public static final IRI ALIGNMENT;

    /*
     * PROPERTIES
     */
    public static final IRI DISPLAYLABEL_PROPERTY;
    public static final IRI OVERLAY_IMAGESOURCE_PROPERTY;
    public static final IRI OVERLAY_ORDER_PROPERTY;
    public static final IRI OVERLAY_OPACITY_PROPERTY;

    static {
        ValueFactory f = SimpleValueFactory.getInstance();
        // classes
        THING_CLASS = f.createIRI(NAMESPACE, "Thing");
        EX_DIGITAL_IMAGE_REGION_CLASS = f.createIRI(NAMESPACE, "EX_Digital_Image_Region");
        EX_Assertion = f.createIRI(NAMESPACE, "EX_Assertion");
        ALIGNMENT = f.createIRI(NAMESPACE, "Alignment");

        OVERLAY_IMAGESOURCE_PROPERTY = f.createIRI(NAMESPACE, "Overlay_Image_Source");
        OVERLAY_ORDER_PROPERTY = f.createIRI(NAMESPACE, "Overlay_Order");
        OVERLAY_OPACITY_PROPERTY = f.createIRI(NAMESPACE, "Overlay_Opacity");

        // properties
        DISPLAYLABEL_PROPERTY = f.createIRI(NAMESPACE, "displayLabel");
    }

}
