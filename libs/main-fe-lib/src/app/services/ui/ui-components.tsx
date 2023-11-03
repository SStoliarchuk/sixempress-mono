import { ThemeProvider } from '@material-ui/core';
import React from 'react';
import { createGenerateClassName, StylesProvider } from "@material-ui/core";
import { UiSettings } from './ui-settings.service';


const gcn = createGenerateClassName({disableGlobal: true, seed: Math.random().toString()});

export function UiTransferContext(p: {children?: any}) {
  const theme = UiSettings.contentTheme;

  if (!theme)
    return (
      <StylesProvider generateClassName={gcn}>
        {p.children}
      </StylesProvider>
    );

  return (
    <StylesProvider generateClassName={gcn}>
      <ThemeProvider theme={theme}>
        {p.children}
      </ThemeProvider>
    </StylesProvider>
  )
}
