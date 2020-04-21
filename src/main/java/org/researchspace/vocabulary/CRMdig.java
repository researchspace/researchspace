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

package org.researchspace.vocabulary;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;

/**
 * @author Yury Emelyanov
 */
public class CRMdig {

    public static String NAMESPACE = "http://www.ics.forth.gr/isl/CRMdig/";

    /* Classes */
    public static final IRI D1_DIGITAL_OBJECT_CLASS;
    public static final IRI D2_DIGITIZATION_PROCESS_CLASS;
    public static final IRI D3_FORMAL_DERIVATION_CLASS;
    public static final IRI D7_DIGITAL_MACHINE_EVENT_CLASS;
    public static final IRI D9_DATA_OBJECT_CLASS;
    public static final IRI D35_AREA_CLASS;
    public static final IRI D29_ANNOTATION_OBJECT_CLASS;
    public static final IRI D30_ANNOTATION_EVENT_CLASS;

    /* Properties */
    public static final IRI L11_HAD_OUTPUT_PROPERTY;
    public static final IRI L50_IS_PROPAGATED_AREA_OF_PROPERTY;
    public static final IRI L49_IS_PRIMARY_AREA_OF_PROPERTY;
    public static final IRI L20_HAS_CREATED_PROPERTY;
    public static final IRI L1_DIGITIZED_PROPERTY;
    public static final IRI L43_ANNOTATES_PROPERTY;
    public static final IRI L48_CREATED_ANNOTATION_PROPERTY;
    public static final IRI L57_HAS_PIXEL_HEIGHT;
    public static final IRI L56_HAS_PIXEL_WIDTH;
    public static final IRI L21_USED_AS_DERIVATION_SOURCE;
    public static final IRI L22_CREATED_DERIVATIVE;
    public static final IRI L13_USED_PARAMETERS_PROPERTY;

    static {
        ValueFactory f = SimpleValueFactory.getInstance();
        D7_DIGITAL_MACHINE_EVENT_CLASS = f.createIRI(NAMESPACE, "D7_Digital_Machine_Event");
        D9_DATA_OBJECT_CLASS = f.createIRI(NAMESPACE, "D9_Data_Object");
        D35_AREA_CLASS = f.createIRI(NAMESPACE, "D35_Area");
        D2_DIGITIZATION_PROCESS_CLASS = f.createIRI(NAMESPACE, "D2_Digitization_Process");
        D1_DIGITAL_OBJECT_CLASS = f.createIRI(NAMESPACE, "D1_Digital_Object");
        D3_FORMAL_DERIVATION_CLASS = f.createIRI(NAMESPACE, "D3_Formal_Derivation");
        D29_ANNOTATION_OBJECT_CLASS = f.createIRI(NAMESPACE, "D29_Annotation_Object");
        D30_ANNOTATION_EVENT_CLASS = f.createIRI(NAMESPACE, "D30_Annotation_Event");

        L20_HAS_CREATED_PROPERTY = f.createIRI(NAMESPACE, "L20_has_created");
        L21_USED_AS_DERIVATION_SOURCE = f.createIRI(NAMESPACE, "L21_used_as_derivation_source");
        L22_CREATED_DERIVATIVE = f.createIRI(NAMESPACE, "L22_created_derivative");
        L11_HAD_OUTPUT_PROPERTY = f.createIRI(NAMESPACE, "L11_had_output");
        L13_USED_PARAMETERS_PROPERTY = f.createIRI(NAMESPACE, "L13_used_parameters");
        L50_IS_PROPAGATED_AREA_OF_PROPERTY = f.createIRI(NAMESPACE, "L50_is_propagated_area_of");
        L49_IS_PRIMARY_AREA_OF_PROPERTY = f.createIRI(NAMESPACE, "L49_is_primary_area_of");
        L1_DIGITIZED_PROPERTY = f.createIRI(NAMESPACE, "L1_digitized");
        L43_ANNOTATES_PROPERTY = f.createIRI(NAMESPACE, "L43_annotates");
        L48_CREATED_ANNOTATION_PROPERTY = f.createIRI(NAMESPACE, "L48_created_annotation");
        L57_HAS_PIXEL_HEIGHT = f.createIRI(NAMESPACE, "L57_has_pixel_height");
        L56_HAS_PIXEL_WIDTH = f.createIRI(NAMESPACE, "L56_has_pixel_width");
    }
}