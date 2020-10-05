#!/usr/bin/env bash
set -e
if [ -z "$INPUTS_TOOLCHAIN" ]; then
    echo "Envirnoment variable \"INPUTS_TOOLCHAIN\" must be set."
    exit 1
fi

export PATH="$(yarn global bin):$PATH"
echo "$(yarn global bin)" >> $GITHUB_PATH
echo "PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1" >> $GITHUB_ENV
echo "PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome" >> $GITHUB_ENV
export PATH=$HOME/.local/bin:$PATH
echo "$HOME/.local/bin" >> $GITHUB_PATH

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
