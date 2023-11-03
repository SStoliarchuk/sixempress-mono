import { deepmerge } from '@material-ui/utils';
import { Theme, CssBaseline, ThemeProvider } from '@material-ui/core';
import { DataStorageService } from "@sixempress/utilities";
import React, { useEffect, useState } from 'react';
import { UiSettings } from './ui-settings.service';


export function UiThemeProvider(p: { children: any, cacheKey?: string, deepMergeTheme?: {light?: Partial<Theme>, dark?: Partial<Theme>} }) {
  
  function getMerged(): Theme {
    return p.deepMergeTheme && p.deepMergeTheme[UiSettings.colorsTheme] 
      ? deepmerge(UiSettings.contentTheme, p.deepMergeTheme[UiSettings.colorsTheme])
      : UiSettings.contentTheme;
  }

  useEffect(() => {
    const fn = () => {
      p.cacheKey && DataStorageService.localStorage.setItem(p.cacheKey, UiSettings.colorsTheme);
      setTheme(getMerged());
    };

    // set the default and this triggers init functions
    UiSettings.colorsThemeChanges.addListener(fn);
    UiSettings.colorsTheme = p.cacheKey ? DataStorageService.localStorage.getItem(p.cacheKey) as 'dark' | 'light' || 'light' : 'light';
    return () => UiSettings.colorsThemeChanges.removeListener(fn);
  }, []);

  const [theme, setTheme] = useState<null | Theme>(null);
  if (!theme)
    return null;

  return (
    <>
      <CssBaseline />
      <ThemeProvider theme={theme} key={UiSettings.colorsTheme}>
        {p.children}
      </ThemeProvider>
    </>
  )
};

