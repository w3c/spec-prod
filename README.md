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

Additionally, if a commit is pushed to the "main" branch, the action deploys the built specification to /TR/.

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
          W3C_ECHIDNA_TOKEN: ${{ secrets.ECHIDNA_TOKEN }}
          # Replace following with appropriate value. See options.md for details.
          W3C_WG_DECISION_URL: https://lists.w3.org/Archives/Public/public-group/2014JulSep/1234.html
          # Usually, you want the following set too...
          W3C_BUILD_OVERRIDE: |
             shortName: your-specs-shortname-here
             specStatus: WD
```
# More Examples

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

**Note:** At present, each source might create its own commit in `GH_PAGES_BRANCH` even when content of other sources hasn't changed. This is because the build output for each source contains build date. Though, if you deploy multiple times in the same day, the noise will reduce effectively as the build date (hence the diff) hasn't changed. The situation will improve when [#8](https://github.com/w3c/spec-prod/issues/8) and [#14](https://github.com/w3c/spec-prod/issues/14) are fixed.

As a <em title="a cumbersome one!">workaround</em>, you can create separate workflows for each document and use GitHub Actions' [`on.<push|pull_request>.paths`](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions#onpushpull_requestpaths) as:

```yaml
# .github/workflows/pr-push-spec-1.yml
name: CI (spec-1)
on:
  pull_request:
    paths: ["spec-1/**"]
  push:
    branches: [main]
    paths: ["spec-1/**"]

jobs:
  main:
    name: Build, Validate and Deploy
    runs-on: ubuntu-20.04
    steps:
      - uses: actions/checkout@v2
      - uses: w3c/spec-prod@v2
        with:
          SOURCE: spec-1
          DESTINATION: the-spec
          GH_PAGES_BRANCH: gh-pages
          W3C_ECHIDNA_TOKEN: ${{ secrets.ECHIDNA_TOKEN }}
          W3C_WG_DECISION_URL: "https://lists.w3.org/Archives/Public/xyz.html"

# .github/workflows/pr-push-spec-2.yml
name: CI (spec-2)
on:
  pull_request:
    paths: ["spec-2/**"]
  push:
    branches: [main]
    paths: ["spec-2/**"]

jobs:
  main:
    name: Build, Validate and Deploy
    runs-on: ubuntu-20.04
    steps:
      - uses: actions/checkout@v2
      - uses: w3c/spec-prod@v2
        with:
          SOURCE: spec-2/spec.bs
          DESTINATION: spec-2/index.html
          GH_PAGES_BRANCH: gh-pages
          W3C_ECHIDNA_TOKEN: ${{ secrets.ECHIDNA_TOKEN }}
          W3C_WG_DECISION_URL: "https://lists.w3.org/Archives/Public/xyz.html"
```


## Options

## Table of Contents

- Build: [`TOOLCHAIN`](#toolchain), [`SOURCE`](#source), [`DESTINATION`](#destination), [`BUILD_FAIL_ON`](#build_fail_on), [`GH_PAGES_BUILD_OVERRIDE`](#gh_pages_build_override), [`W3C_BUILD_OVERRIDE`](#w3c_build_override)
- Validation: [`VALIDATE_LINKS`](#validate_links), [`VALIDATE_MARKUP`](#validate_markup)
- GitHub Pages: [`GH_PAGES_BRANCH`](#gh_pages_branch), [`GH_PAGES_TOKEN`](#gh_pages_token)
- W3C Publish: [`W3C_ECHIDNA_TOKEN`](#w3c_echidna_token), [`W3C_WG_DECISION_URL`](#w3c_wg_decision_url), [`W3C_NOTIFICATIONS_CC`](#w3c_notifications_cc)

## `TOOLCHAIN`

Toolchain to use.

**Possible values:** `respec`, `bikeshed`.

**Default:** None. Inferred from `SOURCE`: `respec` if an `index.html` exists, or `bikeshed` if an `index.bs` exists.

## `SOURCE`

Source file path.

**Possible values:** Any valid POSIX file path relative to repository root.

**Default:** None. Inferred from `TOOLCHAIN`: `index.html`/`index.bs` if exists.

## `DESTINATION`

Location of generated HTML document and other assets. This is useful when you've multiple specs in same repository.

**Possible values:** Any valid POSIX file path relative to repository root.

**Default:** `SOURCE`, with file extension set to `.html`.

| `SOURCE`          | `DESTINATION` | Location of generated spec | Assets copied to directory |
| ----------------- | ------------- | -------------------------- | -------------------------- |
| `index.bs`        | None          | `./index.html`             | `./`                       |
| `my-spec/`        | None          | `./my-spec/index.html`     | `./my-spec/`               |
| `path/to/spec.bs` | None          | `./path/to/spec.html`      | `./path/to/`               |
| `my-spec-src`     | `my-spec-out` | `./my-spec-out/index.html` | `./my-spec-out/`           |
| `index.html`      | `index.html`  | `./index.html`             | `./`                       |

## `BUILD_FAIL_ON`

Define exit behaviour on build errors or warnings.

**Possible values:** `"nothing"`, `"fatal"`, `"link-error"`, `"warning"`, `"everything"`.

| `BUILD_FAIL_ON` | Bikeshed               | ReSpec                 |
| --------------- | ---------------------- | ---------------------- |
| nothing         | `--die-on=nothing`     | Absent.                |
| fatal           | `--die-on=fatal `      | `--haltonerror` (`-e`) |
| link-error      | `--die-on=link-error`  | `--haltonerror` (`-e`) |
| warning         | `--die-on=warning `    | `--haltonwarn` (`-w`)  |
| everything      | `--die-on=everything ` | `-e -w`                |

**Default:** `"fatal"`.

## `GH_PAGES_BUILD_OVERRIDE`

Override Bikeshed metadata or ReSpec config for the GitHub Pages deployment.

**Possible values:** A string or [YAML Literal Block Scalar](https://stackoverflow.com/a/15365296) (multiline string) representing the override config/metadata as key-value pairs. That's mouthful, lets clarify using an example:

```yaml
# Example: Override Bikeshed metadata for GitHub Pages deployment
- uses: w3c/spec-prod@v2
  with:
    TOOLCHAIN: bikeshed
    GH_PAGES_BUILD_OVERRIDE: |
      status: w3c/WD
      TR: https://www.w3.org/TR/my-cool-spec/
    # Warning: The content in GH_PAGES_BUILD_OVERRIDE might look like YAML key-value pairs, but it's actually a string.
    # GitHub Actions allow only strings as input.
    #
    # Info: Above is same as running Bikeshed CLI like:
    # bikeshed spec INPUT OUTPUT --md-status="w3c/WD" --md-TR="https://www.w3.org/TR/my-cool-spec/"
