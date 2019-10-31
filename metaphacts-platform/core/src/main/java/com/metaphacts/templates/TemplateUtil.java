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

package com.metaphacts.templates;

import java.io.IOException;
import java.util.LinkedHashSet;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.apache.commons.lang.StringUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;

import com.github.jknack.handlebars.Handlebars;
import com.github.jknack.handlebars.HandlebarsException;
import com.github.jknack.handlebars.TagType;
import com.github.jknack.handlebars.Template;
import com.github.jknack.handlebars.io.TemplateLoader;
import com.github.jknack.handlebars.io.TemplateSource;
import com.google.common.base.Throwables;
import com.google.common.collect.Sets;
import com.metaphacts.cache.TemplateIncludeCache;
import com.metaphacts.config.NamespaceRegistry;

/**
 * Convenience to handle handlebars templates. In particular, generating and extracting includes
 * for the template mechanism.
 * 
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class TemplateUtil {

    private static final Pattern INCLUDE_PATTERN = Pattern.compile("\\[\\[\\#?\\>\\s?\\\"?([^\"\\]\\s]*)\\\"?\\s?.*?\\]\\]");
    public static final String TEMPLATE_PREFIX = "Template:";
    private static final Logger logger = LogManager.getLogger(TemplateUtil.class);
    
    /**
     * Converts a set of {@link Resource}s to template identifiers by prepending the "Template:" prefix
     * <code>["foaf:Person","foaf:Agent"]</code> Will be converted into:
     * <code>["Template:foaf:Person","Template:foaf:Agent"]</code>
     * 
     * @param set Set of resources to convert into to template identifiers
     * @return Set of syntactic handlebars.java include string
     */
    public static LinkedHashSet<String> convertResourcesToTemplateIdentifiers(Set<Resource> set) {
        LinkedHashSet<String> includes = Sets.newLinkedHashSet();
        for (Resource r : set) {
            includes.add(convertResourceToTemplateIdentifier(r));
        }
        return includes;
    }
    
    /**
     * Converts the specified resource into a template identifier e.g. foaf:Agent will be converted
     * into Template:foaf:Agent
     * 
     * @param r
     * @return
     */
    public static String convertResourceToTemplateIdentifier(Resource r){
        StringBuilder sb = new StringBuilder();
        sb.append(TEMPLATE_PREFIX);
        sb.append(r.stringValue());
        return sb.toString();
    }

    /**
     * Calls {@link #extractIncludeStrings(String)} and converts IRI strings to {@link IRI}
     * including resolving prefixed IRIs to full IRIs using the supplied {@link NamespaceRegistry}.
     * 
     * @param rawTemplateText Any handlebars.java string.
     * @param ns {@link NamespaceRegistry} to resolve prefixed include resources to full
     *            {@link IRI}s
     * @return Set of {@link IRI}s 
     */
    public static Set<IRI> extractIncludeIRIs(String rawTemplateText, NamespaceRegistry ns) {
        Set<IRI> includeResources = Sets.newHashSet();
        if (StringUtils.isEmpty(rawTemplateText)) {
            return includeResources;
        }
        
        for (String resourceString : extractIncludeStrings(rawTemplateText)) {
            Optional<IRI> optionalIri = resourceString.trim().startsWith("http") 
                    ? Optional.of(SimpleValueFactory.getInstance().createIRI(resourceString))
                    : ns.resolveToIRI(resourceString);
            
            optionalIri.map( iri -> includeResources.add(iri));
        }
        return includeResources;
    }
    
    /**
     * <p>Extracts all includes from a raw template text.</p>
     * <strong>Example Input:</strong><br>
     *  <code> "Some  [[> foaf:Agent ]] template include [[> foaf:Person ]] template" </code><br>
     * <strong>Output:</strong><br>
     * <code>["foaf:Agent","foaf:Person"]</code>
     * 
     * @param rawTemplateText a set of included strings or empty set
     * @return set of include strings extracted from the supplied string
     */
     /* package private for testing  */ 
    static Set<String> extractIncludeStrings(String rawTemplateText) {
        Set<String> matches = Sets.newLinkedHashSet();
        if (StringUtils.isEmpty(rawTemplateText)) {
            return matches;
        }
        final Matcher m = INCLUDE_PATTERN.matcher(rawTemplateText);
        while (m.find()) {
            matches.add(m.group(1).trim());
        }
        return matches;
    }
    
    /**
     * Tries to resolve a template from the specified location through the supplied template loader.
     * Catches {@link IOException}s silently (meaning not template exists) and wraps the resulting
     * {@link TemplateSource} into an {@link Optional}.
     * 
     * @param loader
     * @param location
     * @return
     */
    public static Optional<TemplateSource> getTemplateSource(TemplateLoader loader, String location) {
        TemplateSource source = null;
        try {
            source = loader.sourceAt(location);
        } catch (FromStorageLoader.TemplateNotFoundException e) {
            // silently catch exception i.e. means that there is not template
        } catch (Exception e) {
            logger.error("Unexpected error while sourcing the template {} : {}", location, e);
            throw new RuntimeException(e); // throw all other errors
        }
        return Optional.ofNullable(source);
    }

    /**
     * Returns the identifier of the first template that can is source-able (exists) from the supplied, ordered set of template
     * location strings. Returns an empty optional if none of the templates can be loaded.
     * 
     * @param loader
     * @param orderedSetOfLocations
     * @return
     */
    public static Optional<String> findFirstExistingTemplate(TemplateLoader loader, LinkedHashSet<String> orderedSetOfLocations){
        return orderedSetOfLocations.stream().filter( 
                l -> TemplateUtil.getTemplateSource(loader, l).isPresent()
               ).findFirst();
    }
    
    /**
     * Returns for a specified {@link TemplateContext} all template identifiers 
     * @param tc
     * @param includeCache
     * @return
     */
    public static LinkedHashSet<String> getRdfTemplateIncludeIdentifiers(Value pageId, TemplateContext tc, TemplateIncludeCache includeCache){
        Value value = pageId;
        if(!(value instanceof IRI)){
            logger.warn(value + " is not a IRI. Currently only templates for IRIs are supported.");
            return Sets.<String>newLinkedHashSet();
        }
        Set<Resource> set = includeCache.getTypesForIncludeScheme(tc.getRepository(), (IRI) value, tc.getNamespaceRegistry());
        if(set.isEmpty()){
            return  Sets.<String>newLinkedHashSet();
        }
        return TemplateUtil.convertResourcesToTemplateIdentifiers(set);
    }
    
    /**
     * Iterates of the the supplied, ordered set of applicable templates for the specified {@link TemplateContext}.
     * Returns the first (existing) template as compiled string.
     * 
     * @param tc
     * @param appplicableTemplates
     * @param handlebars
     * @return
     * @throws MissingHelperException
     * @throws IllegalArgumentException
     */
    public static Optional<String> compileAndReturnFirstExistingTemplate(
            TemplateContext tc, LinkedHashSet<String> appplicableTemplates, Handlebars handlebars
    ) throws MissingHelperException, IllegalArgumentException{
        try {      
            // returns the first template that can be loaded (exists) from the ordered set of template candidates
            // no concatenation
            for (String location : appplicableTemplates) {
                Optional<TemplateSource> source = TemplateUtil.getTemplateSource(handlebars.getLoader(), location);
                if(source.isPresent()){
                    Template template = handlebars.compile(source.get());
                    if (logger.isTraceEnabled()) {
                        logger.trace("Found the following handlebar tags {} in template: {}", template.collect(TagType.values()), location);
                    }
                    return Optional.ofNullable(template.apply(tc));
                }  
            }
        } catch (Exception e) {
            logger.error("Error compiling template", e);
            if (e.getCause() != null && e.getCause() instanceof ClassCastException) {
                throw new IllegalArgumentException("Probably wrong order or type of helper options:" + e.getMessage());
            } else if (e.getCause() != null && e.getCause() instanceof MissingHelperException) {
                throw (MissingHelperException) e.getCause();
            } else if (e instanceof HandlebarsException) {
                throw new IllegalArgumentException(e.getMessage());
            }
            // propagate all other errors
            throw new RuntimeException(e);
        }
        return Optional.<String>empty();
    }
    
}
