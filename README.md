# Spec Prod

This GitHub Action lets you:

- Build [ReSpec](https://github.com/w3c/respec) and [Bikeshed](https://github.com/tabatkins/bikeshed) specs.
- Validate generated document's markup and check for broken hyperlinks.
- Publish generated spec to GitHub Pages and/or w3.org (using Echidna).

## Basic Usage

During a pull request, the action:

- figures out if you're using ReSpec (`index.html`) or Bikeshed (`index.bs`)
- converts the ReSpec/Bikeshed source document to regular HTML
- runs broken hyperlink checker, and validate markup using W3C nu validator

Additionally, if a commit is pushed to the "main" branch, the action deploys the built specification to the "gh-pages" branch.

```yml
# .github/workflows/pr-push.yml
name: CI
on:
  pull_request: {}
  push:
    branches: [main]

jobs:
  main:
    name: Build, Validate and Deploy
    runs-on: ubuntu-20.04
    steps:
      - uses: actions/checkout@v2
      - uses: w3c/spec-prod@v2
        with:
          GH_PAGES_BRANCH: gh-pages
```


View all [**Available options** in docs](docs/options.md).

## [Examples of Usage](docs/examples.md)

Read usage examples in [docs/options.md](docs/options.md).
