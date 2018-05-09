FROM busybox

# Create apps folder
RUN mkdir /apps

ADD / /apps/researchspace

RUN chown -R 999:999 /apps/

VOLUME /apps/researchspace
