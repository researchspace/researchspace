# Contributing

ResearchSpace uses GitHub to manage reviews of pull requests.

* If you are a new contributor see: [How to setup development environment](README.md#developing-and-building-from-sources) and [Pull Request Checklist](#pull-request)
* If you have a trivial fix, documentation update or a small improvement, just create a PR with your change.
* If you plan to develop new feature or do a major change to the existing functionality, first discuss your ideas in GitHub issue or [our gitter channel][gitter].
* Contributors retain their copyright but agree to contribute code under the stated license documented on Github.
* You need to sign off on the [Developer Certificate of Origin](https://github.com/probot/dco#how-it-works) for transparency.
* Add yourself or your organization to copyright notice of the modified files.

## <a name="pull-request"></a> Pull Request Checklist

* PR branch is from the latest master branch. You may be asked to rebase your changes on the latest master before the merge.
* PR should be self-contained.
* For very small fixes it is appropriate to submit multiple changes in the same PR, but each change needs to be in its own commit. You may be asked to split your PR.
* Merge commits are not allowed.
* The documentation needs to be updated when creating or modifying features.
* For new server APIs tests are must have.
* Change confirms to ResearchSpace [Codestyle](README.md#codestyle--linting).
* All [Tests](README.md#testing) are green.

[gitter]: https://gitter.im/researchspace/community
