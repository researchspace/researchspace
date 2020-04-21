# Docker Image


This docker image hosts the platform and is derived from the official Jetty image. 


## Links

* [Official Jetty Docker image](https://hub.docker.com/_/jetty/)
* [Jetty version history](https://github.com/eclipse/jetty.project/blob/jetty-9.4.x/VERSION.txt)
* [Repository](https://github.com/docker-library/docs/tree/master/jetty) containing the Dockerfile of the official Jetty image.
Follow the links in the readme to get to the desired version corresponding to the FROM clause of our base Dockerfile

## Building the image locally


### Build the application zip

```
./build.sh -no-colors -DbuildEnv=prod -Dbuildjson=./path/to/xxx-root-build.json -DplatformVersion=3.2.0 platformZip
```

### Copy artifacts to docker folder

```
export DOCKER_FOLDER="$(pwd)/metaphacts-platform/dist/docker"
cp target/platform-*.war $DOCKER_FOLDER/platform/ROOT.war
mkdir $DOCKER_FOLDER/platform/etc
cp metaphacts-platform/webapp/etc/* $DOCKER_FOLDER/platform/etc
mkdir $DOCKER_FOLDER/platform/config
cp -r path/to/app/config/* $DOCKER_FOLDER/platform/config
```

### Build the image

```
cd $DOCKER_FOLDER/platform
docker build -t platform:snapshot .
```