```

**Default:** None.

Note that, you need to use Bikeshed-specific metadata (e.g. `status`) when using Bikeshed, and ReSpec-specific config (e.g. `specStatus`) when using ReSpec.

## `W3C_BUILD_OVERRIDE`

Override Bikeshed metadata or ReSpec config for the W3C Deployment and validators.

The Action will try to make use of metadata/config from previously published version, if available. For example, you do not need to manually provide `respecConfig.previousPublishDate` (or, `Previous Version` in case of Bikeshed) when publishing to W3C.

**Possible values:** Same as [`GH_PAGES_BUILD_OVERRIDE`](#gh_pages_build_override).

**Default:** None.

```yaml
# Example: Override respecConfig for W3C deployment and validators.
- uses: w3c/spec-prod@v2
  with:
    TOOLCHAIN: respec
    W3C_BUILD_OVERRIDE: |
      specStatus: WD
      shortName: my-custom-shortname
    # Warning: The content in W3C_BUILD_OVERRIDE might look like YAML key-value pairs, but it's actually a string.
    # GitHub Actions allow only strings as input.
    #
    # Info: Above is equivalent to running ReSpec CLI like:
    # respec -s index.html?specStatus=WD&shortName=my-custom-shortname… -o OUTPUT
```

## `VALIDATE_LINKS`

Whether or not to check for broken hyperlinks.

**Possible values:** true, false

**Default:** false

## `VALIDATE_MARKUP`

Whether or not to validate markup using the [Nu Html Checker](https://github.com/validator/validator).

**Possible values:** true, false

**Default:** true

## `GH_PAGES_BRANCH`

Whether or not to deploy to GitHub pages. Set to a Falsy value to not deploy, or provide a Git branch name to push to. You would need to enable GitHub pages publish source in repository settings manually.

**Possible values:**: None, or a git branch name.

**Default:** None

## `GH_PAGES_TOKEN`

GitHub Personal access token. This field is required only if the default GitHub actions token doesn't have enough permissions, or you want to have more control. Make sure to [pass it as a secret](https://docs.github.com/en/actions/configuring-and-managing-workflows/creating-and-storing-encrypted-secrets).

**Possible values:**: A valid personal GitHub token.

**Default:** [`GITHUB_TOKEN`](https://docs.github.com/en/actions/configuring-and-managing-workflows/authenticating-with-the-github_token)

## `W3C_ECHIDNA_TOKEN`

The automated publication workflow requires a [token](https://github.com/w3c/echidna/wiki/Token-creation) associated with the specification you want to publish. Working Group Chairs and W3C Team members can [request a token](https://www.w3.org/Web/publications/register) directly from the W3C. This can then be saved as `ECHIDNA_TOKEN` in your repository settings under ["Secrets"](https://user-images.githubusercontent.com/870154/81380287-f9579f80-914d-11ea-84bc-5707bff75dba.png).

**Possible values:** A valid Echidna token.

**Default:** None.

## `W3C_WG_DECISION_URL`

A URL to the working group decision to use auto-publish, usually from a w3c mailing list.

**Possible values:** A non-exhaustive list of possible values:

- WebApps WG: https://lists.w3.org/Archives/Public/public-webapps/2014JulSep/0627.html
- Media Capture WG: https://lists.w3.org/Archives/Public/public-media-capture/2015Dec/0031.html
- Second Screen WG: https://lists.w3.org/Archives/Public/public-secondscreen/2015Jun/0096.html
- Web RTC: https://lists.w3.org/Archives/Public/public-webrtc/2016Mar/0031.html
- Aria: https://lists.w3.org/Archives/Public/public-html-admin/2015May/0021.html
- Device APIs: https://lists.w3.org/Archives/Public/public-device-apis/2015Oct/att-0037/minutes-2015-10-15.html#item05
- Web Performance: https://lists.w3.org/Archives/Public/public-web-perf/2021Apr/0005.html

**Default:** None.

## `W3C_NOTIFICATIONS_CC`

Comma separated list of email addresses to CC. This field is optional.

**Default:** None.
