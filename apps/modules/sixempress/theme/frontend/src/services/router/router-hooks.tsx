import { HookActions, HookReact } from "@stlse/frontend-connector";
import { RouterService } from "./router-service";

export const routerServiceHooks: HookActions = {
  sxmp_router_reload_page: (ctx, ret, ...args) => RouterService.reloadPage(...args),
  sxmp_router_goto: (ctx, ret, ...args) => RouterService.goto(...args),
  sxmp_router_back: (ctx, ret, ...args) => RouterService.back(...args),
  sxmp_router_get_current_path: (ctx, ret, ...args) => RouterService.getCurrentPath(...args),
  sxmp_router_match: (ctx, ret, ...args) => RouterService.match(...args),
}
export const routerServiceReactHooks: HookReact = {
  sxmp_router_outlet: () => RouterService.Outlet,
}