# Contributing to Metaphacts Platform

## Branch Organization

We are using ["A successful Git branching model"](http://nvie.com/posts/a-successful-git-branching-model/) so `master` is stable one and all development is happening in the `develop` branch.

## Submitting the Change

* make sure that there are no Typescript errors (you can run `npm run typescript` in the `platform-web` folder to verify that)
* all tests should be green (`./build.sh test` for back-end tests and `npm run test` for front-end tests)
* your change doesn't introduce new `tslint` or `checkstyle` warnings
* if there is a JIRA ticket related to the change, please try to put the ticket id in the beginning of the commit message
* if it makes sense, don't forget to update CHANGELOG.md. We are trying to follow ["Keep a CHANGELOG"](http://keepachangelog.com/en/0.3.0/), with the only difference that we also put a git hash of the corresponding commit
* please, don't rewrite the history while feature is in review stage, address review comments with new commit and then squash them when feature is approved


## Code Guidelines

* 2 spaces indentation for ts/scss, 4 for Java
* avoid usage of default imports in Typescript, e.g instead of `import X form 'x'` prefer `import {Y} from x`. Or use `*` import for commonly used utilities, e.g `import * as _ from 'lodash';`. The reason is that default imports significantly complicate refactoring.
