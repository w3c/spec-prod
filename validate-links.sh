if [ "$INPUTS_VALIDATE_LINKS" = "true" ]; then
  npx href-checker "$OUTPUT_FILE" --no-same-site
else
  echo "Skipped."
fi
