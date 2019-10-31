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

package com.metaphacts.config;

import java.io.IOException;
import java.io.InputStream;
import java.io.UnsupportedEncodingException;
import java.util.*;
import java.util.concurrent.ConcurrentMap;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.stream.Collectors;

import java.net.URLEncoder;

import com.google.common.collect.*;
import com.metaphacts.api.sparql.SparqlUtil;
import com.metaphacts.services.storage.StorageUtils;
import com.metaphacts.services.storage.api.*;
import org.apache.commons.configuration2.PropertiesConfiguration;
import org.apache.commons.configuration2.ex.ConfigurationException;
import org.apache.commons.configuration2.io.FileHandler;
import org.apache.commons.io.output.ByteArrayOutputStream;
import org.apache.commons.lang3.StringUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Namespace;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleNamespace;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;

import com.metaphacts.security.AnonymousUserFilter;
import com.metaphacts.security.SecurityService;
import com.metaphacts.templates.TemplateUtil;
import com.metaphacts.vocabulary.PLATFORM;

import javax.inject.Inject;

/**
 * @author Michael Schmidt <ms@metaphacts.com>
 */
public class NamespaceRegistry {
    private static final StoragePath CONFIG_OBJECT_ID = ObjectKind.CONFIG.resolve("namespaces.prop");
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
        public static final String LDP = "LdpBase";

