#FROM jetty:9.4.35-jre11
FROM jetty:9.4.40-jre11
MAINTAINER ResearchSpace researchspace@britishmuseum.org
LABEL maintainer="ResearchSpace researchspace@britishmuseum.org"

ARG FCREPO_URL=https://repo1.maven.org/maven2/org/fcrepo/fcrepo-webapp/6.0.0-beta-1/fcrepo-webapp-6.0.0-beta-1.war

USER root

COPY --chown=jetty:jetty entrypoint.sh /entrypoint.sh

RUN echo "Fetching fcrepo.war from ${FCREPO_URL}" \
 && wget -O "$TMPDIR/fcrepo.war" "${FCREPO_URL}" \
 && unzip "$TMPDIR/fcrepo.war" -d "$JETTY_BASE/webapps/fcrepo" \
 # disable authentication for fcrepo
 && sed -i "80,83d;90,114d" $JETTY_BASE/webapps/fcrepo/WEB-INF/web.xml \
 && chown -R jetty:jetty "$JETTY_BASE/webapps/fcrepo" \
 && rm "$TMPDIR/fcrepo.war"

USER jetty

ENTRYPOINT ["/entrypoint.sh"]
VOLUME /fcrepo-data

