import fs from 'fs';
import Proxy from '../../node-http-mitm-proxy';
import Global from './Global';
import Paths from './Paths';

let theCa: any;

export function createCertificateAuthority (): Promise<void> {
  return new Promise<void>((resolve) => {
    Proxy.ca.create(Paths.sslCaDir(), function (_err: any, ca: any) {
      theCa = ca;
      resolve();
    });
  });
}

const generateCertKey = async (hostname: string): Promise<{cert: string, key: string}> => {
  const wildcardHost = hostname.split('.', 3).length === 2 ? hostname : hostname.replace(/[^\.]+\./, '*.');
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
      Global.log('GenerateCertKey generating new cert/key', hostname, wildcardHost);
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
