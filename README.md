# Spec Prod | [Documentation 📘](https://w3c.github.io/spec-prod/)

This GitHub Action lets you:

- Build [ReSpec](https://github.com/w3c/respec) and [Bikeshed](https://github.com/tabatkins/bikeshed) specs.
- Validate generated document's markup and check for broken hyperlinks.
- Publish generated spec to GitHub Pages and/or w3.org (using Echidna).

## Basic Usage

During a pull request, the action:

- figures out if you're using ReSpec (`index.html`) or Bikeshed (`index.bs`)
- converts the ReSpec/Bikeshed source document to regular HTML
- runs broken hyperlink checker, and validate markup using W3C nu validator

Additionally, if a commit is pushed to the "main" branch, the action deploys the built specification to /TR/.

```yml
# .github/workflows/auto-publish.yml
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
          W3C_ECHIDNA_TOKEN: ${{ secrets.ECHIDNA_TOKEN }}
          # Replace following with appropriate value. See options.md for details.
          W3C_WG_DECISION_URL: https://lists.w3.org/Archives/Public/public-group/2014JulSep/1234.html
          # Usually, you want the following set too...
          W3C_BUILD_OVERRIDE: |
            shortName: your-specs-shortname-here
            specStatus: WD
```

## More examples

Learn from [usage examples](docs/examples.md), including:

- [Run as a validator on pull requests](docs/examples.md#run-as-a-validator-on-pull-requests)
- [Deploy to GitHub pages](docs/examples.md#deploy-to-github-pages)
- And more...

## Options

Read more about [the available options](docs/options.md)
