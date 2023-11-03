currdir=$(dirname $(readlink -f $0)); cd $currdir

ssh-keygen -P "" -t rsa -b 4096 -m pem -f id_rsa
ssh-keygen -f id_rsa.pub -m 'PEM' -e > id_rsa.pub.pem

cp id_rsa ../../../apps/be-system-control/env
cp id_rsa.pub ../../../apps/be-system-control/env
cp id_rsa.pub.pem ../../../apps/be-system-control/env

cp id_rsa ../../../apps/be-multi-purpose/env
cp id_rsa.pub ../../../apps/be-multi-purpose/env
cp id_rsa.pub.pem ../../../apps/be-multi-purpose/env

rm id_rsa
rm id_rsa.pub
rm id_rsa.pub.pem