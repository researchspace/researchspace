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
package org.researchspace.api.transform;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Literal;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.model.util.ModelException;
import org.eclipse.rdf4j.model.util.Models;

/**
 * @author jt
 *
 */
public class ModelUtils {
    public static IRI getNotNullSubjectIRI(Model model, IRI pred, Value obj, Resource... contexts)
            throws ModelException {
        return Models.subjectIRI(model.filter(null, pred, obj, contexts)).orElseThrow(
                () -> new ModelException("Subject of { ?subject " + pred + " " + obj + " } is not an IRI or is null."));
    }

    public static Resource getNotNullSubjectResource(Model model, IRI pred, Value obj, Resource... contexts)
            throws ModelException {
        return Models.subject(model.filter(null, pred, obj, contexts)).orElseThrow(() -> new ModelException(
                "Subject of { ?subject " + pred + " " + obj + " } is not a resource or is null."));
    }

    public static IRI getNotNullObjectIRI(Model model, Resource subj, IRI pred, Resource... contexts)
            throws ModelException {
        return Models.objectIRI(model.filter(subj, pred, null, contexts)).orElseThrow(
                () -> new ModelException("Object of { " + subj + " " + pred + " ?object } is not an IRI or is null."));
    }

    public static Resource getNotNullObjectResource(Model model, Resource subj, IRI pred, Resource... contexts)
            throws ModelException {
        return Models.objectResource(model.filter(subj, pred, null, contexts)).orElseThrow(() -> new ModelException(
                "Object of { " + subj + " " + pred + " ?object } is not a resource or is null."));
    }

    public static Literal getNotNullObjectLiteral(Model model, Resource subj, IRI pred, Resource... contexts)
            throws ModelException {
        return Models.objectLiteral(model.filter(subj, pred, null, contexts)).orElseThrow(() -> new ModelException(
                "Object of { " + subj + " " + pred + " ?object } is not an Literal or is null."));
    }

}