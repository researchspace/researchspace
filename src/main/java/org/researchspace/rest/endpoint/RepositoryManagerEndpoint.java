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

package org.researchspace.rest.endpoint;

import static javax.ws.rs.core.MediaType.APPLICATION_JSON;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import javax.inject.Inject;
import javax.inject.Singleton;
import javax.validation.constraints.NotNull;
import javax.ws.rs.DELETE;
import javax.ws.rs.ForbiddenException;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.Status;
import javax.ws.rs.core.StreamingOutput;

import org.apache.commons.io.IOUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.shiro.SecurityUtils;
import org.apache.shiro.authz.annotation.RequiresAuthentication;
import org.apache.shiro.authz.permission.WildcardPermission;
import org.eclipse.rdf4j.model.Literal;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Statement;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.LinkedHashModel;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.repository.Repository;
import org.eclipse.rdf4j.repository.config.RepositoryConfig;
import org.eclipse.rdf4j.repository.config.RepositoryConfigException;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.eclipse.rdf4j.rio.Rio;
import org.researchspace.config.Configuration;
import org.researchspace.config.UnknownConfigurationException;
import org.researchspace.repository.MpRepositoryVocabulary;
import org.researchspace.repository.RepositoryConfigUtils;
import org.researchspace.repository.RepositoryManager;
import org.researchspace.repository.memory.MpMemoryRepository;
import org.researchspace.repository.memory.MpMemoryRepositoryFactory;
import org.researchspace.rest.feature.CacheControl.NoCache;
import org.researchspace.security.Permissions;
import org.researchspace.security.Permissions.REPOSITORY_CONFIG;
import org.researchspace.services.storage.api.ObjectKind;
import org.researchspace.services.storage.api.PlatformStorage;
import org.researchspace.services.storage.api.StorageException;
import org.researchspace.services.storage.api.StorageLocation;
import org.researchspace.services.storage.api.StoragePath;

import com.google.common.collect.Lists;
import com.google.common.collect.Maps;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 */
@Singleton
@Path("repositories")
@NoCache
public class RepositoryManagerEndpoint {

    private static final Logger logger = LogManager.getLogger(RepositoryManagerEndpoint.class);

    private static final StoragePath REPOSITORY_TEMPLATES_OBJECT_PREFIX = ObjectKind.CONFIG
            .resolve("repository-templates");

    private static final String PASSWORD_MASK = "****";

    private static final ValueFactory VF = SimpleValueFactory.getInstance();

    private static final Literal PASSWORD_MASK_LITERAL = VF.createLiteral(PASSWORD_MASK);

    @Inject
    private PlatformStorage platformStorage;
    @Inject
    private RepositoryManager repositoryManager;
    @Inject
    private Configuration config;

    private boolean checkPermission(String permission) {
        return SecurityUtils.getSubject().isPermitted(new WildcardPermission(permission));
    }

    private static StoragePath getObjectIdForTemplate(String templateId) {
        return REPOSITORY_TEMPLATES_OBJECT_PREFIX.resolve(templateId).addExtension(".ttl");
    }

    @GET
    @RequiresAuthentication
    @Produces(APPLICATION_JSON)
    public Map<String, Boolean> getAvailableRepositoryConfigs() throws IOException {
        Map<String, Boolean> availableConfigs = repositoryManager.getAvailableRepositoryConfigs();

        return availableConfigs.entrySet().stream()
                .filter(entry -> checkPermission(
                        Permissions.SPARQL.PREFIX + entry.getKey() + ":" + Permissions.SPARQL.QUERY_SELECT_POSTFIX))
                .collect(Collectors.toMap(entry -> entry.getKey(), entry -> entry.getValue()));
    }

    @GET
    @Path("config/{repositoryId}")
    @RequiresAuthentication
    @Produces("text/turtle")
    public Response getAvailableRepositoryConfigs(@NotNull @PathParam("repositoryId") String repID) throws Exception {
        if (!checkPermission(REPOSITORY_CONFIG.PREFIX_VIEW + repID)) {
            throw new ForbiddenException();
        }

        Model originalModel = repositoryManager.getModelForRepositoryConfig(repID);

        Model cleanedModel = obfuscatePassword(originalModel);

        String turtleConfig = RepositoryConfigUtils.convertModelToPrettyTurtleString(cleanedModel);

        return Response.ok(turtleConfig).build();
    }

