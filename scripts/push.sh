#!/bin/sh

scripts=$(dirname $0)
msg=${@:-update $(date)}

$scripts/commit.sh "$@"
if [[ $? -eq 0 ]]; then
  git push -u
fi
