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

package org.researchspace.kp;

import java.io.IOException;import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import javax.inject.Inject;

import com.github.jknack.handlebars.Context;
import com.github.jknack.handlebars.Handlebars;
import com.github.jknack.handlebars.context.FieldValueResolver;
import com.github.jknack.handlebars.io.ClassPathTemplateLoader;
import com.google.common.base.Throwables;
import com.metaphacts.repository.RepositoryManager;
import com.metaphacts.vocabulary.FIELDS;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.QueryLanguage;

import org.eclipse.rdf4j.query.QueryResults;
import org.eclipse.rdf4j.query.TupleQuery;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.semarglproject.vocab.XSD;

class KP {
    public String iri;
    public String name;
    public String datatype;

    public boolean isDatatypeProperty;
    public boolean isString;
    public boolean isDateTime;

	public KP(String iri, String name, String datatype) {
        this.iri = iri;
        this.name = name;
        this.datatype = datatype;
        this.isDatatypeProperty = !datatype.equals(XSD.ANY_URI);
        this.isString = datatype.equals(XSD.STRING);
        this.isDateTime = datatype.equals(XSD.DATE_TIME);
	}

}

class Class {
    public String iri;
    public Collection<KP> kps;

    public Class(String iri, Collection<KP> kps) {
        this.iri = iri;
        this.kps = kps;
    }
}

/**
 * @author Artem Kozlov <artem@rem.sh>
 */
public class KnowledgeMapConfigGenerator {

    private static final Logger logger = LogManager.getLogger(KnowledgeMapConfigGenerator.class);

    @Inject
    private RepositoryManager rm;

    public String generateKmConfig() {
        try(RepositoryConnection con = rm.getDefault().getConnection()) {
            // get all classes used in domain and range position for KPs
            // including all possible subclasses
            String classesQuery =
                "SELECT DISTINCT ?class WHERE {\n" +
                "  {\n" +
                "    ?kp <http://www.metaphacts.com/ontology/fields#domain> ?c. \n" +
                "  } UNION {\n" +
                "    ?kp <http://www.metaphacts.com/ontology/fields#range> ?c . \n" +
                "  }\n" +
                "  ?class rdfs:subClassOf* ?c" +
                "}";

            List<Class> cs =
                QueryResults.asList(con.prepareTupleQuery(QueryLanguage.SPARQL, classesQuery).evaluate())
                .stream()
                .map(bs -> (IRI)bs.getBinding("class").getValue())
                .map(c -> new Class(c.stringValue(), createOpKps(con, c)))
                .collect(Collectors.toList());
            logger.trace("Generating KM config for {} classes", cs.size());

            Handlebars handlebars =
                new Handlebars()
                .prettyPrint(true)
                .with(new ClassPathTemplateLoader());

            Context context = Context
                .newBuilder(cs)
                .resolver(FieldValueResolver.INSTANCE).build();

            return handlebars.compile("org/researchspace/kp/KMConfig").apply(context);
         } catch (IOException e) {
            Throwables.throwIfUnchecked(e);
            throw new RuntimeException(e);
		}
    }

    /**
     * Create ObjectProperty Knowledge Patterns for the given Class
     */
    private List<KP> createOpKps(RepositoryConnection con, Value classIri) {
        String queryString =
            "SELECT DISTINCT ?kp ?datatype WHERE {\n" +
            "  <" + classIri + "> rdfs:subClassOf* ?class . \n" +
            "  ?kp <http://www.metaphacts.com/ontology/fields#domain> ?class. \n" +
        "  FILTER(?kp NOT IN(<http://www.researchspace.org/instances/fields/EntityType>, <http://www.researchspace.org/instances/fields/EntityHasLabel>, <http://www.researchspace.org/instances/fields/EntityHasImage>, <http://www.researchspace.org/instances/fields/EntityhasConnection>)). \n" +
            "  ?kp <http://www.metaphacts.com/ontology/fields#xsdDatatype> ?datatype . \n" +
            "} ";

        TupleQuery tupleQuery = con.prepareTupleQuery(QueryLanguage.SPARQL, queryString);
        List<BindingSet> res = QueryResults.asList(tupleQuery.evaluate());
        return res.stream().map(bs -> {
            IRI kp = (IRI)bs.getBinding("kp").getValue();
            String datatype = bs.getBinding("datatype").getValue().stringValue();
            return new KP(kp.stringValue(), kp.getLocalName(), datatype);
        }).collect(Collectors.toList());
    }
}
