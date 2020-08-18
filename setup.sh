mkdir -p $HOME/.npm-global
npm config set prefix "$HOME/.npm-global"
export PATH=$HOME/.npm-global/bin:$PATH
echo "::add-path::$HOME/.npm-global/bin"
echo "::set-env name=PUPPETEER_SKIP_CHROMIUM_DOWNLOAD::1"
echo "::set-env name=PUPPETEER_EXECUTABLE_PATH::/usr/bin/google-chrome"
export PATH=$HOME/.local/bin:$PATH
echo "::add-path::$HOME/.local/bin"

case $INPUTS_TYPE in
  respec)
    echo "Installing ReSpec..."
    export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1
    npm install --global --silent respec
    ;;
  bikeshed)
    echo "Installing Bikeshed..."
    python3 -m pip --quiet install bikeshed
    bikeshed update
    ;;
  *)
    echo "Unknown type: $INPUTS_TYPE"
    exit 1
    ;;
esac
