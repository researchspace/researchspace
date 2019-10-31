# Metaphacts Platform Development

## Quick Overview
The development workspace (i.e. the root folder) is divided into these parts:

* `metaphacts-platform` - core metaphacts platform;
* `project` - all build related artifacts (SBT script, Webpack config, etc);
* additional extension folders - extensions for backend services and/or frontend components.

For the frontend we are using Yarn for dependency management, Webpack for bundling.

We use SBT as a single entry point for compiling and bundling the sources, whereas the SBT build script calls Webpack for compiling and bundling the frontend part.
The file `build.(sh|bat)` located in the root directory, provides a simple wrapper around SBT in order to set some required build parameters as well as points to a dedicated maven proxy.

## Core Platform Overview

* `metaphacts-platform/core` - platform backend

  Developed in Java 8. Mainly builds upon RDF4J 2.0 (formerly known as openrdf-sesame) for processing and handling RDF data, Guice for dependency injection, Apache Shiro for security matters and Jersey for developing RESTful services.

  Maven dependencies are being managed in the file `project/dependencies.scala` and will automatically be imported and resolved by the SBT based build script.

* `metaphacts-platform/client-api` - platform client

  Initial Java 8 based client to (remotely) connect to the platform. Provides dedicated interfaces for accessing assets and services such as queries. Provides some further utils ontop of RDF4J.

* `metaphacts-platform/web` - platform frontend

  Developed in Typescript and compiled to clean, simple JavaScript code which runs on any browser. Mainly using React for web-component development, SCSS for stylesheets.

## Development Setup

### Prerequisites
It is possible to use an unix-based OS as well as Windows for development against the platform. As prerequisites you need to have installed on your machine:

* OpenJDK 8 (preferred, but Oracle JDK 8 is fine too)
* Node.js 8.x
* SBT
* Yarn
* an RDF database or at least access to such (see section below)

