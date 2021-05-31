## Getting started

To get started, do the following:

1. If you want to deploy to W3C /TR:
   1. [Request an Echidna token][request-token] for your spec (W3C Team Members and Chairs only!).
   1. [Save the token][save-token] as a "Secret" named `ECHIDNA_TOKEN` in the spec's repository's settings.
1. Create a `.github/workflows/auto-publish.yml` file at the root of the spec's repository.
1. In the `auto-publish.yml`, copy-paste and modify one of the [examples](examples.md) below that suits your needs. Most typical one:

   ```yml
   # Inside .github/workflows/auto-publish.yml
   name: CI

   on:
     pull_request: {}
     push:
       branches: [main]

   jobs:
     validate-and-publish:
       name: Validate and Publish to TR
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v2
         - uses: w3c/spec-prod@v2
           with:
             TOOLCHAIN: respec # or bikeshed
             W3C_ECHIDNA_TOKEN: ${{ secrets.ECHIDNA_TOKEN }}
             W3C_WG_DECISION_URL: " See Options for URLs! "
             # Convert Editor's Draft to Working Draft!
             W3C_BUILD_OVERRIDE: |
               specStatus: WD
   ```

[request-token]: https://www.w3.org/Web/publications/register
[save-token]: https://docs.github.com/en/actions/reference/encrypted-secrets#creating-encrypted-secrets-for-a-repository
