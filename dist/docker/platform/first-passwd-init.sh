#!/bin/sh

# exit on any error
set -e

# check if this is the first boot of an instance and if the instance_id is available (mounted folder of the docker host machine)
if [ "$GENERATE_researchspace_PASSWORD" ] && [ -f "/instance_metadata/instance_id.txt" ] && [ ! -f "/firstStart/first-run-done" ]; then

  echo "Creating first login password..."

  # the password
  export EL_password="$(cat /instance_metadata/instance_id.txt)"

  # create shiro sha256 hash with the instance_id as password
  java -jar /firstStart/shiro-tools-hasher-2.0.2-cli.jar -f shiro2 -a argon2id --iterations 500000 -gs $EL_password > /firstStart/admin-hash.file

  # sanity check that the file is available and not empty
  if [ ! -s "/firstStart/admin-hash.file" ]; then
    echo "Error: /firstStart/admin-hash.file is empty!"
    exit 2;
  fi

  # read standard roles for the user admin from default file
  # grep the line with the admin rolres, which starts with admin=$shiro and then remove everything before the list of roles, which is delimited by "=," from the hash
  ADMIN_ROLES=`grep '^admin="\$shiro' /runtime-data/config/shiro.ini | sed 's/^admin="[^"]*",//'`


  #remove the standard users (admin, guest, anonymous) from shiro.ini, creating backup file
  sed -i.first-start-bak '/admin="\$shiro/d' /runtime-data/config/shiro.ini
  sed -i '/guest="\$shiro/d' /runtime-data/config/shiro.ini 
  sed -i '/anonymous="\$shiro/d' /runtime-data/config/shiro.ini

  # read has into variable
  ADMIN_HASH=`cat /firstStart/admin-hash.file`

  # insert new admin and hash into tmp shiro.ini file
  awk -v hash=$ADMIN_HASH -v roles=$ADMIN_ROLES '/\[users\]/ {print;print "admin=\""hash"\","roles;next}1' /runtime-data/config/shiro.ini > /firstStart/tmp.shiro
  # replace shiro.ini with new one
  cat /firstStart/tmp.shiro > /runtime-data/config/shiro.ini

  # set file as marker that first run completed successfully
  touch /firstStart/first-run-done
fi
