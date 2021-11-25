import fs from 'fs';
import Proxy from '../../node-http-mitm-proxy';
import Paths from './Paths';

let theCa: any;
Proxy.ca.create(Paths.sslCaDir(), function (_err: any, ca: any) {
  theCa = ca;
});

const generateCertKey = async (hostname: string): Promise<{cert: string, key: string}> => {
  const wildcardHost = hostname.replace(/[^\.]+\./, '*.');
  return new Promise((resolve) => {
    const caHost = wildcardHost.replace(/\*/g, '_');
    const certPemFile = Paths.sslCaDir() + '/certs/' + caHost + '.pem';
    const keyPemFile = Paths.sslCaDir() + '/keys/' + caHost + '.key';
    if (fs.existsSync(certPemFile)) {
      resolve({
        cert: fs.readFileSync(certPemFile).toString(),
        key: fs.readFileSync(keyPemFile).toString()
      });
    } else {
      theCa.generateServerCertificateKeys([wildcardHost], function (certPEM: string, privateKeyPEM: string) {
        resolve({
          cert: certPEM,
          key: privateKeyPEM
        });
      });
    }
  });
};

export default generateCertKey;
