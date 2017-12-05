#!/bin/bash
sbt -Djava.util.Arrays.useLegacyMergeSort=true -Dsbt.override.build.repos=true -Dsbt.repository.config=./project/repositories "$@"
