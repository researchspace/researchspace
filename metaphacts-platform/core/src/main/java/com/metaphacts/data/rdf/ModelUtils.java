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

package com.metaphacts.data.rdf;

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
    
   public static Model replaceSubjectAndObjects(Model model, Resource oldResource, Resource newResource){
       ValueFactory vf = SimpleValueFactory.getInstance();
       Model subjectsBeReplaced = new LinkedHashModel(model.filter(oldResource, null, null));
       Model objectsBeReplaced = new LinkedHashModel(model.filter(null, null, oldResource));
       for(Statement s : subjectsBeReplaced){
           model.remove(s);
           model.add(vf.createStatement(newResource, s.getPredicate(), s.getObject()));
       }
       for(Statement s : objectsBeReplaced){
           model.remove(s);
           model.add(vf.createStatement(s.getSubject(), s.getPredicate(), newResource));
       }
       return model;
    }

}