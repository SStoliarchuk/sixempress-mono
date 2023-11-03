import { HookActions } from "@stlse/frontend-connector";
import { NotificationsService } from "./notifications.service";

export const notificationServiceHooks: HookActions = {
  sxmp_notification_add: (ctx, ret, ...args) => NotificationsService.addNotification(...args),
  sxmp_notification_remove: (ctx, ret, ...args) => NotificationsService.removeNotification(...args),
}