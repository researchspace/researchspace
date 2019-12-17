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

import java.io.OutputStream;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.ws.rs.core.MediaType;

import org.apache.commons.lang3.StringUtils;
import org.eclipse.rdf4j.common.lang.FileFormat;
import org.eclipse.rdf4j.common.lang.service.FileFormatServiceRegistry;
import org.eclipse.rdf4j.query.BooleanQuery;
import org.eclipse.rdf4j.query.GraphQuery;
import org.eclipse.rdf4j.query.MalformedQueryException;
import org.eclipse.rdf4j.query.Operation;
import org.eclipse.rdf4j.query.TupleQuery;
import org.eclipse.rdf4j.query.Update;
import org.eclipse.rdf4j.query.parser.QueryParserUtil;
import org.eclipse.rdf4j.query.resultio.BooleanQueryResultFormat;
import org.eclipse.rdf4j.query.resultio.BooleanQueryResultWriter;
import org.eclipse.rdf4j.query.resultio.BooleanQueryResultWriterFactory;
import org.eclipse.rdf4j.query.resultio.BooleanQueryResultWriterRegistry;
import org.eclipse.rdf4j.query.resultio.TupleQueryResultFormat;
import org.eclipse.rdf4j.query.resultio.TupleQueryResultWriter;
import org.eclipse.rdf4j.query.resultio.TupleQueryResultWriterFactory;
import org.eclipse.rdf4j.query.resultio.TupleQueryResultWriterRegistry;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.eclipse.rdf4j.rio.RDFWriter;
import org.eclipse.rdf4j.rio.RDFWriterFactory;
import org.eclipse.rdf4j.rio.RDFWriterRegistry;

