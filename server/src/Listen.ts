import ConsoleLog from "./ConsoleLog";

export default async function listen(
  serverName: string,
  server: any,
  port: number,
  host?: string,
  maxRetries = 5,
): Promise<number> {
  let retries = 0;
  let backOff = 1000;

  return new Promise((resolve) => {
    server.on('error', onError);

    _listen();

    function _listen() {
      server.listen(port, host, 511, () => {
        port = server.address().port;
        ConsoleLog.info(`Listening on ${serverName} port ${port}`);
        resolve(port);
      });
    }

    // Retry the listen with exponential back off
    function onError(err: any) {
      if (++retries < maxRetries) {
        setTimeout(() => _listen(), backOff *= 2);
      } else {
        console.error(`${serverName} listen error on port ${port}`, err);
        try {
          const electron = require("electron");
          if (electron && electron.dialog && electron.dialog.showErrorBox) {
            electron.dialog.showErrorBox(`AllProxy Port Error`, `${err}`);
          }
        } catch (e) { }
      }
    }
  });
}
