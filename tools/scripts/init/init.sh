#!/bin/bash

currdir=$(dirname $(readlink -f $0)); cd $currdir

# load base files
docker compose -f ../../../infrastructure/docker-compose.prod.yml cp ./system_control mongo:/tmp/
docker compose -f ../../../infrastructure/docker-compose.prod.yml exec mongo mongorestore --db=system_control /tmp/system_control

./gen_be_comm_keys.sh

echo ""
echo ""
echo ""
echo ""
echo "Manual steps required:"
echo "Update password with pepper from: ../../../apps/be-system-control/env/.env"
echo "Update db server certs with: ../../../apps/be-system-control/env/id_rsa.pub.pem"
echo "Update servernode endpoints with the correct URI"
echo ""
echo ""
echo ""
echo ""
