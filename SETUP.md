<p align='center'>
  <img src='https://www.researchspace.org/images/rslogo_blackonwhite_crop.png' alt='ResearchSpace' />
</p>

- - -

<p align="center">
  <a href="https://gitter.im/researchspace/community"><img src="https://badges.gitter.im/Join Chat.svg" alt="Gitter"></a>
</p>

- - -

[ResearchSpace](https://www.researchspace.org/) is a new type of contextualising knowledge system. It promotes collaborative interdisciplinary research allowing people to grow knowledge that relates to and reveals different aspects of society.

It challenges the instrumental nature of technology and allows subject experts to become authors of meaningful forms of structured data, combined with visual and textual narrative.

The ResearchSpace system has been designed to allow researchers to connect qualitative and quantitative research, to transition from information systems that solely capture and index ‘essential’ reference material, to ones that address the complexity and richness of the research itself and provide a natural ‘relational’ method that traverses space and time, supporting different levels of complexity, variety of vantage point, and the represention of arguments and meta-commentary in a collaborative environment.

<a href="http://www.youtube.com/watch?feature=player_embedded&v=MaAv0SE7wis
" target="_blank"><img src="https://i.ytimg.com/vi/MaAv0SE7wis/maxresdefault.jpg" 
alt="ResearchSpace Overview" width="640" border="1" /></a>

# Knowledge Base 
**To Be Added**

# Demo 
We are currently working on bringing together domain-specific examples for non-technical and technical users of ResearchSpace. The following is a snapshot from ongoing research on *Connecting Through Time and Space an ancient Nubian Settlement and a North London Residential Tower Block*.
![Researchspace Example Knowledge Map](https://www.researchspace.org/images/knowledgemaps/ResearchKnowledgeMap.png "Creating a Knowledge Base while Visualy Tracing your Research with Knowledge Maps")
*Figure: Creating a Knowledge Base (RDF Graph) by Visualy Tracing your Research with Knowledge Maps*



# Technical Documentation

The following documentation covers the setting up of the ResearchSpace Platform in [production](#setup-with-docker) and [development](#developing-and-bulding-from-sources) mode. 
The ResearchSpace platform's **browser compatibility** is **Google Chrome (minimum version 53)** and **Mozilla Firefox (minimum version 58)**.
Use of this platform in other browsers or older versions of Chrome or Firefox is not currently supported.

# License
The ResearchSpace is distributed under LGPL-2.1.

# How to try it?

> :warning: **WARNING**: Currently we are working on demo application .....

The easiest way to try researchspace is to use a [setup with docker-compose](#setup-with-docker). 

# Overview

<!--ts-->
   * [Setup with docker](#setup-with-docker)
   * [Developing and building from sources](#developing-and-building-from-sources)
      * [Prerequisites](#prerequisites)
         * [Prerequisites Installation on <em>Ubuntu 18.04 (Bionic Beaver)</em>](#prerequisites-installation-on-ubuntu-1804-bionic-beaver)
         * [Prerequisites Installation on <em>MacOS Mojave</em>](#prerequisites-installation-on-macos-mojave)
         * [Prerequisites Installation on <em>Windows 10</em>](#prerequisites-installation-on-windows-10)
         * [RDF Database (Triplestore)](#rdf-database-triplestore)
      * [Running the ResearchSpace in Development Mode](#running-the-researchspace-in-development-mode)
      * [Testing](#testing)
      * [Debugging](#debugging)
            * [Backend](#backend)
            * [Frontend](#frontend)
         * [Backend Logging](#backend-logging)
      * [Building WAR artefact](#building-war-artefact)
      * [Building the Docker image](#building-the-docker-image)
         * [Setup IDE](#setup-ide)
            * [Eclipse](#eclipse)
            * [VSCode](#vscode)
            * [Known Issues](#known-issues)
      * [Codestyle &amp; Linting](#codestyle--linting)
         * [Java](#java)
         * [Typescript &amp; SCSS](#typescript--scss)
      * [Generate JSON Schema from JSDoc](#generate-json-schema-from-jsdoc)
      * [Troubleshooting](#troubleshooting)
         * [Security certificate issues when building the platform](#security-certificate-issues-when-building-the-platform)
         * [Fetching and installing dependencies may fail on the first run](#fetching-and-installing-dependencies-may-fail-on-the-first-run)
         * [Java version](#java-version)

<!-- Added by: artem, at: Tue Nov  5 18:47:57 EET 2019 -->

<!--te-->

# Setup with docker
Latest docker images for ResearchSpace are available on [Docker Hub](https://hub.docker.com/u/researchspace). 

*docker-compose* script for ResearchSpace setup is available in [docker-compose folder](docker-compose/simple). 

To setup ResearchSpace you need to execute `docker-compose up -d` from the folder with compose file. See more details about *docker-compose* in the [official documentation](https://docs.docker.com/compose/). 

# Developing and building from sources

## Prerequisites
It is possible to use an unix-based OS as well as Windows for development against the platform. As prerequisites you need to have installed on your machine:

* OpenJDK 8 (preferred, but Oracle JDK 8 is fine too)
* Node.js LTS (8.x, 10.x, 12.x)
* SBT
* Yarn
* an RDF database or at least access to such. We recommend to use Blazegraph

In particular, on OSX and Unix systems the most stable versions for SBT and Node.js are usually available from common package managers (e.g. homebrew, apt) and as such easy to install and to upgrade.

On Windows the use of [Chocolatey](https://chocolatey.org/) is highly recommended.

### Prerequisites Installation on *Ubuntu 18.04 (Bionic Beaver)*

**Docker**

1. `sudo apt-get update && sudo apt install docker.io`
2. `sudo docker run hello-world` to test docker
3. Enable docker to run without using sudo, read the following [instructions](https://askubuntu.com/questions/477551/how-can-i-use-docker-without-sudo**

**Java 8 JDK**

`sudo apt install openjdk-8-jdk`

**Scala Interactive Build Tool**

`echo "deb https://dl.bintray.com/sbt/debian /" | sudo tee -a /etc/apt/sources.list.d/sbt.list`
`sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 2EE0EA64E40A89B84B2DF73499E82A75642AC823`
`sudo apt-get update && sudo apt install sbt`

**Node.js**

Using version 8.x which is default in Ubuntu 18.04 (versions 10 and 12 will also work).

`sudo apt install nodejs npm`

**Yarn**

`curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -`
`echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list`
`sudo apt-get update && sudo apt install yarn`

### Prerequisites Installation on *MacOS Mojave*

**Homebrew Installation**

`/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"`

**Docker**

1. `brew cask install docker`
2. Launch the Docker app and a blue whale will confirm if all is running well
3. `docker run hello-world` to test docker

**Java 8**

`brew tap homebrew/cask-versions`
`brew cask install adoptopenjdk8`

**Scala Interactive Build Tool**

`brew install sbt`

**Node.js (latest LTS)**

`brew install node`

**Yarn**

`brew install yarn`

### Prerequisites Installation on *Windows 10*
See [installation instruction](https://chocolatey.org/docs/installation) for [Chocolatey](https://chocolatey.org).

**Java 8**

`choco install adoptopenjdk8 -y`

**SBT**

On Windows it is important to install sbt v0.13.15, because the latest sbt has Windows specific bug - https://github.com/sbt/sbt/issues/5174

`choco install sbt --version=0.13.15 -y`

**Node**

`choco install nodejs-lts -y`

**Yarn**

`choco install yarn -y`


### RDF Database (Triplestore)

For most developments (i.e. for starting-up the platform properly) you will need to have a RDF database in place. The database does not necessarily need to run on your local machine as long as it is accessible over a standard conform SPARQL endpoint interface. For your convenience, we recommend to run, for example, Blazegraph as a container on your local docker daemon so you can easily run serveral databases in parallel and switch between them:

`docker run --name researchspace-blazegraph -d --restart=unless-stopped -p 10080:8080 --env JAVA_OPTS="" researchspacepublic/blazegraph:2.2.0-RC-2016_12_09-researchspace-geo`


## Running the ResearchSpace in Development Mode

1. Compile and initialise the files using SBT in batch mode
2. Configure the platform to use a local Blazegraph instance as its default repository
3. Start the SBT build environment in interactive mode.

Enter the following into your terminal (for Linux and Mac):

```sh
mkdir -p runtime/config && echo "sparqlEndpoint=http://localhost:10080/blazegraph/sparql" >> runtime/config/environment.prop
sh ./build.sh -Dbuildjson=researchspace/researchspace-root-build.json
```

For Windows from PowerShell
```sh
mkdir runtime\config ; echo "sparqlEndpoint=http://localhost:10080/blazegraph/sparql" | Out-File runtime\config\environment.prop
.\build.bat "-Dbuildjson=researchspace/researchspace-root-build.json"
```

SBT will resolve some dependencies and present the SBT prompt.

Once in the SBT console, run `~jetty:start` which will compile all sources and start the jetty server. The tilde `~` will make SBT to watch source directories for changes in order to trigger incremental compilation, so any change to the server-side or client-side sources triggers re-deployment, which takes no more than a few seconds until they are picked-up by Jetty.

Note, it may take a few minutes to complete starting the platform on the first run; it should be quicker on subsequent runs.

You should see console output similar to:

```
*************************************************************************************
* Main platform servlet context initialised. Press CTRL+C to terminate the process. *
*************************************************************************************
```
followed by
```
2017-11-01 16:04:25.820:INFO:oejs.AbstractConnector:main: Started ServerConnector@4fddf222{HTTP/1.1,[http/1.1]}{0.0.0.0:10214}
2017-11-01 16:04:25.823:INFO:oejs.Server:main: Started @14366ms
```

Finally, go to [http://127.0.0.1:10214/](http://127.0.0.1:10214/), where you should see the login screen. Default platform access username and password are  `admin:admin`.

## Testing
> :warning: **WARNING**: Chromium or Google Chrome browser is required for client-side tests.

Running `test` command in the SBT console will execute all backend tests (Java JUnit) as well as client-side unit tests (using mainly mocha, chai, sinon). To just execute the client-side test, you can also run `npm run test` in the `project/webpack` folder. We also have a number of integration tests, see `researchspace/integration-tests`.

## Debugging

#### Backend
Run `build.sh` with an additional parameter `-Ddebug=true` will open a remote debugging port when starting jetty with `~jetty:start`.
Once the SBT console displays the message "Listening for transport dt_socket at address: 5005" you can connect to the respective port using, for example, the remote debugging functionality in Eclipse (Run -> Debug Configurations .. -> New "Remote Java Application" -> Choose a name, `localhost` as host and `5005` as port parameter).

#### Frontend
You can use standard browser developer tools for debugging the frontend. Furthermore, there is a dedicated plugin called "React Developer Tools" (available for Chrome, Firefox** for debugging and tracing states of React components.

There are several convenient specifics, if in the development mode:

**Hot-Reloading**

Changes to JS/TS and CSS/LESS files are compiled and pushed during runtime. We are using so called "hot loaders" which will try to "swap" changes live into the client application i.e. without the need to reload the entire page in the browser.

**Source Attachments**

Sourcemaps are being attached (`webpack://./src`) i.e. you can debug in the Typescript code instead of the compiled JS code.

### Backend Logging
The platform's backend is using log4j2 (and respective adapters) for logging. It is setup with four pre-configured log profiles.
The default profile is "debug", however, the profile can easily be switched by supplying the `build.sh -Dlog={log4j2-debug,log4j2-trace,log4j2-trace2,log4j2}` environment variable
in the sbt console. The `log4j2-trace` and `log4j2-trace2` profile produce a lot of log messages, however, they can be particularly useful when one needs to trace, for example, request headers or queries without goint to debug low level APIs.

**Please note:** If an old `log4j2.xml` file is still present in the compilation `/target/webapp/WEB-INF` folder, it will always be preceded over the file set via the `-Dlog` env variable. Execute `clean` and `clean-files` in the sbt console to clean the target folder.

## Building WAR artefact
> :warning: **WARNING**: There is a bug in SBT 1.* that prevents automatic assets cleanup (https://github.com/sbt/sbt/pull/4999), so you need to manually remove `project/webpack/assets` folder before building the WAR artefact. 

To build ResearchSpace WAR artefact that can be deployed into Java Servlet Container (like jetty), execute the following command, replace `VERSION_NUMBER` with some valid [semantic versioning](https://semver.org/) number.

`rm -rf project/webpack/assets`

`sh ./build.sh -DplatformVersion=VERSION_NUMBER -Dbuildjson=researchspace/researchspace-root-build.json -DbuildEnv=prod clean package`

When the packaging process is complete you will find the .war file in `/target/platform-VERSION_NUMBER.war`.

## Building the Docker image

The creation of the platform Docker image consists of packaging the ResearchSpace platform as a Java webapp (the .war file we have just created) in a Java servlet container, Jetty.

Dockerfile file is located in `metaphacts-platform/dist/docker` folder. This file contains the instructions for building the platform's Docker image that is based on an official Jetty server as image.


To build the image first we need to copy artefacts produced by the platform build process.

**Copy artifacts to docker folder**

```
export DOCKER_FOLDER="$(pwd)/metaphacts-platform/dist/docker"
cp target/platform-*.war $DOCKER_FOLDER/platform/ROOT.war
mkdir $DOCKER_FOLDER/platform/etc
cp metaphacts-platform/webapp/etc/* $DOCKER_FOLDER/platform/etc
mkdir $DOCKER_FOLDER/platform/config
cp -r  metaphacts-platform/app/config/* $DOCKER_FOLDER/platform/config
```

**Build the image**

```
cd $DOCKER_FOLDER/platform
docker build -t researchspace:VERSION_TAG .
```

### Setup IDE
You can use various IDEs and text editors like Eclipse, IDEA, VSCode, Atom and Emacs to work on the project. While there exist some add-ons for JavaScript and Typescript in Eclipse, it is in principle possible to develop everything in only one IDE, e.g. Eclipse or IDEA. However, in particular for the JavaScript/TypeScript development it can be convenient to use editors such as VSCode, Atom or Emacs with much more powerful plugins.

#### Eclipse
If you are used to develop in Eclipse, you can automatically generate a new Eclipse project by executing the `build.sh`, which is located in the project root folder.
Once in the SBT console, execute the command `eclipse` which will first resolve all required dependencies and then will automatically generate the classpath file as well as required Eclipse metadata files. Finally, you can import the project into your Eclipse Workspace using the "Existing Projects into Workspace" wizard.

#### VSCode
When developing frontend code in the Visual Studio Code we recommend setting TypeScript compiler to locally installed one by clicking on compiler version number in the status bar while viewing any `*.ts` file, or manually setting `"typescript.tsdk": "project/webpack/node_modules/typescript/lib"` in the `.vscode/settings.json`.

#### Known Issues
* Git - do not clone the project from GIT using Eclipse (c.f. this [bug report](https://bugs.eclipse.org/bugs/show_bug.cgi?id=342372));
* IntelliJ IDEA - should add `-Dsbt.override.build.repos=true -Dsbt.repository.config=./project/repositories` to VM parameters when importing the project (c.f. this [answer](https://stackoverflow.com/questions/26933523/why-intellij-cant-find-sbt-snapshot-dependencies/27173389#27173389)).

## Codestyle & Linting

### Java

You will find a readymade Java checkstyle file in `project/checkstyle.xml`. We recommend to use the [eclipse-cs](https://github.com/checkstyle/eclipse-cs) plugin. You can install the plugin if you drag&drop the following link into your eclipse: [Install](http://marketplace.eclipse.org/marketplace-client-intro?mpc_install=150) . Afterwards  you should create a new global check configuration and import the checkstyle file: Preferences -> Checkstyle -> New… -> Name "metaphacts-platform" -> Import … (Select from `project/checkstyle.xml`) -> Set as Default (optional).

### Typescript & SCSS

You will find a `tslint.json` file in the root folder of the project, which should automatically be recognised by your IDE and respective linting extensions. Make sure that your IDE has installed the latest tslint plugin/extension, i.e.  the `tslint@1.0.x` extension in Visual Code (View -> Extensions -> search … 'tslint' ) is deprecated and you should install `tslint@1.2.x` or newer, which is a separate extension and requires to uninstall the old extension.

## Generate JSON Schema from JSDoc

To generate generate JSON schema from any TypeScript interface to use in the documentation with `mp-documentation`, add interface name to `platform-web-build.json` under `generatedJsonSchemas` property and execute the following command at `project/webpack` directory:

`yarn run generate-schema <project-name> <interface-name>`


## Troubleshooting
### Security certificate issues when building the platform

If you are working in an institutional network and experience difficulties at the build stage due to security certificate errors, you may need to add your institution's security certificate to your computer's keychain, and to the keystore in your Java installation.
For example you may experience errors when trying to download Maven dependencies.

To add the certificate to your java keystore:

`keytool -import -alias example -keystore  /path/to/cacerts -file example.der`

You may also need to disable strict ssl settings in yarn:

`yarn config set strict-ssl "false"`


### Fetching and installing dependencies may fail on the first run

We have been reported that fetching and installing dependencies may fail on the first run, i.e. when running `build.(bat|sh)` initially, there might be random `npm` errors/race conditions. These are typically related to compiling certain `npm` (peer/dev)  dependencies  (depending on the node.js version and operation system being used) . Usually running `build.(bat|sh)` a second time will solve the issue. Once the dependencies are compiled/installed, these will be cached unless running `build.(bat|sh) clean`.


### Java version

Mac users reported issues building the platform using Java 10. Setup of ResearchSpace is tested and working with Java 8. You are recommended to use [jEnv](http://www.jenv.be/) to manage multiple versions of Java if required.
