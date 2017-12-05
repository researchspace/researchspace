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

package com.metaphacts.config;

import java.io.File;
import java.io.UnsupportedEncodingException;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import java.net.URLEncoder;

import org.apache.commons.configuration2.AbstractConfiguration;
import org.apache.commons.configuration2.PropertiesConfiguration;
import org.apache.commons.configuration2.builder.FileBasedConfigurationBuilder;
import org.apache.commons.configuration2.event.ConfigurationEvent;
import org.apache.commons.configuration2.event.EventListener;
import org.apache.commons.configuration2.ex.ConfigurationException;
import org.apache.commons.configuration2.sync.LockMode;
import org.apache.commons.lang3.StringUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.shiro.SecurityUtils;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Namespace;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleNamespace;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;

import com.google.common.base.Throwables;
import com.google.common.collect.ImmutableMap;
import com.google.common.collect.Lists;
import com.google.common.collect.Maps;
import com.google.common.collect.Sets;
import com.metaphacts.security.AnonymousUserFilter;
import com.metaphacts.templates.TemplateUtil;
import com.metaphacts.vocabulary.PLATFORM;

/**
 * @author Michael Schmidt <ms@metaphacts.com>
 */
public class NamespaceRegistry extends AbstractConfiguration{
    
    private static final Logger logger = LogManager.getLogger(NamespaceRegistry.class);
    
    static final String DFLT_PLATFORM_NAMESPACE = "http://www.metaphacts.com/ontologies/platform#";
    static final String DFLT_HELP_NAMESPACE = "http://help.metaphacts.com/resource/";
    static final String DFLT_ADMIN_NAMESPACE = "http://www.metaphacts.com/resource/admin/";
    static final String DFLT_USER_NAMESPACE = "http://www.metaphacts.com/resource/user/";
    static final String DFLT_DEFAULT_NAMESPACE = "http://www.metaphacts.com/resource/";
    
    /**
     * The following namespaces should never be changed during runtime.
     */
    public static class RuntimeNamespace{
        public static final String EMPTY = ""; //equals default
        public static final String DEFAULT = "Default"; 
        public static final String USER = "User"; 
        public static final String PLATFORM = "Platform"; 
        public static final String HELP = "Help"; 
        public static final String ADMIN = "Admin";
        
        public static final List<String> ALL = Lists.<String>newArrayList(EMPTY, DEFAULT,PLATFORM,USER,HELP,ADMIN);
    }
    
    private FileBasedConfigurationBuilder<PropertiesConfiguration> store;

    
    /**
     * Map where namespaces are used as keys and prefixes are the values.
     */
    private Map<String,String> nsMap = Maps.newConcurrentMap();
    /**
     * Map where prefixes are used as keys and namespaces are the values.
     */
    private Map<String,String> prefixMap = Maps.newConcurrentMap();
    
    private ValueFactory vf;

    public NamespaceRegistry(File configDirectory) throws ConfigurationException {
        logger.info("Initalizing NamespaceRegistry.");
        this.vf = SimpleValueFactory.getInstance();
        //TODO
        this.store = ConfigurationUtil.getPropertiesConfigFromFile(new File(configDirectory,"/namespaces.prop"));
        initializeDefaults();
        this.store.addEventListener(ConfigurationEvent.ANY, new EventListener<ConfigurationEvent>() {

            @Override
            public void onEvent(ConfigurationEvent event) {
                // we need to work with a copy due to concurrency
                HashMap<String, String> nsMapCopy = Maps.newHashMap(nsMap);
                if(event.isBeforeUpdate()){
                    if(RuntimeNamespace.ALL.contains(event.getPropertyName())){
                        throw new ProtectedNamespaceDeletionException("Not allowed to change runtime namespaces.");
                    }
                    if(nsMapCopy.containsKey(event.getPropertyValue()) 
                            && nsMapCopy.get(event.getPropertyValue()).equalsIgnoreCase(event.getPropertyName())
                    ){
                                logger.warn(
                                        "Namespace {}:<{}> does already exist and will replaced by exaclty the same namespace.",
                                        event.getPropertyName(),
                                        event.getPropertyValue());
                    }
                    if(Character.isUpperCase((event.getPropertyName().charAt(0)))){
                        throw new ProtectedNamespaceDeletionException(
                            "Prefixes starting with a capital letter are runtime namespaces and can not be changed or created during runtime.");
                    }
                }

                if(!event.isBeforeUpdate()){
//                    if(EventType.isInstanceOf(event.getEventType(),SET_PROPERTY)){
                            synchMap();
//                    }
                }

            }
        });
        synchMap();
    }
    
