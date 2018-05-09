# ResearchSpace
ResearchSpace Platform

### Prerequisites

* Unix-like terminal environment (e.g., Linux, Mac, Cygwin, etc)
* Docker
* git
* java 8
* sbt
* node
* yarn
___
### Browser compatibility

The ResearchSpace platform runs in Google Chrome (minimum version 53) and Mozilla Firefox (minimum version 58)  
Use of ResearchSpace in other browsers or older versions of Chrome or Firefox is not currently supported
___

### Prerequisites Installation Guide - *Ubuntu 16.04 (Xenial Xerus)*

#### Docker
1. Update your local package index
`sudo apt-get update`
2. Download docker package
`sudo apt-get install docker.io`
3. Test the installation
`sudo docker run hello-world`
4. Enable docker to run without using sudo, read the following [instructions](https://askubuntu.com/questions/477551/how-can-i-use-docker-without-sudo)

#### Git
`sudo apt-get install git`

#### Java 8
`sudo add-apt-repository ppa:openjdk-r/ppa`
`sudo apt-get update`
`sudo apt-get install openjdk-8-jdk`

#### Scala Interactive Build Tool
1. Install Scala
`sudo apt-get install scala`
2. Enable apt-get to find the sbt package
`echo "deb https://dl.bintray.com/sbt/debian /" | sudo tee -a /etc/apt/sources.list.d/sbt.list`
`sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 2EE0EA64E40A89B84B2DF73499E82A75642AC823`
`sudo apt-get update`
`sudo apt-get install sbt`

#### Node.js -- using version 6.x (versions 7 and 8 will also work)
`curl -sL https://deb.nodesource.com/setup_6.x -o nodesource_setup.sh`
`sudo bash nodesource_setup.sh`
`sudo apt-get install nodejs`

#### Yarn
`curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -`
`echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list`
`sudo apt-get update && sudo apt-get install yarn`
___

### Prerequisites Installation Guide -  *MacOS Sierra*
#### Homebrew Installation
`/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"`

#### Git
`brew install git`

#### Docker
1. [Go to the Get Docker for Mac](https://docs.docker.com/docker-for-mac/install/) and [Download Stable Docker Image](https://download.docker.com/mac/stable/Docker.dmg)
2. Open the image file and drag it into the Applications
3. Launch the Docker app and a blue whale will confirm if all is running well
4. Test Docker by running in the Terminal app
`docker run hello-world`

#### Java 8
Note, that by default Homebrew will install Java 9. Here are details of [how to install Java 8](http://www.lonecpluspluscoder.com/2017/10/08/installing-other-versions-of-the-java-jdk-via-homebrew/
)

`brew tap caskroom/versions`
`brew cask install java8`

#### Scala Interactive Build Tool
`brew install sbt`

#### Node.js
`brew install node`

#### Yarn
`brew install yarn`
___






## Platform Installation Guide

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
