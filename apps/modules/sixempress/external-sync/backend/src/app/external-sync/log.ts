declare type log = ((...args: any[]) => void) & { error: (...args: any[]) => void };

export const log = (...args) => _log('LOG', ...args);
log.error = (...args) => _log('ERROR', ...args);

function _log(type: 'LOG' | 'ERROR', ...args: any[]) {
  for (let i = 0; i < args.length; i++) {
    if (args[i] instanceof Error)
      args[i] = {message: args[i].message, name: args[i].name, stack: args[i].stack};
    else if (args[i] instanceof Map || args[i] instanceof Set)
      args[i] = (args[i] as Set<any> | Map<any, any>).entries();
  }

  console.log(JSON.stringify({type, time: new Date().toISOString(), data: args}));  
}