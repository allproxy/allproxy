import fs from 'fs';
import ConsoleLog from './ConsoleLog';
import Paths from './Paths';
const ca = require('./ca');

let theCa: any;

export function createCertificateAuthority(): Promise<void> {
  return new Promise<void>((resolve) => {
    ca.create(Paths.sslCaDir(), function (_err: any, ca: any) {
      theCa = ca;
      resolve();
    });
  });
}

export function getCertContent(): string {
  return theCa.getCertContent();
}

const generateCertKey = async (hostname: string): Promise<{ cert: string, key: string }> => {
  // eslint-disable-next-line no-constant-condition
  const wildcardHost = hostname.split('.', 3).length === 2 || true // wildcard host is causing issues?
    ? hostname
    : hostname.replace(/[^.]+\./, '*.');
  return new Promise((resolve) => {
    const caHost = wildcardHost.replace(/\*/g, '_');
    const certPemFile = Paths.certsDirAndSlash() + caHost + '.pem';
    const keyPemFile = Paths.keysDirAndSlash() + caHost + '.key';
    if (fs.existsSync(certPemFile)) {
      resolve({
        cert: fs.readFileSync(certPemFile).toString(),
        key: fs.readFileSync(keyPemFile).toString()
      });
    } else {
      ConsoleLog.debug('GenerateCertKey generating new cert/key', hostname, wildcardHost);
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
