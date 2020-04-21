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

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URI;
import java.util.List;
import java.util.Map;

import javax.inject.Singleton;
import javax.ws.rs.FormParam;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.ResponseBuilder;
import javax.ws.rs.core.Response.Status;
import javax.ws.rs.core.StreamingOutput;

import org.apache.commons.io.FileUtils;
import org.apache.commons.io.IOUtils;
import org.apache.logging.log4j.Level;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.core.LoggerContext;
import org.apache.logging.log4j.core.config.Configurator;
import org.apache.shiro.authz.annotation.RequiresAuthentication;
import org.apache.shiro.authz.annotation.RequiresPermissions;
import org.researchspace.rest.feature.CacheControl.NoCache;
import org.researchspace.security.Permissions.LOGS;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.google.common.collect.Lists;
import com.google.common.collect.Maps;

/**
 * Endpoint for managing logs.
 * <p>
 * This endpoint supports read access to existing log files as well as
 * configuration of the logging system (e.g. logging profiles).
 * </p>
 * 
 * @author as
 *
 */
@Singleton
@Path("admin")
public class LogAdminEndpoint {

    private static final Logger logger = LogManager.getLogger(LogAdminEndpoint.class);

    static File LOGS_DIRECTORY = new File(".", "logs");

    /**
     * Provides a listing of available log files in the log folder.
     * <p>
     * The listing is provided as JSON and includes the log file name and its
     * relative path (as specified in {@link LogFileInfo}.
     * </p>
     * 
     * <p>
     * In case no log files are found or in case of illegal access the service
     * returns HTTP 204 (NO CONTENT).
     * </p>
     * 
     * @param recursive optional request parameter to support recursive log file
     *                  listing, default: false
     * @param subfolder optional subfolder (relative to the logs directory). Can be
     *                  <code>null</code>
     * @return
     */
    @GET()
    @Path("logs")
    @NoCache
    @RequiresAuthentication
    @Produces(MediaType.APPLICATION_JSON)
    @RequiresPermissions(LOGS.PREFIX_READ)
    public Response listLogFiles(@QueryParam("recursive") boolean recursive,
            @QueryParam("subfolder") String subfolder) {
        File logDirectory = LOGS_DIRECTORY;

        if (subfolder != null) {
            File subLogDirectory = new File(logDirectory, subfolder);
            // make sure that the subfolder resides inside the logs directory
            try {
                if (!subLogDirectory.getCanonicalPath().startsWith(logDirectory.getCanonicalPath())) {
                    return Response.noContent().build();
                }
            } catch (IOException e) {
                logger.debug("Exception while listing log files: " + e.getMessage(), e);
                return Response.noContent().build();
            }
            logDirectory = subLogDirectory;
        }
        List<LogFileInfo> l = Lists.newArrayList();
        for (File logFile : FileUtils.listFiles(logDirectory, new String[] { "log" }, recursive)) {
            LogFileInfo lInfo = new LogFileInfo(logFile);
            l.add(lInfo);
        }
        return Response.ok().entity(l).build();
    }

    /**
     * Writes the content of the request log file to the response.
     * 
     * <p>
     * This method reads the contents of the log file in the specified location and
     * writes it to the response's output stream. By default the content is returned
     * as <i>text/plain</i>. Using the optional <i>download</> query parameter, the
     * file is offered for download.
     * </p>
     * 
     * <p>
     * In case the log file is found or in case of illegal access the service
     * returns HTTP 204 (NO CONTENT).
     * </p>
     * 
     * @param logFileRelPath the relative path to an existing log file inside the
     *                       logs directory
     * @param download       whether the file should be offered as download.
     *                       Otherwise it is returned as <i>text/plain</i>. Default
     *                       false.
     * @return the {@link Response}
     */
    @GET()
    @Path("/logs/{logFile: .+}")
    @NoCache
    @RequiresAuthentication
    @Produces(MediaType.TEXT_PLAIN)
    @RequiresPermissions(LOGS.PREFIX_READ)
    public Response loadLogFile(@PathParam("logFile") String logFileRelPath, @QueryParam("download") boolean download) {

        File logFile = new File(LOGS_DIRECTORY, logFileRelPath);
        if (!logFile.isFile()) {
            return Response.noContent().build();
        }
        // make sure that the subfolder resides inside the logs directory
        try {
            if (!logFile.getCanonicalPath().startsWith(LOGS_DIRECTORY.getCanonicalPath())) {
                return Response.noContent().build();
            }
        } catch (IOException e) {
            logger.debug("Exception while reading log file: " + e.getMessage(), e);
            return Response.noContent().build();
        }

        StreamingOutput stream = new StreamingOutput() {
            @Override
            public void write(OutputStream output) throws IOException {

                try (InputStream fin = new FileInputStream(logFile)) {
                    IOUtils.copy(fin, output);
                }
            }
        };

        // Set response headers and return
        ResponseBuilder response = Response.ok(stream);
        if (download) {
            response.header("Content-Disposition", "attachment; filename=\"" + logFile.getName() + "\"");
        }
        return response.build();
    }

