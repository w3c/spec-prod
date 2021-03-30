#!/usr/bin/env bash

function skip() {
  echo "[SKIP] No relevant files have changed."
  export SPEC_PROD_SKIP=1
  if [[ -n "${GITHUB_ENV}" && -e "${GITHUB_ENV}" ]]; then
    echo "SPEC_PROD_SKIP=1" >> $GITHUB_ENV
  fi
  exit 0
}

skip