    private void initializeDefaults(){
        this.setProperty(RuntimeNamespace.PLATFORM, getPlatformNamespace());
        this.setProperty(RuntimeNamespace.HELP, getHelpNamespace());
        this.setProperty(RuntimeNamespace.USER, getUserNamespace());
        this.setProperty(RuntimeNamespace.ADMIN, getAdminNamespace());
        this.setProperty(RuntimeNamespace.DEFAULT, getDefaultNamespace());
        this.setProperty(RuntimeNamespace.EMPTY, getDefaultNamespace());
    }
    
    public Set<String> getPrefixes(){
        return Sets.newHashSet(this.getKeys());
    }
    
    public Optional<String> getNamespace(String prefix){
        if(!this.containsKey(prefix)){
            return Optional.<String>empty();
        }
        return Optional.of(this.getString(prefix));
    }
    
    public Optional<String> getPrefix(String namespace){
       return Optional.ofNullable(this.nsMap.get(namespace));
    }
    
    /**
     * @return a map with prefixes being used as keys and namespaces are the values
     */
    public ImmutableMap<String, String> getPrefixMap(){
       return ImmutableMap.copyOf(this.prefixMap);
    }

    /**
     * @return a map with namespaces being used as keys and prefixes are the values
     */
    public ImmutableMap<String, String> getNamespaceMap(){
        return ImmutableMap.copyOf(this.nsMap);
    }

    public Set<Namespace> getRioNamespaces() {
        return this.prefixMap
          .entrySet()
          .stream()
          .map(e -> new SimpleNamespace(e.getKey(), e.getValue()))
          .collect(Collectors.toSet());
    }

    public Optional<String> getPrefixedIRI(IRI iri){
        return getPrefix(iri.getNamespace()).flatMap( prefix -> Optional.of(prefix+":"+iri.getLocalName()));
    }
    
    public void set(String prefix, String namespace) throws ConfigurationException, ProtectedNamespaceDeletionException{
            setProperty(prefix, namespace);
    }
    public void delete(String prefix){
        clearProperty(prefix);
    }
    
    public Optional<IRI> resolveToIRI(String iri) {
        if (iri.startsWith("<")) {
            if (!iri.endsWith(">")) {
                throw new IllegalArgumentException(String.format(
                    "Missing enclosing '>' in full IRI '%s'", iri));
            }
            String fullIRI = iri.substring(1, iri.length() - 1);
            return Optional.ofNullable(vf.createIRI(fullIRI));
        } else {
            return resolveTemplateOrPrefixedIRI(iri);
        }
    }

    public Optional<IRI> resolveTemplateOrPrefixedIRI(String prefixedIRI) {
        final boolean isTemplate =  prefixedIRI.startsWith(TemplateUtil.TEMPLATE_PREFIX);

        final String plainLocation = isTemplate
                ? prefixedIRI.substring(TemplateUtil.TEMPLATE_PREFIX.length())
                : prefixedIRI;
        /*
         * This is the cases where a client (front-end) may ask for something like
         * Template:http://www.w3.org/2000/01/rdf-schema#Resource . 
         * In most cases we aim for not overloading prefixedIRIs in the UI, however, however
         * for the IRI navigation we need to do some guessing.
         */
        if(isTemplate){
            if(getPrefix(vf.createIRI(plainLocation).getNamespace()).isPresent()){
                return Optional.ofNullable(vf.createIRI(prefixedIRI));
            }
        }

        /*
         * Return here if it doesn't even fulfill syntactic prerequisites for a prefixed IRI.
         */
        if(!looksLikePrefixedIri(plainLocation)){
            return isTemplate 
                    ? Optional.of(vf.createIRI(TemplateUtil.TEMPLATE_PREFIX + getDefaultNamespace(), plainLocation))
                    : Optional.of(vf.createIRI(getDefaultNamespace(), plainLocation));
        }
                
        String prefix = StringUtils.substringBefore(plainLocation, ":");
        String localName = StringUtils.substringAfter(plainLocation, ":");
        if(localName==null || localName.contains("/") || localName.contains("#")){
            throw new IllegalArgumentException(String.format(
                "Local name '%s' must not be empty or contain any # or /", localName));
        }
        
        String namespace = this.getString(prefix);
        if(namespace==null){
            return Optional.empty();
        }
        if(isTemplate){ // if requested prefixed IRI was special Template: prefixed, we need to prepend it again  
            return Optional.of(vf.createIRI(TemplateUtil.TEMPLATE_PREFIX + namespace, localName));
        }
        return Optional.of(vf.createIRI(namespace, localName));
    }
    
