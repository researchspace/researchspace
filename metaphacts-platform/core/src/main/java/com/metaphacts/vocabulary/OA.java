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

package com.metaphacts.vocabulary;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;

/**
 * <p>
 * Vocabulary for Web Annotation Data Model (previously Open Annotation).
 * </p>
 * Prefix:<br/>
 *  {@code oa: <http://www.w3.org/ns/oa#>}
 *
 * @see http://www.w3.org/TR/annotation-model/
 * 
 * @author ArtemKozlov <ak@metaphacts.com>
 */
public class OA {

    public static String NAMESPACE = "http://www.w3.org/ns/oa#";

    public static final IRI ANNOTATION_CLASS;

    public static final IRI HAS_BODY_PROPERTY;
    public static final IRI HAS_SOURCE_PROPERTY;
    public static final IRI HAS_TARGET_PROPERTY;
    public static final IRI TEXT_PROPERTY;
    public static final IRI HAS_SELECTOR_PROPERTY;
    public static final IRI SPECIFIC_RESOURCE_CLASS;
    public static final IRI SVG_SELECTOR_CLASS;
    public static final IRI FRAGMENT_SELECTOR_CLASS;

    static {
        ValueFactory f = SimpleValueFactory.getInstance();
        ANNOTATION_CLASS = f.createIRI(NAMESPACE, "Annotation");

        HAS_SOURCE_PROPERTY = f.createIRI(NAMESPACE, "hasSource");
        HAS_BODY_PROPERTY = f.createIRI(NAMESPACE, "hasBody");
        HAS_TARGET_PROPERTY = f.createIRI(NAMESPACE, "hasTarget");
        TEXT_PROPERTY = f.createIRI(NAMESPACE, "text");
        HAS_SELECTOR_PROPERTY = f.createIRI(NAMESPACE, "hasSelector");
        SPECIFIC_RESOURCE_CLASS = f.createIRI(NAMESPACE, "SpecificResource");
        SVG_SELECTOR_CLASS = f.createIRI(NAMESPACE, "SvgSelector");
        FRAGMENT_SELECTOR_CLASS = f.createIRI(NAMESPACE, "FragmentSelector");
    }

}
