export function upgradeHtml() {
  const currSrc = document.currentScript.getAttribute('src');
  const split = currSrc.split('/').slice(0, -1);
  const urlBase = split.join('/');

  document.querySelector('html').setAttribute('lang', 'it');
  document.querySelectorAll('title').forEach(n => n.remove());
  document.querySelector('link[rel="icon"]')?.remove();
  document.head.innerHTML += `
    <meta name="robots" content="noindex, nofollow">
		<meta name="theme-color" content="#424242" />
		
		<!-- Different favicons icons -->
		<link rel="shortcut icon" sizes="32x32" href="${urlBase}/assets/favicon.ico"/>
		<link rel="icon" type="image/png" sizes="32x32" href="${urlBase}/assets/images/32.png"/>
		<link rel="icon" type="image/png" sizes="96x96" href="${urlBase}/assets/images/96.png"/>
		<link rel="icon" type="image/png" sizes="192x192"  href="${urlBase}/assets/images/192.png"/>
		
		<!-- Some config for apple -->
		<meta name="apple-mobile-web-app-status-bar-style" content="black">
		<meta name="apple-mobile-web-app-capable" content="yes">

		<!-- iPhone ICON -->
		<link rel="apple-touch-icon" sizes="57x57" href="${urlBase}/assets/images/57.png">
		<link rel="apple-touch-icon" sizes="60x60" href="${urlBase}/assets/images/60.png">
		<link rel="apple-touch-icon" sizes="72x72" href="${urlBase}/assets/images/72.png">
		<link rel="apple-touch-icon" sizes="76x76" href="${urlBase}/assets/images/76.png">
		<link rel="apple-touch-icon" sizes="114x114" href="${urlBase}/assets/images/114.png">
		<link rel="apple-touch-icon" sizes="120x120" href="${urlBase}/assets/images/120.png">
		<link rel="apple-touch-icon" sizes="144x144" href="${urlBase}/assets/images/144.png">
		<link rel="apple-touch-icon" sizes="152x152" href="${urlBase}/assets/images/152.png">
		<link rel="apple-touch-icon" sizes="180x180" href="${urlBase}/assets/images/180.png">
		<link rel="apple-touch-icon" sizes="256x256" href="${urlBase}/assets/images/256.png">
		<link rel="apple-touch-icon" sizes="512x512" href="${urlBase}/assets/images/512.png">
		<link rel="apple-touch-icon" sizes="1024x1024" href="${urlBase}/assets/images/1024.png">

		<link rel="manifest" href="${urlBase}/assets/manifest.json" />
    <title>SIXEMPRESS</title>
  `;
}

// <!DOCTYPE html>
// <html lang="en">
//   <head>
//     <meta charset="utf-8" />
//     <title>Loading...</title>
//     <base href="/" />

//     <meta name="viewport" content="width=device-width, initial-scale=1" />
//     <link rel="icon" type="image/x-icon" href="favicon.ico" />
//   </head>
//   <body>
//     <div id="root"></div>
//   </body>
// </html>
