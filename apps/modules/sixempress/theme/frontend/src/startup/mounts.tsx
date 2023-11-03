import * as React from 'react';
import { AuthContext, HookFilters, ReactInfo } from '@stlse/frontend-connector';
import { DataStorageService } from '@sixempress/utilities';
import { RouterService } from '../services/router/router-service';
import { ModalService } from '../services/modal-service/modal.service';
import { Paper } from '@material-ui/core';
import { RouteDeclaration } from '../services/router/router.dtd';
import { LoginPage, LPState } from '../components/login/login-page';
import { SnackbarService } from '../services/snackbars/snackbar.service';
import { MainWrapper } from '../components/main-wrapper/main-wrapper';
import { IAvailableRoute } from '../components/main-wrapper/main-wrapper.dtd';
import { UiThemeProvider } from '../services/ui/ui-components';
import { CacheKeys } from '../utils/cache-keys';
import { LoadingOverlay } from '../services/loading-overlay/loading-overlay';

// import { testBrowser } from './startup/utils';

// (() => {
//   // test browser to be modern
//   const errors = testBrowser();
//   if (errors) { 
//     alert ('La versione di questo browser e\' troppo vecchia. Aggiornare il browser o usarne un altro');
//     throw errors;
//   }
// })();

export function logout() {
  use_action.sxmp_on_logout()
  clearToken();
  window.location.href = '/';
}

export const filterHooks: HookFilters = {
  // in case the instance will be refreshed, we update the token keys so that the next reload there are no issues
  // where we try to login with the old token and we're going to get asked again to refresh the instance
  stlse_on_instance_refresh: {
    priority: 1,
    fn: (ctx, ret) => {
      use_action.stlse_auth_save_cache(CacheKeys.stlseToken);
      return ret;
    }
  }
};

export function login_mount(props: Parameters<react_hooks['stlse_root_mount_point']>[0]) {
  const [isLogin, setIsLogin] = React.useState(false);
  return isLogin ? <RootMount/> : <RootLoginPage {...props} onLoginSuccess={() => setIsLogin(true)}/>
}


export function RootLoginPage(props: Parameters<react_hooks['stlse_root_mount_point']>[0] & {onLoginSuccess: () => void}) {
  const tknKey = CacheKeys.stlseToken;
  const stateKey = CacheKeys.lastEnteredUser;
  let state: Partial<LPState> = {};
  try { state = JSON.parse(DataStorageService.localStorage.getItem(stateKey)) } catch (e) {}

  const [tknTried, setTknTried] = React.useState(false);

  const saveCache = () => {
    const cacheState: Partial<LPState> = {slug: state.slug, username: state.username};
    DataStorageService.localStorage.setItem(stateKey, JSON.stringify(cacheState));

    // save and delete long term if not needed
    use_action.stlse_auth_save_cache(tknKey);
  }

  React.useEffect(() => {
    let token!: AuthContext;
    try { token = JSON.parse(DataStorageService.sessionStorage.getItem(tknKey) || DataStorageService.localStorage.getItem(tknKey)) }
    catch (e) {}

    if (!token)
      return setTknTried(true);

    (async () => {
      try {
        const r = await use_action.stlse_auth_load_cache(tknKey);
        if (!r)
          throw new Error('Cannot load from cache');

        // after the token is restored we can call connector
        await frontendConnector({authentication: {mode: 'refresh-token'}});
        saveCache();
        await use_action.sxmp_login_successful();
        await props.onLoginSuccess();
      }
      catch (e) {
        // we need to clear and reload due to the fact that the cache could contain additional frontend modules 
        // that will not be loaded with the user that is trying to login
        // with a token clear and reload we make sure no additional module is loaded
        clearToken();
        window.location.reload();
        return console.error(e);
      }
    })();

  }, []);

  const login = async (loginState: LPState) => {
    LoadingOverlay.loading = true;
    state = loginState;
    try {
      await frontendConnector({authentication: {
        mode: 'payload',
        instance: {type: 'slug', slug: loginState.slug},
        payload: {type: 'default', username: loginState.username, password: loginState.password},
      }});
  
      saveCache();
      await use_action.sxmp_login_successful();
      await props.onLoginSuccess();
    }
    catch (e) {
     LoadingOverlay.loading = false;
      console.error(e);
      alert('Username/Password Error');
    }
  }
  
  return (
    <Wrapper>
      <LoadingOverlay status={!tknTried}/>
      {tknTried && <LoginPage onLogin={login} showSlug initialState={state}/>}
    </Wrapper>
  );
}

export function RootMount() {
  const [sidebar] = React.useState<IAvailableRoute[]>(use_filter.sxmp_theme_sidebar([]));
  const [appRoutes] = React.useState<RouteDeclaration[]>(use_filter.sxmp_theme_app_routes([]));

  return (
    <Wrapper>
      <LoadingOverlay/>
      <SnackbarService/>
      <ModalService/>
      <React_use_hook ruhName='sxmp_theme_root_components'/>
      {/* <UiErrorService/> */}

      <RouterService routes={[{
        path: '',
        component: () => <MainWrapper onLogout={logout} sidebar={sidebar}/>,
        handleChildren: true,
        children: [
          ...appRoutes,
          {path: '__rwa', component: () => null},
          {path: '*', component: () => <Paper>404</Paper>}
        ]
      }]}/>
    </Wrapper>
  )
}

function clearToken() {
  use_action.stlse_auth_clear_all();
  DataStorageService.sessionStorage.removeItem(CacheKeys.stlseToken);
  DataStorageService.localStorage.removeItem(CacheKeys.stlseToken);
}

function Wrapper(p: {children: any}) {
  const toDeepMerge = use_filter.sxmp_mui_v4_theme_overrides({});
  return (
    // <GlobalErrorBoundary>
      <UiThemeProvider cacheKey={CacheKeys.appTheme} deepMergeTheme={toDeepMerge}>
        {p.children}
      </UiThemeProvider>
    // </GlobalErrorBoundary>
  )
}