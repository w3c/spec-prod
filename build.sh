source_file="$INPUTS_SOURCE"
if [ -z "$source_file" ]; then
  case $INPUTS_TYPE in
    bikeshed) source_file="index.bs" ;;
    *) source_file="index.html" ;;
  esac
fi

if [ ! -f "$source_file" ]; then
  echo "Source file '$source_file' does not exist."
  exit 1
fi

OUTFILE="tmp-output.html"

case $INPUTS_TYPE in
  respec)
    echo "Converting ReSpec document '$source_file' to HTML..."
    respec -s "$source_file" -o "$OUTFILE"
    ;;
  bikeshed)
    echo "Converting Bikeshed document '$source_file' to HTML..."
    bikeshed spec "$source_file" "$OUTFILE"
    ;;
  *)
    echo "Unknown type: $INPUTS_TYPE"
    exit 1
    ;;
esac