    /**
     * Replaces the value of the {@link MpRepositoryVocabulary#PASSWORD} property
     * with "****"
     * 
     * @param originalModel
     * @return
     */
    private Model obfuscatePassword(Model originalModel) {
        if (originalModel.contains(null, MpRepositoryVocabulary.PASSWORD, null)) {
            // Obfuscate the password with "****"
            LinkedHashModel newModel = new LinkedHashModel();
            for (Statement stmt : originalModel) {
                if (stmt.getPredicate().equals(MpRepositoryVocabulary.PASSWORD)) {
                    newModel.add(stmt.getSubject(), MpRepositoryVocabulary.PASSWORD, PASSWORD_MASK_LITERAL);
                } else {
                    newModel.add(stmt);
                }
            }
            return newModel;
        } else {
            return originalModel;
        }
    }

    @DELETE
    @Path("config/{repositoryId}")
    @RequiresAuthentication
    public Response deleteRepositoryConfig(@NotNull @PathParam("repositoryId") String repId) {
        if (!checkPermission(REPOSITORY_CONFIG.PREFIX_DELETE + repId)) {
            throw new ForbiddenException();
        }

        try {
            this.repositoryManager.deleteRepositoryConfig(repId);
        } catch (Exception e) {
            String msg = "Cannot delete repository " + repId + ": " + e.getMessage();
            logger.error(msg);
            throw new WebApplicationException(msg, Status.INTERNAL_SERVER_ERROR);
        }

        return Response.ok().build();
    }

    @GET
    @RequiresAuthentication
    @Produces(APPLICATION_JSON)
    @Path("info/{repositoryId}")
    public Map<String, String> getRepositoryInfo(@NotNull @PathParam("repositoryId") String repID) throws Exception {
        if (!checkPermission(REPOSITORY_CONFIG.PREFIX_VIEW + repID)) {
            throw new ForbiddenException();
        }
        RepositoryConfig repConfig = repositoryManager.getRepositoryConfig(repID);

        Map<String, String> resultMap = Maps.newHashMap();
        resultMap.put("id", repID);
        resultMap.put("description", repConfig.getTitle());
        resultMap.put("type", repConfig.getRepositoryImplConfig().getType());

        return resultMap;
    }

    @GET
    @RequiresAuthentication
    @Path("validatedefault")
    @Produces(APPLICATION_JSON)
    public String isDefaultRepositoryValid() {
        boolean isValid = !(repositoryManager.getDefault() instanceof MpMemoryRepository);
        return "{ \"valid\": " + Boolean.toString(isValid) + " }";
    }

    @GET
    @Path("templates")
    @Produces(APPLICATION_JSON)
    @RequiresAuthentication
    public List<String> listTurtleRepositoryTemplates() throws StorageException {
        List<String> templateIds = platformStorage.findAll(REPOSITORY_TEMPLATES_OBJECT_PREFIX).values().stream()
                .map(foundObject -> foundObject.getRecord().getPath()).filter(path -> path.hasExtension(".ttl"))
                .map(path -> StoragePath.removeAnyExtension(path.getLastComponent())).collect(Collectors.toList());

        return templateIds;
    }

    @GET
    @RequiresAuthentication
    @Path("templates/{templateID}")
    public Response getTurtleRepositoryTemplate(@NotNull @PathParam("templateID") String templateId) {

        try {
            Optional<PlatformStorage.FindResult> foundTemplate = platformStorage
                    .findObject(getObjectIdForTemplate(templateId));

            if (!foundTemplate.isPresent()) {
                return Response.status(Status.NOT_FOUND)
                        .entity("Repository template '" + templateId + "' could not be found").build();
            }

            final StorageLocation storageLocation = foundTemplate.get().getRecord().getLocation();
            StreamingOutput stream = (OutputStream os) -> {
                try (InputStream resourceInputStream = storageLocation.readContent()) {
                    IOUtils.copy(resourceInputStream, os);
                    os.flush();
                } catch (IOException e) {
                    throw new IOException("Error reading repository template '" + templateId + "': " + e.getMessage(),
                            e);
                }
            };
            return Response.ok().entity(stream).build();
        } catch (IOException e) {
            String message = "Error reading repository template '" + templateId + "'";
            logger.debug(message, e);
            return Response.status(Status.INTERNAL_SERVER_ERROR).entity(message).build();
        }
    }

