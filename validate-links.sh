if [ "$INPUTS_VALIDATE_LINKS" = "false" ]; then
  echo "Skipped."
  exit 0
fi

yarn global add href-checker
href-checker "$OUTPUT_FILE" --no-same-site
