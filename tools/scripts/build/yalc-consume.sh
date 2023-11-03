currdir=$(dirname $(readlink -f $0))
cd $currdir
cd ../../../

#frontend
yalc add @stlse/frontend-connector
yalc add @stlse/backend-connector
yalc add @stlse/modules-nx
