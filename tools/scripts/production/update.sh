#!/bin/bash
currdir=$(dirname $(readlink -f $0)); cd $currdir
cd ../../../

git fetch
git reset origin/build --hard
# clears the folder from the binaries
# https://stackoverflow.com/questions/5613345/how-to-shrink-the-git-folder
git repack -a -d --depth=250 --window=250