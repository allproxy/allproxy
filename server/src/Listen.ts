export default async function listen (
  serverName: string,
  server: any,
  port: number,
  host?: string
): Promise<number> {
  let retries = 0;
  let backOff = 1000;

  return new Promise((resolve) => {
    server.on('error', onError);

    _listen();

    function _listen () {
      server.listen(port, host, 511, () => {
        port = server.address().port;
        console.log(`Listening on ${serverName} port ${port}`);
        resolve(port);
      });
    }

    // Retry the listen with exponential back off
    function onError (err: any) {
      if (++retries < 10) {
        setTimeout(() => _listen(), backOff *= 2);
      } else {
        console.error(`${serverName} listen error on port ${port}`, err);
      }
    }
  });
}
