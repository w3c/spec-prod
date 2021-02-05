# Options

## Table of Contents

- General: [`TOOLCHAIN`](#toolchain), [`SOURCE`](#source)
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

## `VALIDATE_LINKS`

Whether or not to check for broken hyperlinks.

**Possible values:** Boolean (see end of page)

**Default:** true

## `VALIDATE_MARKUP`

Whether or not to validate markup using the [Nu Html Checker](https://github.com/validator/validator).

**Possible values:** Boolean (see end of page)

**Default:** true

## `GH_PAGES_BRANCH`

Whether or not to deploy to GitHub pages. Set to a Falsy value to not deploy, or provide a Git branch name to push to. You would need to enable GitHub pages publish source in repository settings manually.

**Possible values:**: Falsy (see end of page) or a git branch name.

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

**Default:** None.

## `W3C_NOTIFICATIONS_CC`

Comma separated list of email addresses to CC. This field is optional.

**Default:** None.

---

| Value Type | Possible values               |
| :--------- | :---------------------------- |
| Truthy     | y, yes, true, 1, on           |
| Falsy      | n, no, false, 0, off          |
| Boolean    | Truthy or Falsy               |
| None       | Indicates absence of a value. |
