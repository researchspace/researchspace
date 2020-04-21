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
public class CidocCRM {

    public static String NAMESPACE = "http://www.cidoc-crm.org/cidoc-crm/";

    public static final IRI P4_HAS_TIME_SPAN_PROPERTY;
    public static final IRI P82A_BEGIN_OF_THE_BEGIN_PROPERTY;
    public static final IRI P82A_END_OF_THE_END_PROPERTY;
    public static final IRI P14_CARRIED_OUT_BY_PROPERTY;
    public static final IRI P138i_HAS_REPRESENTATION_PROPERTY;

    public static final IRI E52_TIME_SPAN_CLASS;
    public static final IRI E39_ACTOR_CLASS;

    static {
        ValueFactory f = SimpleValueFactory.getInstance();
        P138i_HAS_REPRESENTATION_PROPERTY = f.createIRI(NAMESPACE, "P138i_has_representation");
        P4_HAS_TIME_SPAN_PROPERTY = f.createIRI(NAMESPACE, "P4_has_time_span");
        P82A_BEGIN_OF_THE_BEGIN_PROPERTY = f.createIRI(NAMESPACE, "P82a_begin_of_the_begin");
        P82A_END_OF_THE_END_PROPERTY = f.createIRI(NAMESPACE, "P82a_end_of_the_end");
        P14_CARRIED_OUT_BY_PROPERTY = f.createIRI(NAMESPACE, "P14_carried_out_by");
        E52_TIME_SPAN_CLASS = f.createIRI(NAMESPACE, "E52_Time-Span");
        E39_ACTOR_CLASS = f.createIRI(NAMESPACE, "E39_Actor");

    }

}