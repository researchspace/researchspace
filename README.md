# ResearchSpace


The following documentation covers the setting up of the ResearchSpace Platform in **development** and **production** mode. 
The ResearchSpace platform's **browser compatibility** is **Google Chrome (minimum version 53)** and **Mozilla Firefox (minimum version 58)**.
Use of this platform in other browsers or older versions of Chrome or Firefox is not currently supported.

## Overview

#### Development mode: setting up the prerequisite tools and installing the platform
<ol>
<li><a href="#prerequisites">Prerequisites</a>
	<ul>
		<li>
			<a href="#ubuntu">Ubuntu 16.04 (Xenial Xerus) Installation Guide</a>
		</li>
		<li>
			<a href="#osx">MacOS Sierra Installation Guide</a>
		</li>
	</ul>
</li>

<li><a href="#platform">Platform Installation Guide</a></li>
<li><a href="#troubleshooting">Troubleshooting</a></li>
</ol>

## 

#### Production mode: packaging, dockerising and deploying 

<ol>
<!-- <li><a href="#basic">Basic manual deployment</a></li> -->
<li><a href="#deployusingdocker">Deploy using Docker</a></li>
<li><a href="#deployusingzipfile">Deploy using zip file</a></li>
<!--<li><a href="#otherservices">Setting up optional services</a></li> -->
<!--<li><a href="#automaticdeployment">Automating deployment</a></li> -->
</ol>

##



#### Development mode: setting up the prerequisite tools and installing the platform

<a name="prerequisites"></a>
##### Prerequisites

* Unix-like terminal environment (e.g., Linux, Mac, Cygwin, etc)
* Docker
* git
* java 8
* sbt
* node
* yarn

<a name="ubuntu"></a>
#### Prerequisites Installation Guide - *Ubuntu 16.04 (Xenial Xerus)*

