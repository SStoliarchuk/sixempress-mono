FROM node:18.12.1-alpine3.15 as development
  WORKDIR /code

  # install composer for wordpress plugins
  # from: https://github.com/geshan/docker-php-composer-alpine/blob/master/Dockerfile
  RUN apk --update add wget curl git php7 php7-curl php7-openssl php7-iconv php7-json php7-mbstring php7-phar php7-dom --repository http://nl.alpinelinux.org/alpine/edge/testing/ && rm /var/cache/apk/*
  RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/bin --filename=composer 

  # needed for node-gyp <- node-sass
  RUN apk add g++ make py3-pip alpine-sdk

  COPY ./infrastructure/package.cache.1.json /code/package.json
  RUN yarn install

  COPY ./composer.json /code/composer.json
  RUN composer install

  # final check to ensure all packages are recent
  COPY ./.yalc /code/.yalc
  COPY ./package.json /code/package.json
  RUN yarn install

  ENV PATH /code/node_modules/.bin:$PATH

  CMD ["true"]

# TODO use only 1 alpine versfion and set as base for multi stage
# and manually install node with nvm
# instead of using oficial node image
#
# Or maybe use official node image but make sure alpine version is the same ?
FROM alpine:3.17.0 as production
  CMD ["true"]

# in order to have smaller images we copy only the target output
FROM production as production-raw-files
  COPY ./dist/apps/modules/sixempress/raw-files/backend/main.pkg /raw-files.pkg
