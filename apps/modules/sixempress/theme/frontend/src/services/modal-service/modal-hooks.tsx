import { HookActions, ReactInfo } from "@stlse/frontend-connector";
import { ComponentClass } from "react";
import { ReactAdd } from "../../types/hooks";
import { ModalService } from "./modal.service";
import { ModalComponentProps } from "./modal.service.dtd";

export const modalServiceHooks: HookActions = {
  sxmp_modal_open(context, return_value, react, c, componentProps?, modalProps?, modalComponent?) {
    return ModalService.open(wrapChildForModalService(react, c), componentProps, modalProps, modalComponent);
  },
  sxmp_modal_close_all: () => {
    ModalService.closeAll();
  }
}


export const wrapChildForModalService = (reactAdd: ReactAdd, c: any) => {
  // const ogReact = globalThis.__stlse.globalRuh;
  // TODO allow to use the jsx props passed back
  // console.log(props.modalRef.closeButton);
  // props.modalRef.closeButton = 'hello' as any;
  const react = reactAdd.react;
  const Wrap = reactAdd.wrap;
 
  const getWrapped = (C: any) => (props: ModalComponentProps) => {
    const child = typeof C  === 'function' || (C as ComponentClass).prototype ? <C {...props}/> : C;
    return (
      <React_use_hook ruhName={false} ruhReact={react}>
        {Wrap ? <Wrap>{child}</Wrap> : child}
      </React_use_hook>
    );
  };

  if (c.content)
    c.content = getWrapped(c.content);
  else
    c = getWrapped(c);

  // // for calendar
  // c.__rawContent = Children;

  if (c.actions)
    c.actions = getWrapped(c.actions);

  return c;
}
