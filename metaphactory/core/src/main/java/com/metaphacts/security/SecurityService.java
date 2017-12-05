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

package com.metaphacts.security;

import java.io.*;
import java.net.URLEncoder;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import javax.inject.Inject;
import javax.inject.Singleton;

import com.github.jknack.handlebars.Context;
import com.github.jknack.handlebars.Handlebars;
import com.github.jknack.handlebars.Template;
import com.github.jknack.handlebars.context.FieldValueResolver;
import com.github.jknack.handlebars.io.FileTemplateLoader;
import com.google.common.collect.Sets;
import com.metaphacts.config.Configuration;
import com.metaphacts.config.NamespaceRegistry;
import com.metaphacts.data.rdf.PointedGraph;
import com.metaphacts.data.rdf.RioUtils;
import com.metaphacts.data.rdf.container.LDPImplManager;
import com.metaphacts.data.rdf.container.UserMetadataContainer;
import com.metaphacts.vocabulary.LDP;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.repository.Repository;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.eclipse.rdf4j.rio.RDFParseException;

/**
 * @author Denis Ostapenko
 * @author Artem Kozlov <ak@metaphacts.com>
 */
@Singleton
public class SecurityService {
    private static final Logger logger = LogManager.getLogger(SecurityService.class);

    @Inject
    private RioUtils rioUtils;

    @Inject
    private NamespaceRegistry ns;

    public String renderUsersMetadataToTurtle(UserMetadataProvider userMetadataProvider) throws IOException {
        class UserMetadataGroupOpts {
            public String dn;
            public String cn;
            public String dn_encoded;
            public UserMetadataGroupOpts(String dn, String cn) {
                this.dn = dn;
                this.cn = cn;
                try {
                    this.dn_encoded = URLEncoder.encode(dn, "UTF-8");
                } catch (UnsupportedEncodingException e) { }
            }
        }
        class UserMetadataOpts {
            public String USER_NAME;
            public String USER_IRI;
            public Set<UserMetadataGroupOpts> USER_GROUPS;
            public Set<String> USER_ROLES;
            public UserMetadataOpts(String userName, Set<UserMetadata.GroupProps> userGroups, Set<String> userRoles) {
                USER_NAME = userName;
                USER_IRI = "<" + ns.getUserIRI(userName).stringValue() + ">";
                USER_GROUPS = new HashSet<>();
                for (UserMetadata.GroupProps userGroup : userGroups) {
                    USER_GROUPS.add(new UserMetadataGroupOpts(userGroup.dn, userGroup.cn));
                }
                USER_ROLES = userRoles;
            }
        }
        List<UserMetadata> users = userMetadataProvider.getUsersMetadata();
        Template userMetadataTemplate = new Handlebars()
            .with(new FileTemplateLoader(Configuration.getConfigBasePath(), ".hbs"))
            .compile("userMetadata");
        StringBuilder response = new StringBuilder();
        for (UserMetadata user : users) {
            Object model = new UserMetadataOpts(user.name, user.groups, user.roles);
            String record = userMetadataTemplate.apply(Context.newBuilder(model).resolver(FieldValueResolver.INSTANCE).build());
            response.append(record);
        }
        return response.toString();
    }

    public void saveUsersMetadataTurtleInContainer(String turtle, Repository repository) throws Exception {
        UserMetadataContainer userMetadataContainer = (UserMetadataContainer) LDPImplManager.getLDPImplementation(
            UserMetadataContainer.IRI,
            Sets.newHashSet(LDP.Container, LDP.Resource),
            repository
        );
        InputStream input = new ByteArrayInputStream(turtle.getBytes());
        try {
            IRI root = UserMetadataContainer.IRI_ROOT;
            Model model = rioUtils.parse(input, root.stringValue(), RDFFormat.TURTLE);
            userMetadataContainer.update(new PointedGraph(root, model));
        } catch (RDFParseException exception) {
            logger.debug("Generated from userMetadata.hbs Turtle is not valid, it will not be added to database", exception);
        }
    }
}
