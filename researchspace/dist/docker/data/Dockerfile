FROM alpine:3.4
MAINTAINER metaphacts support@metaphacts.com

# platform default platform config
ADD config/ /config/
ADD data/ /data/

RUN chown -R 100:101 /config && chown -R 100:101 /data

VOLUME /config
VOLUME /data

CMD ["/bin/sh"]
