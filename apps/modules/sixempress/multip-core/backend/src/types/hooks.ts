import * as _ from 'libs/main-be-lib/src/types/hooks';

export {};

declare global {
  interface filters {
    sxmp_is_website_connected: (state: {connected?: false | true, stockIssue?: 'loading' | false | true}) => any,
  }
}
