/*
 * Copyright (C) 2015-2017, metaphacts GmbH
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

package com.metaphacts.api.sparql;

import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import com.google.common.collect.Sets;

import org.eclipse.rdf4j.query.BooleanQuery;
import org.eclipse.rdf4j.query.GraphQuery;
import org.eclipse.rdf4j.query.MalformedQueryException;
import org.eclipse.rdf4j.query.Operation;
import org.eclipse.rdf4j.query.TupleQuery;
import org.eclipse.rdf4j.query.Update;
import org.eclipse.rdf4j.query.parser.QueryParserUtil;
import org.eclipse.rdf4j.query.resultio.BooleanQueryResultWriterRegistry;
import org.eclipse.rdf4j.query.resultio.QueryResultFormat;
import org.eclipse.rdf4j.query.resultio.TupleQueryResultWriterRegistry;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.eclipse.rdf4j.rio.RDFWriterRegistry;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class SparqlUtil {
    public static enum SparqlOperation{
        SELECT, ASK, DESCRIBE, CONSTRUCT, UPDATE
    }

    /**
     * Determines the query type without parsing the query by simply removing the query prolog
     * (prefixes etc). Alternatively one can parse the operation string using
     * {@link QueryParserUtil#parseOperation(org.eclipse.rdf4j.query.QueryLanguage, String, String)} to
     * safely determine the operation type.
     *
     * @param queryString
     * @return
     * @throws MalformedQueryException
     */
    public static SparqlOperation getOperationType(String queryString) throws MalformedQueryException{
        String queryWithoutProlog = QueryParserUtil.removeSPARQLQueryProlog(queryString).toLowerCase();
        if(queryWithoutProlog.startsWith("select")){
            return SparqlOperation.SELECT;
        }else if(queryWithoutProlog.startsWith("ask")){
            return SparqlOperation.ASK;
        }else if(queryWithoutProlog.startsWith("construct")){
            return SparqlOperation.CONSTRUCT;
        }else if(queryWithoutProlog.startsWith("describe")){
            return SparqlOperation.DESCRIBE;
        }else{
            return SparqlOperation.UPDATE;
        }
    }

    public static SparqlOperation getOperationType(Operation op){
        if(op instanceof TupleQuery){
            return SparqlOperation.SELECT;
        }else if(op instanceof BooleanQuery){
            return SparqlOperation.ASK;
        }else if(op instanceof GraphQuery){
            return SparqlOperation.CONSTRUCT;
        }else if(op instanceof Update){
            return SparqlOperation.UPDATE;
        }else{
            throw new IllegalStateException("QueryString is neither a Tuple-, Boolean-, Graph- or Update Operation.");
        }
    }

    /**
     * Extracts a set of prefixes from a SPARQL operation string using regex.
     * @param operationString
     * @return
     */
    public static Set<String> extractPrefixes(String operationString){
        Set<String> prefixes = Sets.newHashSet();
        // matches case-insensitive and multi-line groups that
        // start with prefix, one to infinite whitespace, followed by any or none character,
        // followed by a ":", followed zero to infinite whitespace, followed by any character enclosed by "<" and ">"
        Matcher prefixMatcher = Pattern.compile("prefix\\s+([a-z]*)[:]{0,}\\s*[\\<]{1}[^\\<]*[\\>]{1}", Pattern.CASE_INSENSITIVE | Pattern.MULTILINE)
                .matcher(operationString);
        while (prefixMatcher.find()) {
            prefixes.add(prefixMatcher.group(1));
        }
        return prefixes;
    }

    /**
     * Prepends supplied prefixes to the given operationString. Prefixes from the supplied prefixMap
     * will be ignored, if prefixes are already used in the supplied operationString i.e. prefixes
     * defined as part of the query will always overwrite complementary prefixes added by the system.
     *
     * @param operationString
     *            - any SPARQL query or update operation string
     * @param prefixMap
     *            map of prefix - namespace values
     * @return
     */
    public static String prependPrefixes(String operationString, Map<String,String> prefixMap){
        Set<String> existingPrefixes = extractPrefixes(operationString);
        StringBuilder sb = new StringBuilder();
        for(Map.Entry<String, String> e : prefixMap.entrySet()){
           if(!existingPrefixes.contains(e.getKey())){
               sb.append("PREFIX ");
               sb.append(e.getKey());
               sb.append(": <");
               sb.append(e.getValue());
               sb.append(">\n");
           }
        }
        return sb.toString()+operationString;
    }

    /**
     * Returns a set of all mime types for all registered parsers including
     * text/html.
     *
     * @return
     */
    public static Set<String> getAllRegisteredWriterMimeTypes() {
        HashSet<String> all = Sets.newHashSet();
        for(RDFFormat format : RDFWriterRegistry.getInstance().getKeys())
            all.addAll(format.getMIMETypes());
        for(QueryResultFormat format : TupleQueryResultWriterRegistry.getInstance().getKeys())
            all.addAll(format.getMIMETypes());
        for(QueryResultFormat format : BooleanQueryResultWriterRegistry.getInstance().getKeys())
            all.addAll(format.getMIMETypes());

        return all;
    }
}
