export DOCKER_FOLDER="$(pwd)/dist/docker"
cp build/libs/ROOT-*.war $DOCKER_FOLDER/platform/ROOT.war
mkdir $DOCKER_FOLDER/platform/config
cd $DOCKER_FOLDER/platform
docker build -t artresearch/researchspace:16.12.2024 .
