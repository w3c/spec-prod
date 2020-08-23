function require_env() {
  param=$1
  if [ -z ${!param} ]; then
    echo "Envirnoment variable "$1" must be set."
    exit 1
  fi
}
