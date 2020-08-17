case $INPUTS_TYPE in
  respec)
    echo "Installing ReSpec..."

    mkdir -p $HOME/.npm-global
    npm config set prefix "$HOME/.npm-global"
    export PATH=$HOME/.npm-global/bin:$PATH
    echo "::add-path::$HOME/.npm-global"

    export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1
    npm install --global --silent respec
    echo "::set-env name=PUPPETEER_EXECUTABLE_PATH::/usr/bin/google-chrome"
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
