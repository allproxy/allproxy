import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
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

export function installCertificateAuthority () {
  const caPem = Paths.sslCaDir() + '/ca.pem';
  // Ubuntu/Debian?
  if (fs.existsSync('/usr/local/share/ca-certificates/')) {
    console.log('Installing ca.pem in /usr/local/share/ca-certificates/');
    exec(`sudo cp ${caPem} /usr/local/share/ca-certificates/allproxyca.pem`);
    // MacOS?
  } else if (fs.existsSync('/Library/Keychains/System.keychain')) {
    console.log('Installing ca.pem in /Library/Keychains/System.keychain/');
    exec(`sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ${caPem}`);
    // CentOS 5
  } else if (fs.existsSync('/etc/pki/tls/certs/ca-bundle.crt')) {
    console.log('Installing ca.pem in /etc/pki/tls/certs/ca-bundle.crt');
    exec(`cat ${caPem} >> /etc/pki/tls/certs/ca-bundle.crt`);
    // Windows?
  } else if (path.sep === '\\') {
    console.log('Installing ca.pem with certutil');
    exec(`certutil -addstore -f "ROOT" ${caPem}`);
  } else {
    console.log('ca.pem could not be installed');
  }
}

const generateCertKey = async (hostname: string): Promise<{cert: string, key: string}> => {
  // eslint-disable-next-line no-constant-condition
  const wildcardHost = hostname.split('.', 3).length === 2 || true // wildcard host is causing issues?
    ? hostname
    : hostname.replace(/[^.]+\./, '*.');
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