    /**
     * Does some syntactic checks to determine whether a string can in principle be a prefixed IRI
     * string. If the method returns true, then this does not necessarily mean that it is a prefixed
     * IRI string and can be resolved to against known namespace.
     * 
     * <p>
     * This method should be used with caution and and it is highly recommended to be explicit as
     * possible i.e. as in turtle syntax surround full IRIs with < > to distinguish them explicitly
     * from prefixed IRIs.
     * </p>
     * @param prefixedIri
     * @return
     */
    public boolean looksLikePrefixedIri(String prefixedIri){
        return (prefixedIri.split(":").length==2 || prefixedIri.endsWith(":"));
    }
    
    private synchronized void synchMap(){
        this.lock(LockMode.READ);
        this.nsMap.clear();
        this.prefixMap.clear();
        Iterator<String> it = this.getKeys();
        while(it.hasNext()){
            String k = it.next();
            this.nsMap.put(this.getString(k), k);
            this.prefixMap.put(k, this.getString(k));
        }
        this.unlock(LockMode.READ);
        
    }

    
    public String getPlatformNamespace(){
        return getString(RuntimeNamespace.PLATFORM, DFLT_PLATFORM_NAMESPACE);
    }
    public String getHelpNamespace(){
        return getString(RuntimeNamespace.HELP, DFLT_HELP_NAMESPACE);
    }
    public String getAdminNamespace(){
        return getString(RuntimeNamespace.ADMIN, DFLT_ADMIN_NAMESPACE);
    }
    public String getUserNamespace(){
        return getString(RuntimeNamespace.USER, DFLT_USER_NAMESPACE);
    }
    public String getDefaultNamespace(){
        return getString(RuntimeNamespace.DEFAULT, DFLT_DEFAULT_NAMESPACE);
    }

    public IRI getUserIRI(){
        String userName = (String) SecurityUtils.getSubject().getPrincipal();
        if (StringUtils.isEmpty(userName)){
            userName = "unknown";
        }
        return getUserIRI(userName);
    }

    public IRI getUserIRI(String userName){
        if(userName==AnonymousUserFilter.ANONYMOUS_PRINCIPAL){
            return PLATFORM.ANONYMOUS_USER_INDIVIDUAL;
        }else  {
            try {
              return vf.createIRI(this.getUserNamespace(), URLEncoder.encode(userName, "UTF-8"));
            } catch (UnsupportedEncodingException e) {
                throw Throwables.propagate(e);
            }
        }
    }
    
    private PropertiesConfiguration getConfig() {
        try {
            return this.store.getConfiguration();
        } catch (ConfigurationException e) {
            throw Throwables.propagate(e);
        }
    }
    
    /**
     * BELOW METHOD IMPLEMENTATIONS FOR {@link AbstractConfiguration}
     */
    
    @Override
    protected void setPropertyInternal(String key, Object value) {
        
        try{
            this.lock(LockMode.WRITE);
            if(!this.containsKey(key)){
                this.addPropertyDirect(key, value);
                this.store.save();
            }else{
                this.getConfig().setProperty(key, value);
                this.store.save();
            }

        } catch (Exception e) {
            throw Throwables.propagate(e);
        }finally{
           this.unlock(LockMode.WRITE);
        }
    };
    
    @Override
    protected void addPropertyDirect(String arg0, Object arg1) {
        
        try{
            this.lock(LockMode.WRITE);
            this.getConfig().addProperty(arg0, arg1);;
            this.store.save();
        } catch (Exception e) {
            throw Throwables.propagate(e);
        }finally{
           this.unlock(LockMode.WRITE);
        }
    }

    @Override
    protected void clearPropertyDirect(String arg0) {
        if(!this.getConfig().containsKey(arg0)){
            return;
        }
        
        try{
            this.lock(LockMode.WRITE);
            this.getConfig().clearProperty(arg0);
            this.store.save();
            this.store.resetResult();
        } catch (Exception e) {
            throw Throwables.propagate(e);
        }finally{
            this.unlock(LockMode.WRITE);
        }
       
    }

    @Override
    protected boolean containsKeyInternal(String arg0) {
        return this.getConfig().containsKey(arg0);
    }

    @Override
    protected Iterator<String> getKeysInternal() {
        return this.getConfig().getKeys();
    }

    @Override
    protected Object getPropertyInternal(String arg0) {
        return this.getConfig().getProperty(arg0);
    }

    @Override
    protected boolean isEmptyInternal() {
        return this.getConfig().isEmpty();
    }
    
    
    public static class ProtectedNamespaceDeletionException extends RuntimeException {

        private static final long serialVersionUID = -8110257063370601790L;
        
        public ProtectedNamespaceDeletionException() {
            super();
        }
        
        public ProtectedNamespaceDeletionException(String s) {
            super(s);
        }
        
    }

}
