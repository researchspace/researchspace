set SBT_OPTS=-Djava.util.Arrays.useLegacyMergeSort=true -Dsbt.override.build.repos=true -Dsbt.repository.config=./project/repositories %*
sbt 