    @POST
    @Path("config/{repositoryId}")
    @RequiresAuthentication
    public Response addRepositoryTTLConfig(@NotNull @PathParam("repositoryId") String repID, InputStream stream,
            @QueryParam("validate") boolean validate) {
        Optional<Repository> optRepo = repositoryManager.getRepository(Optional.of(repID));
        if (!checkPermission(
                optRepo.isPresent() ? REPOSITORY_CONFIG.PREFIX_UPDATE + repID : REPOSITORY_CONFIG.CREATE)) {
            throw new ForbiddenException("No permission for creating or updating the repository " + repID);
        }

        try {
            if (repID.equals(RepositoryManager.DEFAULT_REPOSITORY_ID)
                    && config.getEnvironmentConfig().getParameterInfo("sparqlEndpoint").isShadowed()) {
                throw new ForbiddenException("Cannot update the default repository defined using a system property");
            }
        } catch (UnknownConfigurationException e) {
            String message = "Error reading environment configuration to check the default repository specification";
            logger.error(message, e);
            return Response.serverError().entity(message).build();
        }

        Model repConfigModel;
        try {
            repConfigModel = Rio.parse(stream, "", RDFFormat.TURTLE);
        } catch (Exception e) {
            String message = "Could not parse the submitted configuration file for repository \"" + repID + "\":"
                    + e.getMessage();
            logger.error(message, e);
            return Response.status(Status.BAD_REQUEST).entity(message).build();
        }

        if (optRepo.isPresent()) {
            repConfigModel = replaceMaskedPasswordFromExistingConfig(repConfigModel, repID);
        }

        RepositoryConfig config;
        try {
            config = RepositoryConfigUtils.createRepositoryConfig(repConfigModel);
            if (!config.getID().equals(repID)) {
                throw new RepositoryConfigException(
                        "Repository ID " + repID + " must match the value stored in the file: " + config.getID());
            }
            // {@link MpMemoryRepository} is only to be used for the initial
            // startup, no new repositories of this type can be created.
            if (config.getRepositoryImplConfig().getType().equals(MpMemoryRepositoryFactory.REPOSITORY_TYPE)) {
                throw new RepositoryConfigException(
                        "Cannot instantiate repositories of this type: " + MpMemoryRepositoryFactory.REPOSITORY_TYPE);
            }
        } catch (RepositoryConfigException e) {
            String msg = "Submitted repository configuration for the repository " + repID + " is invalid: "
                    + e.getMessage();
            logger.error(msg);
            return Response.status(Status.BAD_REQUEST).entity(msg).build();
        }

        // validate repository if desired, always validate "default" repository changes
        if (validate || "default".equals(repID)) {
            try {
                repositoryManager.validate(config.getRepositoryImplConfig(), repID);
            } catch (Exception e) {
                String message = "Validation of repository config failed: " + e.getMessage();
                logger.debug(message, e);
                return Response.status(Status.BAD_REQUEST).entity(message).build();
            }
        }

        try {
            RepositoryConfigUtils.writeRepositoryConfigAsPrettyTurtleToFile(repositoryManager.getDefaultConfigStorage(),
                    platformStorage.getDefaultMetadata(), config, true);
        } catch (Exception e) {
            String message = "Could not write the configuration file for repository \"" + repID + "\": "
                    + e.getMessage();
            logger.error(message);
            logger.debug("Details: ", e);
            return Response.status(Status.INTERNAL_SERVER_ERROR).entity(message).build();
        }

        try {
            repositoryManager.reinitializeRepositories(Lists.newArrayList(repID));
            return Response.ok().build();
        } catch (Exception e) {
            String message = "Could not reinitialize the repository manager to apply the changes: " + e.getMessage();
            logger.error(message);
            logger.debug("Details: ", e);
            return Response.status(Status.INTERNAL_SERVER_ERROR).entity(message).build();
        }

    }

    /**
     * When updating an existing password-protected repository where the password
     * was not modified, the password placeholder "****" has to be replaced with the
     * original password from the existing config before saving.
     * 
     * @param postedModel  model posted from the client
     * @param repositoryId id of the repository to be updated
     * @return
     */
    private Model replaceMaskedPasswordFromExistingConfig(Model postedModel, String repositoryId) {
        Model filteredModel = postedModel.filter(null, MpRepositoryVocabulary.PASSWORD, PASSWORD_MASK_LITERAL);
        if (filteredModel.isEmpty()) {
            return postedModel;
        }

        Statement passwordStmt = filteredModel.iterator().next();

        try {
            Model existingModel = repositoryManager.getModelForRepositoryConfig(repositoryId);

            Model passwordModel = existingModel.filter(null, MpRepositoryVocabulary.PASSWORD, null);

            if (!passwordModel.isEmpty()) {
                Statement stmt = passwordModel.iterator().next();
                Statement toAdd = VF.createStatement(passwordStmt.getSubject(), MpRepositoryVocabulary.PASSWORD,
                        stmt.getObject());

                Model newModel = new LinkedHashModel(postedModel);
                newModel.remove(passwordStmt);
                newModel.add(toAdd);
                return newModel;
            }

        } catch (IOException e) {
            logger.error(e.getMessage());
            logger.debug("Details: ", e);
        }

        return postedModel;

    }

}
