import { HookActions } from "@stlse/frontend-connector";
import { SnackbarService } from "./snackbar.service";

export const snackbarServiceHooks: HookActions = {
  sxmp_snackbar_open(context, return_value, react, message, opts?) {
    return SnackbarService.openSimpleSnack(message, opts);
  },
  sxmp_snackbar_open_complex(context, return_value, react, content, opts?) {
    return SnackbarService.openComplexSnack(content, opts);
  },
}