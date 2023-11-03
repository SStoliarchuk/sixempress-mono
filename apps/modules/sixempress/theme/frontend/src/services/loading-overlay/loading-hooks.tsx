import { HookActions } from "@stlse/frontend-connector";
import { LoadingOverlay } from "./loading-overlay";

export const loadingServiceHooks: HookActions = {
  sxmp_loading_get_status: () => LoadingOverlay.loading,
  sxmp_loading_set_status: (ctx, ret, v) => LoadingOverlay.loading = v,
  sxmp_loading_clear_all: () => LoadingOverlay.clearLoading(),
}