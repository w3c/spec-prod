#!/usr/bin/env bash
source "./utils.sh";
require_env "INPUTS_VALIDATE_MARKUP"
require_env "OUTPUT_FILE"

if [ "$INPUTS_VALIDATE_MARKUP" = "false" ]; then
  echo "Skipped."
  exit 0
fi

yarn global add vnu-jar --silent

export NODE_PATH="$(yarn global dir)/node_modules/"
vnu_jar=$(node -p "require('vnu-jar')")

echo "Validating $OUTPUT_FILE..."
java -jar "$vnu_jar" --also-check-css "$OUTPUT_FILE"
if [ $? -eq 0 ]; then
  echo "✅  Looks good! No HTML validation errors!"
else
  echo "❌  Not so good... please fix the issues above."
  exit 1
fi
