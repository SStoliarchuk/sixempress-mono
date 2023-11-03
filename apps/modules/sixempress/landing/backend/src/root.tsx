import React from 'react';

export type RootProps = {
  title?: string;
  description?: string;
  headTags?: React.ReactNode | React.ReactNode[];
  children: React.ReactNode;
};

export function Root(props: RootProps): any {
  if (typeof window === 'object') {
    return props.children;
  }

  return (
    <html>
      <head>
        <title>{props.title || "SIXEMPRESS - Business Intelligence"}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#000000"/>
        
        {/* <!-- Different favicons icons --> */}
        <link rel="shortcut icon" sizes="32x32" href="/assets/favicon.ico"/>
        <link rel="icon" type="image/png" sizes="32x32" href="/assets/images/32.png"/>
        <link rel="icon" type="image/png" sizes="96x96" href="/assets/images/96.png"/>
        <link rel="icon" type="image/png" sizes="192x192"  href="/assets/images/192.png"/>
        
        {/* <!-- Some config for apple --> */}
        <meta name="apple-mobile-web-app-status-bar-style" content="black"/>
        <meta name="apple-mobile-web-app-capable" content="yes"/>

        {/* <!-- iPhone ICON --> */}
        <link rel="apple-touch-icon" sizes="57x57" href="/assets/images/57.png"/>
        <link rel="apple-touch-icon" sizes="60x60" href="/assets/images/60.png"/>
        <link rel="apple-touch-icon" sizes="72x72" href="/assets/images/72.png"/>
        <link rel="apple-touch-icon" sizes="76x76" href="/assets/images/76.png"/>
        <link rel="apple-touch-icon" sizes="114x114" href="/assets/images/114.png"/>
        <link rel="apple-touch-icon" sizes="120x120" href="/assets/images/120.png"/>
        <link rel="apple-touch-icon" sizes="144x144" href="/assets/images/144.png"/>
        <link rel="apple-touch-icon" sizes="152x152" href="/assets/images/152.png"/>
        <link rel="apple-touch-icon" sizes="180x180" href="/assets/images/180.png"/>
        <link rel="apple-touch-icon" sizes="256x256" href="/assets/images/256.png"/>
        <link rel="apple-touch-icon" sizes="512x512" href="/assets/images/512.png"/>
        <link rel="apple-touch-icon" sizes="1024x1024" href="/assets/images/1024.png"/>

        <meta charSet="utf-8" />
        {props.description && (<meta name='description' content="SIXEMPRESS e' un gestionale modulare gratuito che puo' essere completamente personalizzato per adattarsi alle esigenze della tua attivita'" />)}
      </head>
      <body>
        <div id="root">{props.children}</div>
      </body>
    </html>
  );
}
