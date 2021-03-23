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

### Selectively enable/disable validators

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

### Change output location for built files

By default, output location is mapped to the `SOURCE`. You can change that by providing a [`DESTINATION`](options.md#destination).

```yaml
# .github/workflows/push.yml
name: CI
on:
  push:
    branches: [main]
jobs:
  main:
    name: Deploy to GitHub pages
    runs-on: ubuntu-20.04
    steps:
      - uses: actions/checkout@v2
      - uses: w3c/spec-prod@v2
        with:
          GH_PAGES_BRANCH: gh-pages
          TOOLCHAIN: bikeshed
          SOURCE: src/spec.bs
          DESTINATION: specification/index.html # `src/spec.html` if not provided.
          # Deployment will be available at: https://<org>.github.io/<repo>/specification/
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
            shortName: my-custom-shortname
```

See [`W3C_BUILD_OVERRIDE`](options.md#w3c_build_override) and [`GH_PAGES_BUILD_OVERRIDE`](options.md#gh_pages_build_override) for details.

## Multiple specs in same repository

If you've multiple documents in the same repository, you can provide source-destination pairs to build, validate and deploy each one separately.

**Note:** At present, each source might create its own commit in `GH_PAGES_BRANCH` even when content of other sources hasn't changed. This is because the build output for each source contains build date. Though, if you deploy multiple times in the same day, the noise will reduce effectively as the build date (hence the diff) hasn't changed. The situation will improve when [#8](https://github.com/w3c/spec-prod/issues/8) and [#14](https://github.com/w3c/spec-prod/issues/14) are fixed.

```yaml
name: CI
on:
  pull_request: {}
  push:
    branches: [main]
jobs:
  main:
    name: Build, Validate and Deploy
    runs-on: ubuntu-20.04
    strategy:
      matrix:
        include:
          - source: spec.html
            destination: index.html
          - source: spec-1
            destination: the-spec
          - source: spec-2
            # destination defaults to spec-2/index.html
    steps:
      - uses: actions/checkout@v2
      - uses: w3c/spec-prod@v2
        with:
          SOURCE: ${{ matrix.source }}
          DESTINATION: ${{ matrix.destination }}
          GH_PAGES_BRANCH: gh-pages
          W3C_ECHIDNA_TOKEN: ${{ secrets.ECHIDNA_TOKEN }}
          W3C_WG_DECISION_URL: "https://lists.w3.org/Archives/Public/xyz.html"
```