        public static final Set<String> ALL = ImmutableSet.of(EMPTY, DEFAULT, PLATFORM, USER, HELP, ADMIN);
    }

    private static final List<NamespaceRecord> DEFAULT_NAMESPACES = ImmutableList.of(
        new NamespaceRecord(RuntimeNamespace.EMPTY, DFLT_DEFAULT_NAMESPACE),
        new NamespaceRecord(RuntimeNamespace.DEFAULT, DFLT_DEFAULT_NAMESPACE),
        new NamespaceRecord(RuntimeNamespace.USER, DFLT_USER_NAMESPACE),
        new NamespaceRecord(RuntimeNamespace.PLATFORM, DFLT_PLATFORM_NAMESPACE),
        new NamespaceRecord(RuntimeNamespace.HELP, DFLT_HELP_NAMESPACE),
        new NamespaceRecord(RuntimeNamespace.ADMIN, DFLT_ADMIN_NAMESPACE)
    );

    private PlatformStorage platformStorage;
    private ValueFactory vf;

    /**
     * Map where namespaces are used as keys and prefixes are the values.
     */
    private ConcurrentMap<String, NamespaceRecord> nsMap = Maps.newConcurrentMap();
    /**
     * Map where prefixes are used as keys and namespaces are the values.
     */
    private ConcurrentMap<String, NamespaceRecord> prefixMap = Maps.newConcurrentMap();

    @Inject
    public NamespaceRegistry(PlatformStorage platformStorage) throws IOException, ConfigurationException {
        logger.info("Initalizing NamespaceRegistry.");
        this.platformStorage = platformStorage;
        this.vf = SimpleValueFactory.getInstance();
        reloadFromStorage();
    }

    private synchronized Map<String, NamespaceRecord> getNamespaceView() {
        return nsMap;
    }

    private synchronized Map<String, NamespaceRecord> getPrefixView() {
        return prefixMap;
    }

    private void reloadFromStorage() throws IOException, ConfigurationException {
        Map<String, NamespaceRecord> prefixToNs = new LinkedHashMap<>();

        DEFAULT_NAMESPACES.forEach(ns -> prefixToNs.put(ns.getPrefix(), ns));
        prefixToNs.putAll(readNamespacesFromStorage());

        setRuntimeNamespaceMappings(prefixToNs);
    }

    private Map<String, NamespaceRecord> readNamespacesFromStorage() throws IOException, ConfigurationException {
        List<PlatformStorage.FindResult> overrides =
            platformStorage.findOverrides(CONFIG_OBJECT_ID);

        Map<String, NamespaceRecord> prefixToNs = new HashMap<>();
        for (PlatformStorage.FindResult found : overrides) {
            logger.info("Found namespaces in app \"{}\"", found.getAppId());
            ObjectRecord record = found.getRecord();

            PropertiesConfiguration config;
            try (InputStream content = record.getLocation().readContent()) {
                config = ConfigurationUtil.createEmptyConfig();
                FileHandler handler = new FileHandler(config);
                handler.load(content);
            }

            Iterator<String> iterator = config.getKeys();
            while (iterator.hasNext()) {
                String key = iterator.next();
                prefixToNs.put(key,
                    new NamespaceRecord(key, config.getString(key), found.getAppId()));
            }
        }
        return prefixToNs;
    }

    private void setRuntimeNamespaceMappings(Map<String, NamespaceRecord> prefixToNs) {
        ConcurrentMap<String, NamespaceRecord> prefixMap = Maps.newConcurrentMap();
        ConcurrentMap<String, NamespaceRecord> nsMap = Maps.newConcurrentMap();
        prefixToNs.forEach((prefix, ns) -> {
            prefixMap.put(ns.getPrefix(), ns);
            if (!nsMap.containsKey(ns.getIri())) {
                nsMap.put(ns.getIri(), ns);
            }
        });
        synchronized (this) {
            this.prefixMap = prefixMap;
            this.nsMap = nsMap;
        }
    }

    public Optional<NamespaceRecord> getRecordByPrefix(String prefix) {
        return Optional.ofNullable(getPrefixView().get(prefix));
    }

    public List<NamespaceRecord> getRecords() {
        return new ArrayList<>(getPrefixView().values());
    }

    public synchronized void setPrefix(String prefix, IRI iri, String targetAppId) throws IOException, ConfigurationException {
        throwIfNotAllowedToChangeDuringRuntime(prefix);
        rewriteConfig(targetAppId, config -> {
            config.setProperty(prefix, iri.stringValue());
            return true;
        });
        reloadFromStorage();
    }

    public synchronized boolean deletePrefix(String prefix, String targetAppId) throws IOException, ConfigurationException {
        throwIfNotAllowedToChangeDuringRuntime(prefix);
        boolean found = rewriteConfig(targetAppId, config -> {
            if (config.getProperty(prefix) != null) {
                config.clearProperty(prefix);
                return true;
            }
            return false;
        });
        if (found) {
            reloadFromStorage();
        }
        return found;
    }

    private void throwIfNotAllowedToChangeDuringRuntime(String prefix) {
        if (RuntimeNamespace.ALL.contains(prefix)) {
            throw new ProtectedNamespaceDeletionException("Not allowed to change runtime namespaces.");
        }
        if (Character.isUpperCase((prefix.charAt(0)))){
            throw new ProtectedNamespaceDeletionException(
                "Prefixes starting with a capital letter are runtime namespaces and can not be changed or created during runtime.");
        }
    }

    private boolean rewriteConfig(
        String appId, Function<PropertiesConfiguration, Boolean> rewriter
    ) throws IOException, ConfigurationException {
        ObjectStorage storage = platformStorage.getStorage(appId);
        PropertiesConfiguration config = ConfigurationUtil.createEmptyConfig();

        Optional<ObjectRecord> existing = storage.getObject(CONFIG_OBJECT_ID, null);
        if (existing.isPresent()) {
            ObjectRecord record = existing.get();
            try (InputStream content = record.getLocation().readContent()) {
                FileHandler handler = new FileHandler(config);
                handler.load(content);
            }
        }

        if (rewriter.apply(config)) {
            try (ByteArrayOutputStream os = new ByteArrayOutputStream()) {
                new FileHandler(config).save(os);
                storage.appendObject(
                    CONFIG_OBJECT_ID,
                    platformStorage.getDefaultMetadata(),
                    os.toInputStream(),
                    os.size()
                );
            } catch (ConfigurationException e) {
                throw new IOException(e);
            }
            return true;
        }
        return false;
    }

    public Set<String> getPrefixes() {
        return Sets.newHashSet(getPrefixView().keySet());
    }

    public Optional<String> getNamespace(String prefix) {
        NamespaceRecord ns = getPrefixView().get(prefix);
        return ns == null ? Optional.empty() : Optional.of(ns.getIri());
    }

    public Optional<String> getPrefix(String namespace) {
        NamespaceRecord ns = getNamespaceView().get(namespace);
        return ns == null ? Optional.empty() : Optional.of(ns.getPrefix());
    }

    /**
     * @return a map with prefixes being used as keys and namespaces are the values
     */
    public ImmutableMap<String, String> getPrefixMap() {
        ImmutableMap.Builder<String, String> builder = ImmutableMap.builder();
        getPrefixView().forEach((prefix, ns) -> {
            builder.put(prefix, ns.getIri());
        });
        return builder.build();
    }

    public String prependSparqlPrefixes(String query) {
        return SparqlUtil.prependPrefixes(query, getPrefixMap());
    }

    /**
     * @return a map with namespaces being used as keys and prefixes are the values
     */
    public ImmutableMap<String, String> getNamespaceMap() {
        ImmutableMap.Builder<String, String> builder = ImmutableMap.builder();
        getNamespaceView().forEach((iri, ns) -> {
            builder.put(iri, ns.getPrefix());
        });
        return builder.build();
    }

    public Set<Namespace> getRioNamespaces() {
        return getPrefixView()
          .values()
          .stream()
          .map(ns -> new SimpleNamespace(ns.getPrefix(), ns.getIri()))
          .collect(Collectors.toSet());
    }

    public Optional<String> getPrefixedIRI(IRI iri){
        return getPrefix(iri.getNamespace()).flatMap( prefix -> Optional.of(prefix+":"+iri.getLocalName()));
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
            if (getPrefix(vf.createIRI(plainLocation).getNamespace()).isPresent()
                    || plainLocation.matches("^[^:\\s]+:\\/\\/.*$")) {
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

        NamespaceRecord ns = getPrefixView().get(prefix);
        if (ns == null) {
            return Optional.empty();
        }
        if(isTemplate){ // if requested prefixed IRI was special Template: prefixed, we need to prepend it again
            return Optional.of(vf.createIRI(TemplateUtil.TEMPLATE_PREFIX + ns.getIri(), localName));
        }
        return Optional.of(vf.createIRI(ns.getIri(), localName));
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

    public String getPlatformNamespace(){
        return getNamespace(RuntimeNamespace.PLATFORM).get();
    }
    public String getHelpNamespace(){
        return getNamespace(RuntimeNamespace.HELP).get();
    }
    public String getAdminNamespace(){
        return getNamespace(RuntimeNamespace.ADMIN).get();
    }
    public String getUserNamespace(){
        return getNamespace(RuntimeNamespace.USER).get();
    }
    public String getDefaultNamespace(){
        return getNamespace(RuntimeNamespace.DEFAULT).get();
    }

    public IRI getUserIRI(){
        String userName = SecurityService.getUserName();
        return getUserIRI(userName);
    }

    public IRI getUserIRI(String userName){
        if (userName.equals(AnonymousUserFilter.ANONYMOUS_PRINCIPAL)) {
            return PLATFORM.ANONYMOUS_USER_INDIVIDUAL;
        } else {
            try {
              return vf.createIRI(this.getUserNamespace(), URLEncoder.encode(userName, "UTF-8"));
            } catch (UnsupportedEncodingException e) {
                throw new RuntimeException(e);
            }
        }
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
