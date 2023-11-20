#!/bin/sh

msg=${@:-update $(date)}

git add .
git commit -am "$msg" --allow-empty
