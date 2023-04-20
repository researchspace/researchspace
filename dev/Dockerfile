FROM python:3.8
RUN mkdir workdir
WORKDIR /workdir

RUN apt update
RUN apt -y install curl dirmngr apt-transport-https lsb-release ca-certificates openjdk-11-jdk python2

# Install Gradle
RUN wget https://services.gradle.org/distributions/gradle-6.5.1-bin.zip -P /tmp
RUN unzip -d /opt/gradle /tmp/gradle-6.5.1-bin.zip
RUN ln -s /opt/gradle/gradle-6.5.1 /opt/gradle/latest
RUN echo "export GRADLE_HOME=/opt/gradle/latest" >> /etc/profile.d/gradle.sh
RUN echo "export PATH=${GRADLE_HOME}/bin:${PATH}" >> /etc/profile.d/gradle.sh
RUN chmod +x /etc/profile.d/gradle.sh

# Install Node.js v14x
RUN curl -fsSL https://deb.nodesource.com/setup_14.x | bash -
RUN apt-get install -y nodejs

# Copy package.json and run npm install
#COPY package.json /workdir
#RUN npm install

CMD ["tail", "-f", "/dev/null"]