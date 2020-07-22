/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2016, metaphacts GmbH
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
package org.researchspace.vocabulary;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.vocabulary.SP;
import org.eclipse.rdf4j.model.vocabulary.SPIN;
import org.eclipse.rdf4j.model.vocabulary.XMLSchema;

public class QF {
    /**
     * Namespace. Preferred prefix is "qf:"
     */
    public static String NAMESPACE = "http://www.researchspace.org/resource/system/queryform#";

    //// CLASSES //////

    /**
     * qf:QueryForm consist 0 to N qf:QueryFormElements linked via the
     * qf:formElement property
     */
    public static IRI QUERY_FORM_CLASS;
    /**
     * qf:QueryFormElement holds the information which is required to render a UI
     * form element for a particular spl:Argument ({@link SPL#ARGUMENT_CLASS}
     */
    public static IRI QUERY_FORM_ELEMENT_CLASS;

    /**
     * qf:UiFormElement collection of enumerated individuals
     */
    public static IRI UI_FORM_ELEMENT_CLASS;

    //// INDIVIDUALS //////
    // TODO these should be a separate vocabulary
    /**
     * Representing a choice element. Whether this will be, for example a dropdown
     * or a text input field with a fixed set of suggestions is up to the
     * application
     */
    public static IRI UI_CHOICE_INDIVIDUAL;
    /**
     * Simple text input field
     */
    public static IRI UI_TEXT_INPUT_INDIVIDUAL;
    /**
     * Date picker element
     */
    public static IRI UI_DATEPICKER_INDIVIDUAL;

    //// PROPERTIES WITH DOMAIN qf:QueryForm//////

    /**
     * <dl>
     * <dt>Domain</dt>
     * <dd>{@link QUERY_FORM_CLASS}</dd>
     * <dt>Range</dt>
     * <dd>{@link SPIN#TEMPLATE_CLASS}</dd>
     * </dl>
     */
    public static IRI SPIN_TEMPLATE_PROPERTY;

    /**
     * <dl>
     * <dt>Domain</dt>
     * <dd>{@link QUERY_FORM_CLASS}</dd>
     * <dt>Range</dt>
     * <dd>{@link QUERY_FORM_ELEMENT_CLASS}</dd>
     * </dl>
     */
    public static IRI FORM_ELEMENT_PROPERTY;

    //// PROPERTIES WITH DOMAIN qf:QueryFormElement //////
    /**
     * <dl>
     * Integer to define the order qf:QueryFormElement (s) within a qf:QueryForm
     * <dt>Domain</dt>
     * <dd>{@link QUERY_FORM_ELEMENT_CLASS}</dd>
     * <dt>Range</dt>
     * <dd>{@link XMLSchema#INT}</dd>
     * </dl>
     */
    public static IRI ELEMENT_ORDER_PROPERTY;
    /**
     * <dl>
     * <dt>Domain</dt>
     * <dd>{@link QUERY_FORM_ELEMENT_CLASS}</dd>
     * <dt>Range</dt>
     * <dd>{@link UI_FORM_ELEMENT_CLASS}</dd>
     * </dl>
     */
    public static IRI UI_FORM_ELEMENT_PROPERTY;

    /**
     * <dl>
     * <dt>Domain</dt>
     * <dd>{@link QUERY_FORM_ELEMENT_CLASS}</dd>
     * <dt>Range</dt>
     * <dd>{@link SPL#ARGUMENT_CLASS}</dd>
     * </dl>
     */
    public static IRI SPL_ARGUMENT_PROPERTY;

    /**
     * <dl>
     * <dt>Domain</dt>
     * <dd>{@link QUERY_FORM_ELEMENT_CLASS}</dd>
     * <dt>Range</dt>
     * <dd>{@link SP#QUERY_CLASS}</dd>
     * </dl>
     */
    public static IRI SUGGESTION_QUERY_PROPERTY;

    static {
        ValueFactory f = SimpleValueFactory.getInstance();

        QUERY_FORM_CLASS = f.createIRI(NAMESPACE, "QueryForm");
        QUERY_FORM_ELEMENT_CLASS = f.createIRI(NAMESPACE, "QueryFormElement");
        UI_FORM_ELEMENT_CLASS = f.createIRI(NAMESPACE, "UIFormElement");

        // TODO these should be a separate vocabulary
        UI_CHOICE_INDIVIDUAL = f.createIRI(NAMESPACE, "Choice");
        UI_DATEPICKER_INDIVIDUAL = f.createIRI(NAMESPACE, "DatePicker");
        UI_TEXT_INPUT_INDIVIDUAL = f.createIRI(NAMESPACE, "TextInput");

        SPIN_TEMPLATE_PROPERTY = f.createIRI(NAMESPACE, "spinTemplate");
        FORM_ELEMENT_PROPERTY = f.createIRI(NAMESPACE, "formElement");
        ELEMENT_ORDER_PROPERTY = f.createIRI(NAMESPACE, "elementOrderNr");
        UI_FORM_ELEMENT_PROPERTY = f.createIRI(NAMESPACE, "uiFormElement");
        SPL_ARGUMENT_PROPERTY = f.createIRI(NAMESPACE, "splArgument");
        SUGGESTION_QUERY_PROPERTY = f.createIRI(NAMESPACE, "suggestionQuery");
    }
}