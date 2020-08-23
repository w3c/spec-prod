#!/usr/bin/env bash
source "./utils.sh"
require_env "INPUTS_TYPE"
require_env "INPUTS_SOURCE"

OUTFILE="tmp-output.html"

case $INPUTS_TYPE in
respec)
    echo "Converting ReSpec document '$INPUTS_SOURCE' to HTML..."
    respec -s "$INPUTS_SOURCE" -o "$OUTFILE"
    ;;
bikeshed)
    echo "Converting Bikeshed document '$INPUTS_SOURCE' to HTML..."
    bikeshed spec "$INPUTS_SOURCE" "$OUTFILE"
    ;;
esac

echo "::set-output name=output::$OUTFILE"
