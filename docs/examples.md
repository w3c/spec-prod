# Examples

## Run as a validator on pull requests

If you do not pass any inputs, it by default builds a ReSpec or Bikeshed document (`index.html` or `index.bs`) and validates the output. It does not deploy the built document anywhere.

```yaml
# .github/workflows/pr.yml
name: CI
on:
  pull_request: {}
jobs:
  main:
    name: Build and Validate
    runs-on: ubuntu-20.04
    steps:
      - uses: actions/checkout@v2
      - uses: w3c/spec-prod@v2
```

### Selectivly enable/disable validators

By default, both hyperlink and markup validators are enabled.

```yaml
# .github/workflows/pr.yml
name: CI
on:
  pull_request: {}
jobs:
  main:
    name: Build and Validate
    runs-on: ubuntu-20.04
    steps:
      - uses: actions/checkout@v2
      - uses: w3c/spec-prod@v2
        with:
          VALIDATE_LINKS: false
          VALIDATE_MARKUP: true
```

## Specify toolchain: Bikeshed or ReSpec

Specify `TOOLCHAIN` if the action cannot figure out the toolchain itself, or if you like to be explicit.

```yaml
# .github/workflows/pr.yml
name: CI
on:
  pull_request: {}
jobs:
  main:
    name: Build and Validate
    runs-on: ubuntu-20.04
    steps:
      - uses: actions/checkout@v2
      - uses: w3c/spec-prod@v2
        with:
          TOOLCHAIN: respec # or bikeshed
```

## Deploy to GitHub pages

Deployment is only done on `push` events. In this example:

- the document is built and validated as a check in the pull request.
- the document is built and validated, and then deployed to `gh-pages` branch, when a commit is pushed to the `main` branch.

```yaml
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

## Deploy to W3C using Echidna

```yaml
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
          W3C_ECHIDNA_TOKEN: ${{ secrets.ECHIDNA_TOKEN }}
          # Replace following with appropriate value. See options.md for details.
          W3C_WG_DECISION_URL: https://lists.w3.org/Archives/Public/public-group/2014JulSep/1234.html
```

### Use different `respecConfig` when deploying to W3C

```yaml
# Example: Override respecConfig for W3C deployment and validators.
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
          TOOLCHAIN: respec
          W3C_ECHIDNA_TOKEN: ${{ secrets.ECHIDNA_TOKEN }}
          W3C_WG_DECISION_URL: https://WG_DECISION_URL_FOR_MY_SPEC.com
          # Publish to w3.org/TR as a Working Draft (WD) under a different shortName.
          W3C_BUILD_OVERRIDE: |
            specStatus: WD
            previousMaturity: LC
            previousPublishDate: 2014-05-01
            shortName: my-custom-shortname
```

See [`W3C_BUILD_OVERRIDE`](options.md#w3c_build_override) and [`GH_PAGES_BUILD_OVERRIDE`](options.md#gh_pages_build_override) for details.
