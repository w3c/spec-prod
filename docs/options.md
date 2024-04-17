# Options

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

Note that, you need to use [Bikeshed-specific metadata](https://tabatkins.github.io/bikeshed/) (e.g. `status`) when using Bikeshed, and [ReSpec-specific config](https://respec.org/docs/#configuration-options) (e.g. `specStatus`) when using ReSpec.

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

## `VALIDATE_INPUT_MARKUP`

Whether or not to validate the markup of the input document using the [Nu Html Checker](https://github.com/validator/validator). This option is unlikely to be useful for Bikeshed documents, or for ReSpec documents based on markdown.

**Possible values:** true, false

**Default:** false

## `VALIDATE_WEBIDL`

Whether or not to validate the Web IDL that the spec may define.

Spec authoring tools may already include some level of Web IDL validation but that validation may be restricted to detecting syntax errors. The action also checks additional constraints defined in [Web IDL](https://heycam.github.io/webidl/) such as usage of dictionaries as function parameters or attributes. The action will automatically skip validation if the spec does not define any Web IDL.

Note that the Web IDL validation is restricted to the spec at hand and cannot validate that references to IDL constructs defined in other specs are valid. As such, there may remain IDL errors that can only be detected by tools that look at all specs in combination such as [Webref](https://github.com/w3c/webref)).

**Possible values:** true, false

**Default:** true

## `VALIDATE_LINKS`

Whether or not to check for broken hyperlinks.

**Warning:** This feature is experimental.

**Possible values:** true, false

**Default:** false

## `VALIDATE_MARKUP`

Whether or not to validate markup of the generated document using the [Nu Html Checker](https://github.com/validator/validator).

**Possible values:** true, false

**Default:** true

## `GH_PAGES_BRANCH`

Whether or not to deploy to GitHub pages. Set to a Falsy value to not deploy, or provide a Git branch name to push to. You would need to enable GitHub pages publish source in repository settings manually.
When this option is set, you need to ensure that the `GITHUB_TOKEN` for the job running spec-prod has [`write` access to the `contents` scope](https://docs.github.com/en/actions/security-guides/automatic-token-authentication#permissions-for-the-github_token).

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
- Device APIs: https://lists.w3.org/Archives/Public/public-device-apis/2021May/0008.html
- Web Performance: https://lists.w3.org/Archives/Public/public-web-perf/2021Apr/0005.html
- WebAppSec: https://lists.w3.org/Archives/Public/public-webappsec/2015Mar/0170.html
- Web Payments WG: https://www.w3.org/2016/04/14-wpwg-minutes.html#item02

**Default:** None.

## `W3C_NOTIFICATIONS_CC`

Comma separated list of email addresses to CC. This field is optional.

**Default:** None.

## `ARTIFACT_NAME`

Name for artifact which will be uploaded to workflow run. Required to be unique when building multiple documents in same job.

**Possible values:** Any valid artifact name.

**Default:** `"spec-prod-result"` or inferred from `SOURCE`.
