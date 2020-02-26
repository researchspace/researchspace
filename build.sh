#!/bin/bash
sbt -Djava.util.Arrays.useLegacyMergeSort=true "$@"
