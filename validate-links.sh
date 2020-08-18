if [ "$INPUTS_VALIDATE_LINKS" = "true" ]; then
  yarn global add href-checker
  href-checker "$OUTPUT_FILE" --no-same-site
else
  echo "Skipped."
fi
