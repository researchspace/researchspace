#!/bin/bash

BRANCH_NAME="$1"

# script to determine the build type
# develop -> develop
# master -> develop
# develop-* -> develop (patch releases)
# release/* -> release
# feature/* -> CI
# bugfix/* -> CI
# hotfix/* -> CI
# otherwise -> CI

# Note: branch names are already normalized, e.g. release/ID-XXX is release-ID-XXX

if [[ "$BRANCH_NAME" = "develop" ]]; then
    echo "develop"
elif [[ "$BRANCH_NAME" = "master" ]]; then
    echo "develop"
elif [[ "$BRANCH_NAME" =~ develop-.+$ ]]; then
    echo "develop"
elif [[ "$BRANCH_NAME" =~ release-.+$ ]]; then
    echo "release"
elif [[ "$BRANCH_NAME" =~ feature-.+$ ]]; then
    echo "CI"
elif [[ "$BRANCH_NAME" =~ bugfix-.+$ ]]; then
    echo "CI"
elif [[ "$BRANCH_NAME" =~ hotfix-.+$ ]]; then
    echo "CI"
else
    echo "CI"
fi
