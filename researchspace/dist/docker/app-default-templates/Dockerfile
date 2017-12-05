FROM alpine:3.4
MAINTAINER metaphacts support@metaphacts.com

# Create apps folder
RUN mkdir /apps

ADD default-templates/ /apps/default-templates

RUN chown -R 100:101 /apps/

VOLUME /apps/default-templates

CMD ["/bin/sh"]

