ARG JETTY_VERSION=9.4.27-jre11
FROM jetty:${JETTY_VERSION}
MAINTAINER ResearchSpace researchspace@britishmuseum.org

LABEL maintainer="ResearchSpace researchspace@britishmuseum.org"

USER root

# install additional packages
# RUN apk --update add vim && rm -rf /var/cache/apk/*

# for backward compatibility change uid and guid to the one that was in the alpine based image
# by default on debian id 100 is reserved by _apt user
# WARNING, it can have consequences on the work of apt,apt-get.
RUN usermod -u 1100 _apt
RUN usermod -u 100 jetty
RUN groupmod -g 101 jetty

# add user jetty to group root which is used for most of the permissions
# user jetty has uid 100
# group root has gid 0
RUN addgroup jetty root

# make group 'root' (no special permissions!) owning group of the various jetty base, home, and temp folders
# to allow the container to be run by non-root and non-jetty users as well (this is required e.g. for OpenShift)
# also set same permissions as for owner
RUN echo "fixing group ownership for Jetty base, home, and temp folders" \
	&& umask 0002 \
	&& chgrp -R 0 "$TMPDIR" \
	&& chmod -R g=u "$TMPDIR" \
	&& chmod -R g+s "$TMPDIR" \
	&& chgrp -R 0 "$JETTY_BASE" \
	&& chmod -R g=u "$JETTY_BASE" \
	&& chmod -R g+s "$JETTY_BASE" \
	&& chgrp -R 0 "$JETTY_HOME"\
	&& chmod -R g=u "$JETTY_HOME" \
	&& chmod -R g+s "$JETTY_HOME"


COPY --chown=100:0 entrypoint.sh /
RUN chmod a+x /entrypoint.sh


# Custom apps can be mounted under /apps folder
RUN echo "setting up platform, apps, and runtime folders" \
	&& umask 0002 \
	&& mkdir /firstStart \
	&& chown -R 100:0 "/firstStart" \
	&& chmod -R g=u "/firstStart" \
	&& chmod -R g+ws "/firstStart" \
	&& mkdir /apps \
	&& chown -R 100:0 "/apps" \
	&& chmod -R g=u "/apps" \
	&& chmod -R g+ws "/apps" \
	&& mkdir /runtime-data \
	&& mkdir -p /runtime-data/config/repositories \
	&& mkdir -p /runtime-data/data/repositories \
	&& chown -R 100:0 "/runtime-data" \
	&& chmod -R g=u "/runtime-data" \
	&& chmod -R g+ws "/runtime-data" \
	&& mkdir /var/lib/jetty/logs \
	&& chown -R 100:0 "/var/lib/jetty/logs" \
	&& chmod -R g=u "/var/lib/jetty/logs" \
	&& chmod -R g+ws "/var/lib/jetty/logs"

COPY --chown=100:0 jetty-logging.properties /var/lib/jetty/resources/jetty-logging.properties

COPY --chown=100:0 shiro-tools-hasher-1.3.2-cli.jar /firstStart/
COPY --chown=100:0 first-passwd-init.sh /firstStart/

COPY --chown=100:0 ROOT.xml /var/lib/jetty/webapps/ROOT.xml
COPY --chown=100:0 ROOT.war /var/lib/jetty/webapps/ROOT.war

COPY --chown=100:0 config/shiro.ini /runtime-data/config/shiro.ini

# copy migrations scripts into docker image 
#COPY --chown=100:0 ./migrations /migrations

# one final, recursive change of permissions in /runtime-data
RUN chmod g+w "/var/lib/jetty/webapps/ROOT.xml" \
	&& chown -R 100:0 "/runtime-data" \
	&& chmod -R g=u "/runtime-data" \
	&& chmod -R g+ws "/runtime-data"

USER jetty

# enable jetty logging configuration module
RUN java -jar "$JETTY_HOME/start.jar" --add-to-start="logging-jetty"

ENV PLATFORM_OPTS=
ENV RUNTIME_OPTS "-DruntimeDirectory=/runtime-data -Dorg.researchspace.config.baselocation=/runtime-data/config -DappsDirectory=/apps -Dconfig.environment.shiroConfig=/runtime-data/config/shiro.ini -Dlog4j.configurationFile=classpath:org/researchspace/logging/log4j2.xml -Dorg.eclipse.jetty.server.Request.maxFormContentSize=104857600"


ENTRYPOINT ["/entrypoint.sh"]


VOLUME /runtime-data
# note: if /apps is also required as volume, it can be mounted as such from the docker-compose file