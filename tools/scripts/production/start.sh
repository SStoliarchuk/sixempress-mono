#!/bin/bash
currdir=$(dirname $(readlink -f $0)); cd $currdir
cd ../../../

if [[ -z "$CERT_LIVE_DIRNAME_0" ]]; then
  echo "Must provide CERT_LIVE_DIRNAME_0 in environment" 1>&2
  exit 1
fi

# get the "production" script command from the package.json and execute it
$(cat package.json | grep \"production\": | sed "s/^.*\"production\":[^\"]*\"//g" | sed "s/\",//g")