import com.google.common.collect.Sets;
import com.metaphacts.api.dto.querytemplate.AskQueryTemplate;
import com.metaphacts.api.dto.querytemplate.ConstructQueryTemplate;
import com.metaphacts.api.dto.querytemplate.QueryTemplate;
import com.metaphacts.api.dto.querytemplate.SelectQueryTemplate;
import com.metaphacts.api.dto.querytemplate.UpdateQueryTemplate;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class SparqlUtil {
    public static enum SparqlOperation{
        SELECT, ASK, DESCRIBE, CONSTRUCT, UPDATE
    }
    
    private static Pattern ASK_PATTERN = Pattern.compile("ASK(\\s+WHERE)?\\s*\\{", Pattern.CASE_INSENSITIVE);

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
    
    public static SparqlOperation getOperationType(QueryTemplate<?> template) {
        if (template instanceof SelectQueryTemplate) {
            return SparqlOperation.SELECT;
        } else if (template instanceof ConstructQueryTemplate) {
            return SparqlOperation.CONSTRUCT;
        } else if (template instanceof AskQueryTemplate) {
            return SparqlOperation.ASK;
        } else if (template instanceof UpdateQueryTemplate) {
            return SparqlOperation.UPDATE;
        } else {
            throw new IllegalStateException(
                    "template is neither a Select-, Construct-, Ask-, or Update template.");
        }
        
    }

    // matches case-insensitive and multi-line groups that
    // start with prefix, one to infinite whitespace, followed by any or none character (incl. unicode),
    // followed by a ":", followed zero to infinite whitespace, followed by any character enclosed by "<" and ">"
    // Note: this regex is not strict w.r.t to the standard defined at https://www.w3.org/TR/sparql11-query/#rPN_PREFIX
    // e.g. it would allow a prefix starting with a digit
    // However, as we use it for duplicate checks only (i.e. whether to prepend platform defined prefixes or not) we
    // are relaxing the standard.
    static final Pattern PREFIX_PATTERN = Pattern.compile("prefix\\s+([^:\\s]*)[:]{0,}\\s*[\\<]{1}[^\\<]*[\\>]{1}",
            Pattern.CASE_INSENSITIVE | Pattern.MULTILINE);
    /**
     * Extracts a set of prefixes from a SPARQL operation string using regex.
     * @param operationString
     * @return
     */
    static Set<String> extractPrefixes(String operationString) {
        
        // check if the operation string actually contains "PREFIX" before applying the regex
        // => most queries will not define any prefixes but rely on the namespace definitions
        // of the platform
        if (!operationString.toLowerCase().contains("prefix")) {
            return Collections.emptySet();
        }
        
        Set<String> prefixes = Sets.newHashSet();
        Matcher prefixMatcher = PREFIX_PATTERN.matcher(operationString);
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
     * @return a set of mime types expressed as strings
     */
    public static Set<String> getAllRegisteredWriterMimeTypes() {
        HashSet<String> all = Sets.newHashSet();
        all.addAll(getRegisteredMimeTypesForQueryType(RDFWriterRegistry.getInstance()));
        all.addAll(getRegisteredMimeTypesForQueryType(
                TupleQueryResultWriterRegistry.getInstance()));
        all.addAll(getRegisteredMimeTypesForQueryType(
                BooleanQueryResultWriterRegistry.getInstance()));
        return all;
    }
    
    /**
     * Return registered mime types for a specific SPARQL operation type 
     * using the registry of available file formats for this type.
     * 
     * @param registry query type-specific {@link FileFormatServiceRegistry}.  
     * 
     * @return a set of mime types expressed as strings
     */
    public static <F extends FileFormat> Set<String> getRegisteredMimeTypesForQueryType(
            FileFormatServiceRegistry<F, ?> registry) {
        Set<String> res = Sets.newHashSet();
        for (F format : registry.getKeys()) {
            res.addAll(format.getMIMETypes());
        }
        return res;
    }
    
    
    public static TupleQueryResultWriter getTupleQueryResultWriterForAcceptedMediaTypes(
            OutputStream output, 
            List<MediaType> acceptedMediaTypes,
            TupleQueryResultFormat defaultFormat) {
        TupleQueryResultWriterRegistry resultWriterRegistry = TupleQueryResultWriterRegistry.getInstance();
        TupleQueryResultFormat rdfFormat = (TupleQueryResultFormat)getFileFormatForAcceptedMediaTypes(
                resultWriterRegistry, acceptedMediaTypes, defaultFormat);
        Optional<TupleQueryResultWriterFactory> writerFactory 
                = resultWriterRegistry.get(rdfFormat);
        return writerFactory.get().getWriter(output);
    }
    
    public static BooleanQueryResultWriter getBooleanQueryResultWriterForAcceptedMediaTypes(
            OutputStream output, 
            List<MediaType> acceptedMediaTypes,
            BooleanQueryResultFormat defaultFormat) {
        BooleanQueryResultWriterRegistry resultWriterRegistry = BooleanQueryResultWriterRegistry.getInstance();
        BooleanQueryResultFormat rdfFormat = (BooleanQueryResultFormat)getFileFormatForAcceptedMediaTypes(
                resultWriterRegistry, acceptedMediaTypes, defaultFormat);
        Optional<BooleanQueryResultWriterFactory> writerFactory 
                = resultWriterRegistry.get(rdfFormat);
        return writerFactory.get().getWriter(output);
    }
    
    public static RDFWriter getRDFWriterForAcceptedMediaTypes(
            OutputStream output, 
            List<MediaType> acceptedMediaTypes,
            RDFFormat defaultFormat) {
        RDFWriterRegistry resultWriterRegistry = RDFWriterRegistry.getInstance();
        RDFFormat rdfFormat = (RDFFormat)getFileFormatForAcceptedMediaTypes(
                resultWriterRegistry, acceptedMediaTypes, defaultFormat);
        Optional<RDFWriterFactory> writerFactory 
                = resultWriterRegistry.get(rdfFormat);
        return writerFactory.get().getWriter(output);
    }
    
    
    static <F extends FileFormat> F getFileFormatForAcceptedMediaTypes(
            FileFormatServiceRegistry<F, ?> registry,
            List<MediaType> acceptedMediaTypes,
            F defaultFormat) {
        Optional<F> rdfFormatOptional = Optional.empty();
        for (MediaType mediaType : acceptedMediaTypes) {
            rdfFormatOptional = registry
                    .getFileFormatForMIMEType(mediaType.toString());
            if (rdfFormatOptional.isPresent()) {
                break; 
            }
        }
        
        return rdfFormatOptional.orElse(defaultFormat);
    }
    
    /**
     * Checks whether the query is empty
     * (every line is either empty or is a commentary)
     * 
     * @param queryString
     * @return
     */
    public static boolean isEmpty(String queryString) {
        String[] lines = queryString.split("\n");
        String[] tokens;
        for (String line : lines) {
            tokens = line.split("#", 2);
            if (!StringUtils.isEmpty(tokens[0].trim())) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * Transforms a given ASK query ASK WHERE { ... } into an equivalent SELECT query
     * SELECT * WHERE { ... } LIMIT 1
     * 
     * @param askQueryString
     * @return
     */
    public static String transformAskToSelect(String askQueryString) {
        Matcher matcher = ASK_PATTERN.matcher(askQueryString);
        if (matcher.find()) {
            return matcher.replaceFirst("SELECT * WHERE {") + " LIMIT 1";
        } 
        throw new IllegalArgumentException("Input is not a proper ASK query");
    }
    
}