##### Docker
1. Update your local package index
`sudo apt-get update`
2. Download docker package
`sudo apt-get install docker.io`
3. Test the installation
`sudo docker run hello-world`
4. Enable docker to run without using sudo, read the following [instructions](https://askubuntu.com/questions/477551/how-can-i-use-docker-without-sudo)

<a name="git"></a>
##### Git
`sudo apt-get install git`

##### Java 8
`sudo add-apt-repository ppa:openjdk-r/ppa`
`sudo apt-get update`
`sudo apt-get install openjdk-8-jdk`

##### Scala Interactive Build Tool
1. Install Scala
`sudo apt-get install scala`
2. Enable apt-get to find the sbt package
`echo "deb https://dl.bintray.com/sbt/debian /" | sudo tee -a /etc/apt/sources.list.d/sbt.list`
`sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 2EE0EA64E40A89B84B2DF73499E82A75642AC823`
`sudo apt-get update`
`sudo apt-get install sbt`

##### Node.js -- using version 6.x (versions 7 and 8 will also work)
`curl -sL https://deb.nodesource.com/setup_6.x -o nodesource_setup.sh`
`sudo bash nodesource_setup.sh`
`sudo apt-get install nodejs`

##### Yarn
`curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -`
`echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list`
`sudo apt-get update && sudo apt-get install yarn`

##

<a name="osx"></a>
#### Prerequisites Installation Guide -  *MacOS Sierra*
##### Homebrew Installation
`/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"`

##### Git
`brew install git`

##### Docker
1. [Go to the Get Docker for Mac](https://docs.docker.com/docker-for-mac/install/) and [Download Stable Docker Image](https://download.docker.com/mac/stable/Docker.dmg)
2. Open the image file and drag it into the Applications
3. Launch the Docker app and a blue whale will confirm if all is running well
4. Test Docker by running in the Terminal app
`docker run hello-world`

##### Java 8
Note, that by default Homebrew will install Java 9. Here are details of [how to install Java 8](http://www.lonecpluspluscoder.com/2017/10/08/installing-other-versions-of-the-java-jdk-via-homebrew/)

`brew tap caskroom/versions`
`brew cask install java8`

##### Scala Interactive Build Tool
`brew install sbt`

##### Node.js
We will use nvm to install node.

`brew install nvm`
`mkdir ~/.nvm`

Add the following to ~/.bash_profile or your desired shell configuration file:

```
export NVM_DIR="$HOME/.nvm"
 . "/usr/local/opt/nvm/nvm.sh"
```

Install node 8:

`nvm install v8.11.1`

##### Yarn

`brew install yarn`

## 

### Platform Installation Guide
<a name="platform"></a>
Enter the following into your terminal:

```sh
git clone https://github.com/researchspace/researchspace.git
cd researchspace
./build.sh compile
unzip example-data/blazegraph.jnl.zip -d example-data/
unzip example-data/assets.zip -d metaphactory/data/
docker run --name rs-blazegraph-default -d --restart=always -p 10080:8080 --env QUERY_TIMEOUT="30000" -v $(pwd)/example-data/:/blazegraph-data/:rw researchspace/blazegraph
mkdir metaphactory/apps
mkdir metaphactory/data/templates
ln -s $(pwd)/researchspace/app $(pwd)/metaphactory/apps/researchspace
echo "sparqlEndpoint=http://localhost:10080/blazegraph/sparql" >> runtime/config-dev/environment.prop
echo "appsDirectory=$(pwd)/metaphactory/apps" >> runtime/config-dev/environment.prop
./build.sh
```


This will:

1. Check out this code
2. Compile and initialise the some files using SBT in batch mode
3. Extract a sample Blazegraph database file
4. Extract a sample assets database
5. Start a Blazegraph instance in a docker container (with the sample database file mounted)
6. Configure the platform to use this Blazegraph instance as its default repository
7. Configure the platform to use the provided ResearchSpace App
8. Start the SBT build environment in interactive mode.

SBT will resolve some dependencies and present the SBT prompt.

At the SBT prompt, enter:

```sh
~jetty:start
```

This will start both the the backend core Java system and the frontend JavaScript/TypeScript app.

It may take a few minutes to complete on the first run; it should be quicker on subsequent runs.

You should see console output similar to

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

You can then go to `http://localhost:10214/` in your browser, and log in with `admin:admin`

## 

### Troubleshooting
<a name="troubleshooting"></a>
**Security certificate issues when building the platform**

If you are working in an institutional network and experience difficulties at the build stage due to security certificate errors, you may need to add your institution's security certificate to your computer's keychain, and to the keystore in your Java installation.
For example you may experience errors when trying to download Maven dependencies.

To add the certificate to your java keystore:

`keytool -import -alias example -keystore  /path/to/cacerts -file example.der`

You may also need to disable strict ssl settings in yarn:

`yarn config set strict-ssl "false"`



**Java version**

Mac users reported issues building the platform using Java 10. Setup of ResearchSpace is tested and working with Java 8. You are recommended to use [jEnv](http://www.jenv.be/) to manage multiple versions of Java if required.


##

### Production mode: packaging, dockerising and deploying 

<ol>
<!--<li><a href="#basic">Basic manual deployment</a></li>-->
<li><a href="#deployusingdocker">Deploy using Docker</a></li>
<li><a href="#deployusingzipfile">Deploy using zip file</a></li>
<!-- 
<li><a href="#otherservices">Setting up optional services</a></li>
<li><a href="#automaticdeployment">Automating deployment</a></li>
-->
</ol>

<!--
<a name="basic"></a>
#### Basic manual deployment

This guide presumes the use of [Blazegraph](https://www.blazegraph.com/download/) for a triplestore, and Jetty as a servlet container.
To build the platform in production mode it is necessary to package the current code:

```bash
./build.sh -DbuildEnv=prod
```

Then at the prompt:

```
package
```

When the packaging process is complete you will find the .war file here:

```
/target/platform-X.X-SNAPSHOT.war 
```

Rename the .war file to `ROOT.war` and add it to the `webapps` folder of Jetty.

[Download Blazegraph](https://www.blazegraph.com/download/) and add the `blazegraph.war` app to the `webapps` folder of Jetty.

In the project folder, create a file to configure Blazegraph called `RWStore.properties` with the following content:

```
# Note: These options are applied when the journal and the triple store are
# first created.

##
## Journal options.
##

# The backing file. This contains all your data.  You want to put this someplace
# safe.  The default locator will wind up in the directory from which you start
# your servlet container.
com.bigdata.journal.AbstractJournal.file=blazegraph.jnl

# The persistence engine.  Use 'Disk' for the WORM or 'DiskRW' for the RWStore.
com.bigdata.journal.AbstractJournal.bufferMode=DiskRW

# Setup for the RWStore recycler rather than session protection.
com.bigdata.service.AbstractTransactionService.minReleaseAge=1

# Enable group commit. See http://wiki.blazegraph.com/wiki/index.php/GroupCommit and BLZG-192.
#com.bigdata.journal.Journal.groupCommit=true

com.bigdata.btree.writeRetentionQueue.capacity=4000
com.bigdata.btree.BTree.branchingFactor=128

# 200M initial extent.
com.bigdata.journal.AbstractJournal.initialExtent=209715200
com.bigdata.journal.AbstractJournal.maximumExtent=209715200

##
## Setup for QUADS mode without the full text index.
##
com.bigdata.rdf.sail.truthMaintenance=false
com.bigdata.rdf.store.AbstractTripleStore.quads=true
com.bigdata.rdf.store.AbstractTripleStore.statementIdentifiers=false
com.bigdata.rdf.store.AbstractTripleStore.textIndex=true
com.bigdata.rdf.store.AbstractTripleStore.axiomsClass=com.bigdata.rdf.axioms.NoAxioms

# Bump up the branching factor for the lexicon indices on the default kb.
com.bigdata.namespace.kb.lex.com.bigdata.btree.BTree.branchingFactor=400

# Bump up the branching factor for the statement indices on the default kb.
com.bigdata.namespace.kb.spo.com.bigdata.btree.BTree.branchingFactor=1024

# Uncomment to enable collection of OS level performance counters.  When
# collected they will be self-reported through the /counters servlet and
# the workbench "Performance" tab.
#
# com.bigdata.journal.Journal.collectPlatformStatistics=true

```


Create a `config` folder in the project folder, containing an `environment.prop` file:

```bash
# In project folder
mkdir config
echo "sparqlEndpoint=http://localhost:10214/blazegraph/sparql" >> config/environment.prop
```

In the `environment.prop` file you can define the location of the SPARQL endpoint you will be using to access a triplestore. The configuration above assumes a locally running instance of Blazegraph.

Create an `apps` folder in the project folder.

Copy the `/researchspace/app` folder from the platform codebase to the `apps` folder, and rename it `researchspace`.

The project folder structure should now look like this:

```
project
│   RWStore.properties
│
└───config
│
└───apps
│   │
│   └───researchspace
│ 
└───jetty-distribution-9.xxx
    │   start.jar
    │
    └───webapps
           ROOT.war
           blazegraph.war
```


Now start Jetty with the following command, where `$JETTYFOLDER` is the path to Jetty and `$SCRIPTFOLDER` is the project folder:

```
java -jar "$JETTYFOLDER/start.jar" jetty.base="$JETTYFOLDER" -Dorg.eclipse.jetty.server.Request.maxFormContentSize=100000000 -Djetty.port=10214 -Dcom.bigdata.rdf.sail.webapp.ConfigParams.propertyFile="$SCRIPTPATH/RWStore.properties" -Dcom.metaphacts.config.baselocation="$SCRIPTPATH/config" -DruntimeDirectory="$SCRIPTPATH/" -Dlog4j.configurationFile="$LOG4J2"
```

The platform will be available in your browser at: http://localhost:10214.  You can log in with user `admin`, password `admin`. -->

##

<a name="deployusingdocker"></a>
#### Deploying using Docker

To be able to deploy the platform with predictable results on a range of hardware it is recommended to package it into [Docker](docker.com) images which can be run as virtual servers (containers) providing a known, tested and reproducible software environment. This is particularly important where the platform is run with additional dependencies such as LDAP authentication, or the IIIF image server. Using pre-tested Docker containers to run such services eliminates the need for troubleshooting software compatibility issues related to versioning of code libraries or operating systems.


Create **new Docker images** created from the ResearchSpace codebase  

**Build the platform**

Build the platform in production mode:

```bash
# Starting from the root of the project
./build.sh -DbuildEnv=prod
```

Then at the prompt:

```bash
package
```

When the packaging process is complete you will find the .war file here:

```bash
/target/platform-X.X-SNAPSHOT.war 
```



**Build the Docker images**

a. Platform image

The creation of the platform Docker image consists of packaging the ResearchSpace platform as a Java app (the .war file we have just created) in a Java servlet container, Jetty.

Rename the .war file created in the last step to `ROOT.war` and move it to the folder from where you will run the docker build instructions to create the Docker image for the platform: `/researchspace/dist/docker/platform/`

You should see a Dockerfile file in that folder. This file contains the instructions for the building of the platform Docker image, including the instruction to retrieve a copy of the Jetty server as a Docker image.

The instructions in the Dockerfile require an additional folder, `etc`, to be present for the build to complete successfully. We can put that resource in place using the following commands:

```bash
# Starting from the root of the project
cp -r metaphactory/webapp/etc researchspace/dist/docker/platform/
```



Now we are ready to build the Docker image for the platform. Before we do this we need to decide which Docker repository the image will be stored in. If it is a custom repository, its url will be used as the namespace, or first part of the Docker image's name, for example  `docker.researchspace.org`. If however the image will be stored on the `hub.docker.com` site, we can just use the account name as the namespace. If we don't need to share the image in a repository the namespace can be an arbitrary value. In this example we will use `researchspace` as the namespace.

Change into the directory with the Dockerfile in it:

   ```bash
# Starting from the root of the project
cd researchspace/dist/docker/platform
   ```


Build the Docker image:

   ```bash
docker build -t researchspace/platform:latest .
   ```

The value after the colon is the image Tag, and is used to distinguish between versions of the same image. **Take note of the full stop at the end**, it is required.


When the build has completed, type:

   ```bash
docker images
   ```


and you should see the Docker image you just created in the list of Docker images on your computer.

That is the process for building one Docker image. Now we need to build the other required images before running them as Docker containers to have a working system:

   

   b. Platform data image

   ```bash
# Starting from the root of the project
# Copy required resources to build folder
cp -r metaphactory/data researchspace/dist/docker/data/
cp -r metaphactory/config researchspace/dist/docker/data/
# Enter build folder
cd researchspace/dist/docker/data
# Start the image build
docker build -t researchspace/platform-data:latest .
   ```

   

   c. Default templates image

   ```bash
# Starting from the root of the project
# Make templates folder
mkdir -p researchspace/dist/docker/app-default-templates/data/templates

# Copy required resources into build folder
cp metaphactory/data/templates/*.* researchspace/dist/docker/app-default-templates/data/templates/

echo "plugin.id=metaphactory-default-templates\nplugin.provider=Metaphacts\nplugin.version=0.1\nplugin.templateMergeStrategy=overwrite\n" >> researchspace/dist/docker/app-default-templates/plugin.properties

# Enter build folder
cd researchspace/dist/docker/app-default-templates

# Build the Docker image
docker build -t researchspace/app-platform-default-templates:latest .
   ```

   

   d. ResearchSpace app image

   ```bash
# Starting from the root of the project
# Enter build folder
cd researchspace/app

# Build the Docker image
docker build -t researchspace/researchspace-app:latest .
   ```

   

   e. LDAP image (optional)

   See the README.mf file in `researchspace/dist/docker/openldap` for full information.

   ```bash
# Starting from the root of the project
# Enter build folder
cd researchspace/dist/docker/openldap

# Build LDAP service in production mode
docker-compose -f docker-compose.yml -f docker-compose.production.yml up -d
   ```



**Create and run the Docker containers**

Check that you have succeeded in creating the Docker images:

```bash
docker images
```



Get the most recent Docker image of Blazegraph:

```bash
docker pull researchspacepublic/blazegraph:2.2.0-RC-2016_12_09-researchspace-geo
```



```bash
# Create the empty blazegraph journal container
sudo docker create --name rs-blazegraph-journal -v /blazegraph-data ubuntu

# Create a container for the blazegraph app itself, making reference to the empty volume that we previously created
sudo docker run --name rs-blazegraph -d --restart=always -p 10080:8080 --env QUERY_TIMEOUT="30000" --env JAVA_OPTS="" --volumes-from rs-blazegraph-journal researchspacepublic/blazegraph:2.2.0-RC-2016_12_09-researchspace-geo

# Create the researchspace app container
docker create --name rs-app researchspace/researchspace-app:latest

# Create the data volume
sudo docker create --name rs-data researchspace/platform-data:latest
 
# Create the container for the platform and link to the blazegraph instance and volumes
sudo docker run --name rs-platform -d --restart=always -p 10214:8080 --link rs-blazegraph:blazegraph --volumes-from rs-app --volumes-from rs-data --env PLATFORM_OPTS=" -Dconfig.global.homePage=Start -Dconfig.environment.sparqlEndpoint=http://blazegraph:8080/blazegraph/sparql " researchspace/platform:latest
```



The platform will be available in your browser at: `http://localhost:10214`.  You can log in with user `admin`, password `admin`.



 


<a name="deployusingzipfile"></a>
#### Deploy using Zip file

It is possible to specify the creation of a zip file when building the platform source code. The resultant file can be decompressed to a folder which contains all the resources necessary to run the platform: the platform web app, the Blazegraph database, and the Jetty servlet container. A simple start script is provided for both Windows and Unix environments.
This makes for an easy-to-run instance of the ResearchSpace platform, but has the disadvantage of making the platform more difficult to update. 



When the platform source code is built in production mode, a Java web app is created which can be deployed using common servlet containers such as Jetty or Tomcat. This app contains the backend Java code for handling RDF data, authentication and REST services, and the bundled Javascript code which will be downloaded by users and run in the browser to render the front end of the platform.

The minimum requirement to run a production version of ResearchSpace, therefore, is a Java servlet container running the platform app, and a running instance of an RDF database (triplestore) implementing a standard SPARQL endpoint interface, which the platform can connect to either locally or on an external machine. The recommended triplestore is [Blazegraph](https://www.blazegraph.com/), which is free to use.

#### 

   ```bash
   # Starting from the root of the project
   ./build.sh -DnoYarn=true -DbuildEnv=prod -DzipConfig=./researchspace/dist/zip/researchspace.ini -DplatformVersion=1.0.0 clean platformZip
   ```

   

   A zip file will be created here:

   ```bash
   /target/platform-X.X-SNAPSHOT.zip
   ```

   

   Move this zip file to another location and decompress it. In the resultant folder you will find a `start.bat` file for Windows, and a `start.sh` file for Linux and Mac.
   In Windows you can double-click the .bat file to start the ResearchSpace platform and Blazegraph.
   In the Linux or Mac terminal `cd` to the folder containing the start file and type the following command:

   ```bash
   ./start.sh
   ```

   The platform will be available in your browser at: `http://localhost:10214`.  You can log in with user `admin`, password `admin`.


