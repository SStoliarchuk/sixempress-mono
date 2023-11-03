set -e

currdir=$(dirname $(readlink -f $0)); cd $currdir

if [ -n "$(git status --porcelain)" ]; then
  echo "There are uncommited changes"
  exit 1;
fi

cd $currdir
./yalc-consume.sh

cd ../../../

rm -rf dist
yarn build-all
if [[ ! $1 == '--notest' ]]; then
  yarn d-kill
  yarn bbb-test
  yarn d-kill
fi
mkdir -p tmp
rm -rf tmp/__dist_build
mv dist tmp/__dist_build

git checkout build
git fetch
git rebase origin/main
# git merge main -X theirs --no-commit --no-ff
rm -rf .git/MERGE_HEAD # https://stackoverflow.com/a/31257966

rm -rf dist
mv tmp/__dist_build dist

set +e
git add -A * 
git commit --amend -m "Build"
git push --force

# move back to main branch while preserving the build output
rm -rf tmp/__dist_build
mv dist tmp/__dist_build
git checkout main
mv tmp/__dist_build dist
