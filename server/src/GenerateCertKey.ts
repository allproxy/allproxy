import Proxy from '../../node-http-mitm-proxy';
import Paths from './Paths';

let theCa: any;
Proxy.ca.create(Paths.sslCaDir(), function (_err: any, ca: any) {
  theCa = ca;
});

const generateCertKey = async (host: string): Promise<{cert: string, key: string}> => {
  return new Promise((resolve) => {
    theCa.generateServerCertificateKeys([host], function (certPEM: string, privateKeyPEM: string) {
      resolve({
        cert: certPEM,
        key: privateKeyPEM
      });
    });
  });
};

export default generateCertKey;
