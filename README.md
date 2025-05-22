<p align='center'>
   <img height="30px;" src='https://researchspace.org/wp-content/uploads/2021/05/researchspace_logo.jpg'
</p>


<p align='center'>ResearchSpace is licensed under the GNU Affero General Public License, version 3 or later (AGPL v3 or later). see LICENSE file </p>

- - -

<p align="center">
  <a href="https://nightly.link/researchspace/researchspace/workflows/main/master/zip-bundle.zip">
    <img src="https://img.shields.io/badge/download-zip-blue" height="30px"></a> 
  <a href="https://hub.docker.com/repository/docker/researchspace/platform-ci/general">
    <img src="https://img.shields.io/badge/docker-researchspace%2Fplatform--ci%3Alatest-blue" height="30px"></a>
  <a href="https://gitter.im/researchspace/community">
    <img src="https://badges.gitter.im/Join Chat.svg" height="30px" alt="Gitter"></a>
</p>

# The ResearchSpace Platform

In 1968, the first conference on the [*Potential of Computers in Museums*](https://link.springer.com/article/10.1007/BF02400262) highlighted a paradox that would persist in arts and heritage-related systems for the next 50 years: the reliance on generalized, object-focused data records. While these records aligned with the technical capabilities of computer databases, they failed to capture the nuanced knowledge that organizations actually created. One curator at the conference recognized that computerization would only be truly valuable if its models could adapt to changing needs. However, the rigid nature of traditional databases made such adaptability impossible.

[ResearchSpace](https://www.researchspace.org/), in conjunction with the [CIDOC CRM](https://site2024.cidoc-crm.org/), resolves this paradox and addresses other limitations of conventional databases. By combining structure with flexibility, it enables data models to evolve and expand to accommodate new questions and incorporate community-driven knowledge. Leveraging semantics, ResearchSpace unlocks the knowledge hidden within databases and allows extending the objects' representations with rich contextual information. It unites research and practice, strengthening the educational, engagement, and participatory roles of museums and cultural organizations.

As a platform for contextualizing knowledge, ResearchSpace fosters collaborative interdisciplinary research, empowering individuals to expand understanding across diverse aspects of society. It challenges the instrumental nature of technology, enabling subject experts to become authors of meaningful, structured data that integrates visual and textual narratives.

<div align="center"><img height="400px;" src="https://researchspace.org/wp-content/uploads/2021/03/book.png"/></div>

# Overview

<!--ts-->
   * [From Research Questions to Knowledge Bases](#from-research-questions-to-knowledge-bases) 
   * [ResearchSpace v.4.0.0](#researchspace-v400)
   * [Installation Options](#installation-options)
      * [Latest Release](#latest-release)
      * [Docker Image](#docker-image)
      * [ZIP Bundle](#zip-bundle)
   * [Browser Compatibility](#browser-compatibility)
   * [License Information](#license-information)
   * [Technical Documentation](#technical-documentation)
   * [Developing and Building from Source Code](#developing-and-building-from-source-code)
      * [Prerequisites](#prerequisites)
         * [Prerequisites Installation on <em>Ubuntu</em>](#prerequisites-installation-on-ubuntu)
         * [Prerequisites Installation on <em>MacOS</em>](#prerequisites-installation-on-macos)
         * [Prerequisites Installation on <em>Windows 10</em>](#prerequisites-installation-on-windows-10)
      * [Running ResearchSpace in Development Mode](#running-researchspace-in-development-mode)
         * [ResearchSpace with bundled blazegraph triplestore and digilib IIIF server](#researchspace-with-bundled-blazegraph-triplestore-and-digilib-iiif-server)
         * [ResearchSpace with Your Own Triplestore and IIIF Server](#researchspace-with-your-own-triplestore-and-iiif-server)
      * [Testing and Debugging](#testing-and-debugging)
         * [Testing](#testing)
          * [Debugging](#debugging)
            * [Backend](#backend)
            * [Frontend](#frontend)
            * [Backend Logging](#backend-logging)
      * [Building and Packaging](#building-and-packaging)
         * [Building WAR Artefact](#building-war-artefact)
         * [Creating a ZIP Bundle](#creating-a-zip-bundle)
         * [Building a Docker Image](#building-a-docker-image)
      * [Setting Up Your IDE](#setting-up-your-ide)
         * [Eclipse](#eclipse)
         * [VSCode](#vscode)
      * [Codestyle &amp; Linting](#codestyle--linting)
         * [Java](#java)
         * [Typescript &amp; SCSS](#typescript--scss)
      * [Advanced Topics](#advanced-topics)
         * [Generate JSON Schema from JSDoc](#generate-json-schema-from-jsdoc)
         * [Troubleshooting](#troubleshooting)
            * [Security certificate issues when building the platform](#security-certificate-issues-when-building-the-platform)

<!--te-->


# From Research Questions to Knowledge Bases 
Changing the methods of research in the humanities requires an innovative platform that combines the qualitative with the quantitative through collaborative research, expressive structured data, and a human-centered and participatory approach.

The thinking and design of the platform is that any research is a process of growing a network of connections, namely a ***knowledge graph***. From a technical perspective it is a "changing informational structure that mediates between a human, the world and a computer. The graph itself is ontologically based and enhanced by human epistemology. These are closely linked in that the ontology provides real world references and a structure of interrelated entities or processes, while the epistemology uses the graph to interpret and generate new knowledge. Growing the graph is based on both automated reasoning and crucially, collaborative human thinking and creativity". [Oldman and Tanase](https://link.springer.com/chapter/10.1007/978-3-030-00668-6_20)

## ResearchSpace v.4.0.0

This release offers a unique way of recording data with semantics based on an exhaustive collection of interconnected resource templates, allowing one to start by adding any [new resource based on CIDOC CRM ontology](./images/release4/NewResource.png). See further details in the **[RELEASE NOTES](release-notes.md)**.

Current version of ResearchSpace was created and is supported by Kartography CIC.

![Research as Data](./images/release4/ResearchAsData.png)




# Installation Options
## Latest Release

This is an invitation to explore new ways of researching using as example of our research on the ***Seventeenth Century Woman Artists***. 

[**Download Latest ResearchSpace Release and Example Data**](https://documentation.researchspace.org/resource/rsp:Documentation_Download)


## Docker Image

[**ResearchSpace with Docker Desktop download and instructions for installing**](https://documentation.researchspace.org/resource/rsp:Documentation_Download#rs-doc_installationDocker)

[**ResearchSpace server installations using docker compose scripts**](https://github.com/researchspace/researchspace-docker-compose). 

All docker images for ResearchSpace are available on [Docker Hub](https://hub.docker.com/r/researchspace/platform-ci). 

Get the current version with ```docker pull researchspace/platform-ci:latest```

## ZIP Bundle

<!-- Download the latest ZIP bundle from the latest [CI build](https://github.com/researchspace/researchspace/actions?query=branch%3Amaster) artefacts and follow instructions in the README file inside the ZIP.-->

[Download Release](https://nightly.link/researchspace/researchspace/workflows/main/master/zip-bundle.zip) - empty ResearchSpace bundle with [blazegraph triplestore](https://blazegraph.com/) and [digilib](https://robcast.github.io/digilib/) IIIF viewer.

# Browser Compatibility
The ResearchSpace platform's **browser compatibility** is **Google Chrome (minimum version 53)** and **Mozilla Firefox (minimum version 58)**.
Use of this platform in other browsers or older versions of Chrome or Firefox is not currently supported.

# Technical Documentation

<a href="https://documentation.researchspace.org/resource/rsp:Start"> ResearchSpace Documentation Site</a> created and maintained by Kartography CIC

# License Information
The ResearchSpace is distributed under AGPL-3.0 or later.


# Developing and Building from Source Code

## Prerequisites

It is possible to use an unix-based OS as well as Windows for development against the platform. As prerequisites you need to have installed on your machine:

* JDK 21 LTS. For historical reasons, ResearchSpace can be built only with Java 11, but the [Gradle Toolchain](https://docs.gradle.org/current/userguide/toolchains.html) feature is used to automatically install the required JDK. JDK 21 is required to run the current version of the `gradle` build tool.
* Latest Node.js LTS (22.x) is recommended, but any newer Node.js version should be also fine.

In particular, on OSX and Unix systems the most stable versions for Node.js are usually available from common package managers (e.g. homebrew, apt) and as such easy to install and to upgrade.

On Windows the use of [Chocolatey](https://chocolatey.org/) is highly recommended.

### Prerequisites Installation on *Ubuntu*

**Java 21 JDK**

`sudo apt install openjdk-21-jdk`

**Node.js**

`curl -sL https://deb.nodesource.com/setup_22.x | sudo -E bash -`

`sudo apt install nodejs`

or 

use NVM [link here](https://github.com/nvm-sh/nvm?tab=readme-ov-file#installing-and-updating)

### Prerequisites Installation on *MacOS*

**Homebrew Installation**

`/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"`

**Java 21**

`brew install openjdk@21`

> :warning: **WARNING**: After the installation is completed, one needs to pay attention to `brew` output, as it may be necessary to run additional commands to make `java` available in the `PATH`. When the `PATH` is updated, the terminal needs to be restarted for changes to take effect.

**Node.js**

`brew install node@22`

> :warning: **WARNING**: After the installation is completed, one needs to pay attention to `brew` output, as it may be necessary to run additional commands to make `node` available in the `PATH`. When the `PATH` is updated, the terminal needs to be restarted for changes to take effect.

or 

use NVM [link here](https://github.com/nvm-sh/nvm?tab=readme-ov-file#installing-and-updating)


### Prerequisites Installation on *Windows*
See [installation instruction](https://chocolatey.org/install) for [Chocolatey](https://community.chocolatey.org/).

**Java 21**

`choco install microsoft-openjdk -y`

**Node**

`choco install nodejs-lts -y`

## Running ResearchSpace in Development Mode

In development mode we recommend to run ResearchSpace with bundled blazegraph and digilib, but you can also run it with your own triplestore and iiif server.

When build is completed go to [http://localhost:10214/](http://localhost:10214/), where you should see the login screen. Default platform access username and password are  `admin:admin`

### ResearchSpace with bundled Blazegraph triplestore and Digilib IIIF Server

Enter the following into your terminal (for Linux and Mac):

```sh
./gradlew runAll
```

For Windows:
```sh
.\gradlew.bat runAll
```

Gradle will resolve some dependencies and then compile all sources and start the jetty server. Gradle watchs source directories for changes in order to trigger incremental compilation, so any change to the server-side or client-side sources triggers re-deployment, which takes no more than a few seconds until they are picked-up by Jetty.

Note, it may take a few minutes to complete starting the platform on the first run; it should be quicker on subsequent runs.

You should see console output similar to:

```
21:24:49 INFO  Jetty 9.4.24.v20191120 started and listening on port 10214
21:24:49 INFO   runs at:
21:24:49 INFO    http://localhost:10214/
21:24:49 INFO  Bigdata runs at:
21:24:49 INFO    http://localhost:10214/blazegraph
21:24:49 INFO  digilib runs at:
21:24:49 INFO    http://localhost:10214/digilib

***********************************************************************************************
***********************************************************************************************
**THIS IS REALLY IMPORTANT - THESE COMPONENTS ARE IMPORTANT **
**THIS IS REALLY IMPORTANT - THESE COMPONENTS ARE IMPORTANT **
**THIS IS REALLY IMPORTANT - THESE COMPONENTS ARE IMPORTANT **
**THIS IS REALLY IMPORTANT - THESE COMPONENTS ARE IMPORTANT **
```

### ResearchSpace with your own triplestore and IIIF server

Adjust `sparqlEndpoint`, `iiifScaler` and `imageStorageRoot` properties in the `gradle.properties`.
Then enter the following into your terminal (for Linux and Mac):

```sh
./gradlew run
```

For Windows:
```sh
.\gradlew.bat run
```

You should see console output similar to:

```
21:24:49 INFO  Jetty 9.4.24.v20191120 started and listening on port 10214
21:24:49 INFO   runs at:
21:24:49 INFO    http://localhost:10214/
```

## Testing and Debugging
### Testing
> :warning: **WARNING**: Chromium or Google Chrome browser is required for client-side tests.

Running `./gradlew test` command will execute all backend tests (Java JUnit) as well as client-side unit tests (using mainly mocha, chai, sinon). To just execute the client-side test, you can also run `npm run test`. We also have a number of integration tests, see `integration-tests`.

### Debugging

#### Backend
Run `./gradlew debugAll` if you are using digilib/blazegraph bundle or `./gradlew debug` for standalone platform.
Once the gradle console displays the message "Listening for transport dt_socket at address: 5005" you can connect to the respective port using, for example, the remote debugging functionality in Eclipse (Run -> Debug Configurations .. -> New "Remote Java Application" -> Choose a name, `localhost` as host and `5005` as port parameter).

#### Frontend
You can use standard browser developer tools for debugging the frontend. Furthermore, there is a dedicated plugin called "React Developer Tools" (available for Chrome, Firefox** for debugging and tracing states of React components.

There are several convenient specifics, if in the development mode:

**Source Attachments**

Sourcemaps are being attached (`webpack://./src`) i.e. you can debug in the Typescript code instead of the compiled JS code.

#### Backend Logging
The platform's backend is using log4j2 (and respective adapters) for logging. It is setup with four pre-configured log profiles.
The default profile is "debug", however, the profile can easily be switched by supplying the `build.sh -Dlog={log4j2-debug,log4j2-trace,log4j2-trace2,log4j2}` environment variable
in the gradle console. The `log4j2-trace` and `log4j2-trace2` profile produce a lot of log messages, however, they can be particularly useful when one needs to trace, for example, request headers or queries without goint to debug low level APIs.

## Building and Packaging
### Building WAR artefact
To build ResearchSpace WAR artefact that can be deployed into Java Servlet Container (like jetty), execute the following command, replace `VERSION_NUMBER` with some valid [semantic versioning](https://semver.org/) number.

`./gradlew clean war`

When the packaging process is complete you will find the .war file in `build/libs/ROOT-VERSION_NUMBER.war`.

### Creating a ZIP Bundle
It is possible to build ResearchSpace bundeled into a simple runnable zip archive together with blazegraph and digilib: `./gradlew clean buildZip`

### Building a Docker Image
The creation of the platform Docker image consists of packaging the ResearchSpace platform as a Java webapp (the .war file we have just created) in a Java servlet container, Jetty.

Dockerfile file is located in `dist/docker` folder. This file contains the instructions for building the platform's Docker image that is based on an official Jetty server as image.


To build the image first we need to copy artefacts produced by the platform build process.

**Copy artifacts to docker folder**

```
export DOCKER_FOLDER="$(pwd)/dist/docker"
cp build/libs/ROOT-*.war $DOCKER_FOLDER/platform/ROOT.war
mkdir $DOCKER_FOLDER/platform/config
cp src/main/resources/org/researchspace/apps/default/config/shiro.ini $DOCKER_FOLDER/platform/config/

```

**Build the image**

```
cd $DOCKER_FOLDER/platform
docker build -t researchspace:VERSION_TAG .
```

## Setting up Your IDE
You can use various IDEs and text editors like Eclipse, IDEA, VSCode, Emacs an VIM to work on the project. 

While there exist some add-ons for JavaScript and Typescript in Eclipse, it is in principle possible to develop everything in only one IDE, e.g. Eclipse or IDEA. However, in particular for the JavaScript/TypeScript development it can be convenient to use editors such as VSCode, Emacs or VIM with much more powerful plugins.

### Eclipse
If you are used to develop in Eclipse, you can automatically generate a new Eclipse project by executing the `./gradlew eclipse`, which is located in the project root folder.
The command will first resolve all required dependencies and then will automatically generate the classpath file as well as required Eclipse metadata files. Finally, you can import the project into your Eclipse Workspace using the "Existing Projects into Workspace" wizard.

### VSCode
There is predefined workspace configuration in the `.vscode/settings.json`, so the project can be directly opened in the VSCode.

We recommend to install the following plugins:
* [prettier plugin](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
* [eslint plugin](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)

When developing frontend code in the Visual Studio Code we recommend setting TypeScript compiler to locally installed one by clicking on compiler version number in the status bar while viewing any `*.ts` file.

## Codestyle & Linting

### Java

Generated eclipse project has predefined code formatter that is automatically enabled. Please always reformat your java code with eclipse before submiting PR. 

For Visual Studio Code users, follow this [guide](https://github.com/redhat-developer/vscode-java/wiki/Formatter-settings) to setup the formatter.

### Typescript & SCSS

We use [Prettier](https://prettier.io/) as code formatter for all `ts/tsx/js/scss` files. And [typescript-eslint](https://typescript-eslint.io) as a linter for typescript files.

## Advanced Topics
### Generate JSON Schema from JSDoc

To generate generate JSON schema from any TypeScript interface to use in the documentation with `mp-documentation`, execute the following command:

`npm run generate-schema <interface-name>`


### Troubleshooting
#### Security certificate issues when building the platform

If you are working in an institutional network and experience difficulties at the build stage due to security certificate errors, you may need to add your institution's security certificate to your computer's keychain, and to the keystore in your Java installation.
For example you may experience errors when trying to download Maven dependencies.

To add the certificate to your java keystore:

`keytool -import -alias example -keystore  /path/to/cacerts -file example.der`

You may also need to disable strict ssl settings in yarn:

`npm config set strict-ssl "false"`
