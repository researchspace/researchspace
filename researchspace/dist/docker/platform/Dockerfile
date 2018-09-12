FROM jetty:9.3.9-jre8-alpine
MAINTAINER metaphacts support@metaphacts.com

ADD ROOT.war /var/lib/jetty/webapps/ROOT.war

ADD etc/ /var/lib/jetty/webapps/etc

# Custom apps can be mounted under /apps folder
RUN mkdir /apps

ENV RUNTIME_OPTS "-Dcom.metaphacts.config.baselocation=/config -DruntimeDirectory=/ -Dconfig.environment.appsDirectory=/apps -Dorg.eclipse.jetty.server.Request.maxFormContentSize=104857600"

COPY entrypoint.bash /
ENTRYPOINT ["/entrypoint.bash"]