In particular, on OSX and Unix systems the most stable versions for SBT and Node.js are usually available from common package managers (e.g. homebrew, apt) and as such easy to install and to upgrade.
On Windows the use of [Chocolatey](https://chocolatey.org/) is highly recommended.

### RDF Database (Triplestore)

For most developments (i.e. for starting-up the platform properly) you will need to have a RDF database in place. The database does not necessarily need to run on your local machine as long as it is accessible over a standard conform SPARQL endpoint interface. For your convenience, we recommend to run, for example, Blazegraph as a container on your local docker daemon so you can easily run serveral databases in parallel and switch between them:

1. Login into DockerHub: `docker login`
2. Pull latest blazegraph image: `docker pull metaphacts/blazegraph-basic:2.2.0-20160908.003514-6`
3. Run Blazegraph container with local storage mounted as data volume: `docker run --name blazegraph -d --restart=always -p 10080:8080 --env JAVA_OPTS="" -v /home/user/path-to-blazegraph-journal:/blazegraph-data metaphacts/blazegraph-basic:2.2.0-20160908.003514-6`

Where `/home/user/path-to-blazegraph-journal-folder` is the folder on the host system where blazegraph journal will be stored.

**Please note that on Windows, it is required to first activate sharing of drives through `Docker Desktop App > Settings > Shared Drives`. You can afterwards specify the folder like `C:\path-to-blzaegraph-journal`**

Afterwards, **connect your development setup to the SPARQL endpoint** as exposed by the Blazegraph container running on your docker machine by adding `sparqlEndpoint=http://localhost:10080/blazegraph/sparql` to your `runtime/config/environment.prop` configuration file. The folder structure and the `environment.prop file` do not exist right after checkout and have to be created manually or will be created during first build run.

### IDE
At metaphacts we are using various IDEs and text editors like Eclipse, IDEA, VSCode, Atom and Emacs. While there exist some addons for JavaScript and Typescript in Eclipse, it is in principle possible to develop everything in only one IDE, e.g. Eclipse or IDEA. However, in particular for the JavaScript/TypeScript development it can be convenient to use editors such as VSCode, Atom or Emacs with much more powerful plugins.

### Initial Setup

#### NPM Dependencies
Simply execute `sh build.sh` or `build.bat` to get into the SBT console. While loading the build script, it will automatically invoke `yarn install` within the platform-web folder to install all npm depdencies using Yarn. This may take some time.

#### Eclipse
If you are used to develop in Eclipse, you can automatically generate a new Eclipse project by executing the `build.sh`, which is located in the project root folder.
Once in the SBT console, execute the command `eclipse` which will first resolve all required dependencies and then will automatically generate the classpath file as well as required Eclipse metadata files. Finally, you can import the project into your Eclipse Workspace using the "Existing Projects into Workspace" wizard.

#### VSCode
When developing frontend code in the Visual Studio Code we recommend setting TypeScript compiler to locally installed one by clicking on compiler version number in the status bar while viewing any `*.ts` file, or manually setting `"typescript.tsdk": "project/webpack/node_modules/typescript/lib"` in the `.vscode/settings.json`.

#### Known Issues
* Git - do not clone the project from GIT using Eclipse (c.f. this [bug report](https://bugs.eclipse.org/bugs/show_bug.cgi?id=342372));
* IntelliJ IDEA - should add `-Dsbt.override.build.repos=true -Dsbt.repository.config=./project/repositories` to VM parameters when importing the project (c.f. this [answer](https://stackoverflow.com/questions/26933523/why-intellij-cant-find-sbt-snapshot-dependencies/27173389#27173389)).

## Running the Platform
Once being in the SBT console (`sh build.sh`), run `~jetty:start` which will compile all sources and start the jetty server. The tilde `~` will make SBT to watch source directories for changes in order to trigger incremental compilation, so any change to the server-side or client-side sources triggers re-deployment, which takes no more than a few seconds until they are picked-up by Jetty.

Finally, go to [http://127.0.0.1:10214/](http://127.0.0.1:10214/). You should see the login screen and should be able to login with standard login `admin:admin`.

## Debugging

### Backend
Run `build.sh` with an additional parameter `-Ddebug=true` will open a remote debugging port when starting jetty with `~jetty:start`.
Once the SBT console displays the message "Listening for transport dt_socket at address: 5005" you can connect to the respective port using, for example, the remote debugging functionality in Eclipse (Run -> Debug Configurations .. -> New "Remote Java Application" -> Choose a name, `localhost` as host and `5005` as port parameter).

### Frontend
At metaphacts we are using standard browser developer tools for debugging the frontend. Furthermore, there is a dedicated plugin called "React Developer Tools" (available for Chrome, Firefox) for debugging and tracing states of React components.

There are several convenient specifies, if being in the development mode:

* Hot-Reloading

  Changes to JS/TS and CSS/LESS files are compiled and pushed during runtime. We are using so called "hot loaders" which will try to "swap" changes live into the client application i.e. without the need to reload the entire page in the browser.

* Source Attachments

  Sourcemaps are being attached (`webpack://./src`) i.e. you can debug in the Typescript code instead of in the compile JS code.

* Save app data directly to checked-out working copy of repository

  Base plaform app `metaphacts-platform` and other attached apps are directly available for write. This means any changes to the storage-based data (templates, configuration, namespaces, etc) will be applied directly to the working directory which is managed by git.

## Backend Logging
The platform's backend is using log4j2 (and respective adapters) for logging and comes with four pre-configured log profiles.
The default profile is "debug", however, the profile can easily be switched by supplying the `build.sh -Dlog={log4j2-debug,log4j2-trace,log4j2-trace2,log4j2}` environment variable
to the sbt console. The `log4j2-trace` and `log4j2-trace2` profile produce a lot of log messages, however, can particularly be useful when one needs to trace, for example, request headers or queries without goint to debug low level APIs.

**Please note:** If an old `log4j2.xml` file is still present in the compilation `/target/webapp/WEB-INF` folder, it will always be be preceded over the file set via the `-Dlog` env variable. Execute `clean` and `clean-files` in the sbt console to clean the target folder.

## Codestyle & Linting

### Java

You will find a readymade Java checkstyle file in `project/checkstyle.xml`. We recommend to use the [eclipse-cs](https://github.com/checkstyle/eclipse-cs) plugin. You can install the plugin if you drag&drop the following link into your eclipse: [Install](http://marketplace.eclipse.org/marketplace-client-intro?mpc_install=150) . Afterwards  you should create a new global check configuration and import the checkstyle file: Preferences -> Checkstyle -> New… -> Name "metaphacts-platform" -> Import … (Select from `project/checkstyle.xml`) -> Set as Default (optional).

### Typescript & SCSS

You will find a `tslint.json` file in the root folder of the project, which should automatically be recognised by your IDE and respective linting extensions. Make sure that your IDE has installed the latest tslint plugin/extension, i.e.  the `tslint@1.0.x` extension in Visual Code (View -> Extensions -> search … 'tslint' ) is deprecated and you should install `tslint@1.2.x` or newer, which is a separate extension and requires to uninstall the old extension.

## Testing
Running `test` command in the SBT console will execute all backend tests (Java JUnit) as well as client-side unit tests (using mainly mocha, chai, sinon). To just execute the client-side test, you can also run `npm run test` in the `project/webpack` folder. We also have a number of integration tests, see `researchspace/integration-tests`.

## Packaging
Run `build.sh -DbuildEnv=prod` and then `package`. The compiled war file will be copied to `/target/platform-*.war` and can be deployed using common servlet containers such as Jetty or Tomcat.

## Generate JSON Schema from JSDoc

To generate generate JSON schema from any TypeScript interface to use in the documentation with `mp-documentation`, add interface name to `platform-web-build.json` under `generatedJsonSchemas` property and execute the following command at `project/webpack` directory:

`yarn run generate-schema <project-name> <interface-name>`

## Troubleshooting

* We have been reported that fetching and installing dependencies may fail on the first run, i.e. when running `build.(bat|sh)` initially, there might be random `npm` errors/race conditions. These are typically related to compiling certain `npm` (peer/dev)  dependencies  (depending on the node.js version and operation system being used) . Usually running `build.(bat|sh)` a second time will solve the issue. Once the dependencies are compiled/installed, these will be cached unless running `build.(bat|sh) clean`.

