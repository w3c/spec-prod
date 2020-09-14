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
      - uses: sidvishnoi/spec-prod@v1
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
      - uses: sidvishnoi/spec-prod@v1
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
      - uses: sidvishnoi/spec-prod@v1
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
      - uses: sidvishnoi/spec-prod@v1
        with:
          GH_PAGES_BRANCH: gh-pages
```

## Deploy to W3C using Echidna

Presently, only ReSpec documents are supported. See [#12](https://github.com/sidvishnoi/spec-prod/issues/12).

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
      - uses: sidvishnoi/spec-prod@v1
        with:
          W3C_ECHIDNA_TOKEN: ${{ secrets.ECHIDNA_TOKEN }}
          # Replace following with appropriate values. See options.md for details.
          W3C_MANIFEST_URL: https://w3c.github.io/REPO/MANIFEST
          W3C_WG_DECISION_URL: https://lists.w3.org/Archives/Public/public-group/2014JulSep/1234.html
```
