import { ConfirmModalComponent, LibModelClass, ModalService, SocketCodes, SocketDBObjectChangeMessage, SocketService } from "@sixempress/main-fe-lib";

export function listenAndUpdateOnConfigChange() {
  SocketService.on(SocketCodes.dbObjectChange, (msg: SocketDBObjectChangeMessage) => {
    if (msg.m !== LibModelClass.Configuration)
      return;
    
    openOnConfigChange();
  });
}

export function openOnConfigChange() {
  ConfirmModalComponent.open(
    'Riavvio pagina', 
    (<>
      E' stato eseguito un aggiornamento alle configurazioni del sistema<br/>
      Per applicare le nuove impostazioni e' necessario riavviare la pagina.<br/>
      Vuoi proseguire?<br/>
      <br/>
      Puoi chiudere questa schermata e riavviare manualmente.
    </>),
    (response) => response && window.location.reload(),
  )
}