    /**
     * Set the logger {@link Level} of a referenced logger.
     * 
     * <p>
     * Logger names in the logging systems are hierarchical, i.e. typically it is
     * possible to also use a package name.
     * </p>
     * 
     * @param loggerName the name of a logger. Note that this can also be a package.
     * @param level      a level as defined in {@link Level}, e.g. INFO or DEBUG
     * @return the {@link Response}
     */
    @POST()
    @Path("logs/loggerlevel")
    @NoCache
    @RequiresAuthentication
    @RequiresPermissions(LOGS.PREFIX_CONFIGURE)
    public Response setLoggerLevel(@FormParam("logger") String loggerName, @FormParam("level") String level) {

        if (loggerName == null || level == null) {
            return Response.status(Status.BAD_REQUEST).entity("Both logger and level are required.").build();
        }

        Level loggerLevel;
        try {
            loggerLevel = Level.forName(level, -1);
        } catch (IllegalArgumentException e) {
            return Response.status(Status.BAD_REQUEST).entity("Unknown level: " + level).build();
        }

        logger.info("Setting level of logger {} to {}", loggerName, level);
        Configurator.setAllLevels(loggerName, loggerLevel);

        return Response.ok().build();
    }

    /**
     * Retrieve the currently configured {@link Level} for the referenced logger.
     * 
     * @param loggerName the name of a logger. Note that this can also be a package.
     * @return the {@link Response}
     */
    @GET()
    @Path("logs/loggerlevel")
    @NoCache
    @RequiresAuthentication
    @RequiresPermissions(LOGS.PREFIX_CONFIGURE)
    @Produces(MediaType.APPLICATION_JSON)
    public Response getLoggerLevel(@QueryParam("logger") String loggerName) {

        if (loggerName == null) {
            return Response.status(Status.BAD_REQUEST).entity("Parameter logger is required.").build();
        }

        Level loggerLevel = LogManager.getLogger(loggerName).getLevel();

        Map<String, String> entity = Maps.newHashMap();
        entity.put(loggerName, loggerLevel.name());

        return Response.ok().entity(entity).build();
    }

    /**
     * Apply an available logger profile configuration.
     * 
     * <p>
     * This method applies an available logging configuration file and overrides,
     * e.g. log4j2-debug.
     * </p>
     * 
     * <p>
     * The location of log profiles is inferred from the value specified in the
     * system property <i>log4j.configurationFile</i>, i.e. the log profile is
     * looked up in the very same directory. Note that the extension is omitted in
     * the profile name.
     * </p>
     * 
     * @param logProfile the name of the log profile, e.g. log42, log4j2-debug
     * @return the {@link Response}
     */
    @POST()
    @Path("logs/profile")
    @NoCache
    @RequiresAuthentication
    @RequiresPermissions(LOGS.PREFIX_CONFIGURE)
    public Response setLoggerProfile(@FormParam("logprofile") String logProfile) {

        if (logProfile == null) {
            return Response.status(Status.BAD_REQUEST).entity("Parameter logprofile is required.").build();
        }

        String log4jConfig = System.getProperty("log4j.configurationFile");
        if (log4jConfig == null) {
            return Response.serverError().entity("Could not determine log configuration file.").build();
        }

        try {
            // infer the location from the applied configuration, e.g.
            // -Dlog4j.configurationFile=file:///var/lib/jetty/webapps/etc/log4j2.xml
            // Note: if composite log files are used (rare edge case), the location lookup
            // will not work.
            String location = log4jConfig.substring(0, log4jConfig.lastIndexOf("/"));

            String newProfile = location + "/" + logProfile + ".xml";

            logger.info("Setting log profile to {}", newProfile);

            URI newProfileUri = URI.create(newProfile);
            if (!(new File(newProfileUri).isFile())) {
                return Response.status(Status.BAD_REQUEST).entity("Profile not available: " + logProfile).build();
            }
            Configurator.reconfigure(newProfileUri);
        } catch (Exception e) {
            logger.debug("Failed to change log profile to " + logProfile + ": " + e.getMessage(), e);
            return Response.serverError().entity("Failed to change log profile to " + logProfile).build();
        }

        return Response.ok().build();
    }

    /**
     * Retries the currently configured log profile or <i>unknown</i>.
     * 
     * @return the {@link Response}
     */
    @GET()
    @Path("logs/profile")
    @NoCache
    @RequiresAuthentication
    @RequiresPermissions(LOGS.PREFIX_CONFIGURE)
    @Produces(MediaType.APPLICATION_JSON)
    public Response getLoggerProfile() {

        String profileLocation = LoggerContext.getContext(false).getConfiguration().getConfigurationSource()
                .getLocation();

        String profileName = "unknown";
        if (profileLocation != null) {
            profileName = new File(profileLocation).getName();
            profileName = profileName.substring(0, profileName.lastIndexOf("."));
        }

        Map<String, String> entity = Maps.newHashMap();
        entity.put("logprofile", profileName);

        return Response.ok().entity(entity).build();
    }

    /**
     * Resets the log profile configuration to the initial log configuration.
     * 
     * @return the {@link Response}
     */
    @POST()
    @Path("logs/profile/reset")
    @NoCache
    @RequiresAuthentication
    @RequiresPermissions(LOGS.PREFIX_CONFIGURE)
    public Response resetLoggerProfile() {

        Configurator.shutdown(LoggerContext.getContext(false));
        Configurator.reconfigure();

        return Response.ok().build();
    }

    /**
     * Helper class wrapping the information for a log file.
     * 
     * @author as
     *
     */
    static class LogFileInfo {

        private final File file;

        public LogFileInfo(File file) {
            super();
            this.file = file;
        }

        public String getName() {
            return file.getName();
        }

        public String getRelativePath() {
            return LOGS_DIRECTORY.toPath().relativize(file.toPath()).toString();
        }

        @JsonIgnore
        public File getFile() {
            return file;
        }

    }
}
