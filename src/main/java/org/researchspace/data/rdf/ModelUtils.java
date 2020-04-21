/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2019, metaphacts GmbH
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

package org.researchspace.data.rdf;

import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.Statement;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.LinkedHashModel;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;

/**
 * @author Artem Kozlov <ak@metaphacts.com>
 * @author Johannes Trame <jt@metaphacts.com>
 */
public class ModelUtils {

    public static Model replaceSubjectAndObjects(Model model, Resource oldResource, Resource newResource) {
        ValueFactory vf = SimpleValueFactory.getInstance();
        Model subjectsBeReplaced = new LinkedHashModel(model.filter(oldResource, null, null));
        Model objectsBeReplaced = new LinkedHashModel(model.filter(null, null, oldResource));
        for (Statement s : subjectsBeReplaced) {
            model.remove(s);
            model.add(vf.createStatement(newResource, s.getPredicate(), s.getObject()));
        }
        for (Statement s : objectsBeReplaced) {
            model.remove(s);
            model.add(vf.createStatement(s.getSubject(), s.getPredicate(), newResource));
        }
        return model;
    }

}