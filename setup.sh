#!/usr/bin/env bash
set -e
if [ -z "$INPUTS_TOOLCHAIN" ]; then
    echo "Envirnoment variable \"INPUTS_TOOLCHAIN\" must be set."
    exit 1
fi

export PATH="$(yarn global bin):$PATH"
echo "::add-path::$(yarn global bin)"
echo "::set-env name=PUPPETEER_SKIP_CHROMIUM_DOWNLOAD::1"
echo "::set-env name=PUPPETEER_EXECUTABLE_PATH::/usr/bin/google-chrome"
export PATH=$HOME/.local/bin:$PATH
echo "::add-path::$HOME/.local/bin"

case $INPUTS_TOOLCHAIN in
respec)
    echo "Installing ReSpec..."
    export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1
    yarn global add respec
    ;;
bikeshed)
    echo "Installing Bikeshed..."
    python3 -m pip --quiet install bikeshed
    bikeshed update
    ;;
esac
