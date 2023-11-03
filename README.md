# Sixempress

Version 2.0

why patch-package for wordpress:
- forcing wp-env to not expose ports on 0.0.0.0, but isntead through nginx ssl
- disabling tests containers to not use memory

pkg --public:
- it seems modules-sixempress-external-sync does not work without the --public flag
- i think the issue may be something else. TODO test

## Wordpress plugin

### run
yarn wp-env start
yarn nx build wordpress-sxmp-external-sync
yarn d-dev-wp nginx
https://admin.sixempress.com:18899/

### Notes
woocommerce zip taken from https://developer.woocommerce.com/releases/