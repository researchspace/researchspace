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

package com.metaphacts.services;

import java.security.MessageDigest;

import javax.inject.Inject;
import javax.inject.Singleton;

import com.google.common.base.Throwables;
import org.apache.commons.codec.binary.Hex;
import org.apache.commons.lang3.RandomStringUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.LinkedHashModel;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.TupleQuery;
import org.eclipse.rdf4j.query.TupleQueryResult;
import org.eclipse.rdf4j.repository.RepositoryConnection;

import com.google.common.collect.Sets;
import com.metaphacts.api.sparql.SparqlOperationBuilder;
import com.metaphacts.data.rdf.PointedGraph;
import com.metaphacts.data.rdf.container.LDPImplManager;
import com.metaphacts.data.rdf.container.URLMinifierContainer;
import com.metaphacts.repository.RepositoryManager;
import com.metaphacts.repository.MpRepositoryProvider;
import com.metaphacts.vocabulary.LDP;


/**
 * Service for persistence of short link key and corresponding URL bimap in triplestore
 * 
 * @author Denis Ostapenko
 */
@Singleton
public class URLMinifierService {
    private static final Logger logger = LogManager.getLogger(URLMinifierService.class);

    public static final int KEY_LENGTH = 5;

    protected static final ValueFactory vf = SimpleValueFactory.getInstance();
    private static final String ITEM_IRI_STRING = "http://www.metaphacts.com/ontologies/platform#urlMinifierContainerItem";
    private static final String HAS_URL_STRING = "http://www.metaphacts.com/ontologies/platform#hasURL";
    private static final IRI HAS_URL = vf.createIRI(HAS_URL_STRING);
    private static final String HAS_KEY_STRING = "http://www.metaphacts.com/ontologies/platform#hasKey";
    private static final IRI HAS_KEY = vf.createIRI(HAS_KEY_STRING);

    @Inject
    private RepositoryManager repositoryManager;

    private String queryBimap(String queryFor, String key) {
        String knownKey = queryFor.equals("key") ? "url" : "key";
        String query = "SELECT ?" + queryFor + " WHERE {" +
            "?item <" + HAS_KEY_STRING + "> ?key ." +
            "?item <" + HAS_URL_STRING + "> ?url ." +
            "}";
        SparqlOperationBuilder<TupleQuery> builder = SparqlOperationBuilder.create(query, TupleQuery.class);
        builder.setBinding(knownKey, vf.createLiteral(key));

        String resultValue = null;
        try (RepositoryConnection connection = repositoryManager.getAssetRepository().getConnection()) {
            TupleQuery tq = builder.build(connection);
            try (TupleQueryResult result = tq.evaluate()){
                while (result.hasNext()) {
                    BindingSet next = result.next();
                    // Workaround for rdf4j bug: Don't return value here
                    // because of probable read of another request thread data in TupleQueryResult.close()
                    resultValue = next.getBinding(queryFor).getValue().stringValue();
                }
            }
        }
        return resultValue;
    }

    public String queryDBByKey(String key) {
        return queryBimap("url", key);
    }

    public String queryDBByURL(String url) {
        return queryBimap("key", url);
    }

    public void addKeyURL(String key, String url) {
        try {
            URLMinifierContainer urlMinifierContainer = (URLMinifierContainer) LDPImplManager.getLDPImplementation(
                URLMinifierContainer.IRI,
                Sets.newHashSet(LDP.Container, LDP.Resource), 
                new MpRepositoryProvider(this.repositoryManager, RepositoryManager.ASSET_REPOSITORY_ID)
            );
            String urlHash = Hex.encodeHexString(MessageDigest.getInstance("MD5").digest(url.getBytes()));
            String rootIRIString = ITEM_IRI_STRING + "_" + urlHash;
            IRI rootIRI = vf.createIRI(rootIRIString);
            Model model = new LinkedHashModel();
            model.add(rootIRI, HAS_KEY, vf.createLiteral(key));
            model.add(rootIRI, HAS_URL, vf.createLiteral(url));
            urlMinifierContainer.add(new PointedGraph(rootIRI, model));
        } catch (Exception e) {
            throw Throwables.propagate(e);
        }
    }

    public String randomKey() {
        return RandomStringUtils.randomAlphanumeric(KEY_LENGTH);
    }
}
