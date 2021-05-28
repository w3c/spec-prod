## Getting started

To get started, do the following:

1. [Request an Echidna token](https://www.w3.org/Web/publications/register) for your spec (W3C Team Members and Chairs only!).
1. Save the token as a "Secret" in the spec's repository's settings.
1. Create a ".github/workflows/auto-publish.yml" file at the root of the spec's repository.
   If you are using VS Code:
   ```bash"
   code .github/workflows/auto-publish.yml
   ```
1. In to the "auto-publish.yml", copy, paste, and modify an one of the
   [[[#examples]]] below that suits your needs. Most typical one:

   ```yml
     # Inside .github/workflows/auto-publish.yml
     name: Node CI

     on:
       push:
       branches:
         - main
       pull_request: {}

     jobs:
       validate-and-publish:
       name: Validate and Publish to TR
       runs-on: ubuntu-latest # only linux supported at present
       steps:
         - uses: actions/checkout@v2
         - uses: w3c/spec-prod@v2
         with:
           TOOLCHAIN: respec # or bikeshed
           W3C_ECHIDNA_TOKEN: ${{ secrets.ECHIDNA_TOKEN }}
           W3C_WG_DECISION_URL: " SEE BELOW FOR URLS! "
           # Consider enabling link validation!
           # VALIDATE_LINKS: true
           # Convert Editor's Draft to Working Draft!
           W3C_BUILD_OVERRIDE: |
           specStatus: WD
   ```

1. For the `W3C_WG_DECISION_URL` URLS, please see [[[#w3c_wg_decision_url]]].
