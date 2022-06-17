import fs from 'fs';
import path from 'path';

export default class Paths {
  private static baseDir = process.env.NODE_ENV === 'production'
    ? `${__dirname + ''}/../../../`
    : `${__dirname + ''}/../../`

  private static dataDir = process.env.ALLPROXY_DATA_DIR
    ? `${process.env.ALLPROXY_DATA_DIR}/`
    : Paths.baseDir

  public static configJson (): string {
    return Paths.platform(`${Paths.dataDir}config.json`);
  }

  public static sslCaDir (): string {
    return Paths.platform(`${Paths.dataDir}.http-mitm-proxy`);
  }

  public static certsDirAndSlash(): string {
    return Paths.platform(`${Paths.sslCaDir()}/certs/`);
  }

  public static keysDirAndSlash(): string {
    return Paths.platform(`${Paths.sslCaDir()}/keys/`);
  }

  public static makeCaPemSymLink () {
    const target = Paths.platform(Paths.platform('.http-mitm-proxy/certs/ca.pem'));
    const path = Paths.platform(Paths.dataDir + 'ca.pem');
    try {
      fs.symlinkSync(target, path);
    } catch (e) { } // Already exists
  }

  public static setupInterceptDir () {
    // Installed from NPM?
    if (process.env.ALLPROXY_DATA_DIR) {
      const target = Paths.platform(`${Paths.interceptDir()}/InterceptResponse.js`);
      const path = Paths.platform(Paths.platform(`${Paths.baseDir}intercept/InterceptResponse.js`));
      if (!fs.existsSync(target)) {
        fs.copyFileSync(path, target);
        fs.renameSync(path, Paths.platform(path + '.bak'));
      }
      try {
        fs.symlinkSync(target, path);
      } catch (e) { } // Already exists
    }
  }

  public static clientDir (): string {
    return Paths.platform(`${Paths.baseDir}client`);
  }

  public static protoDir (): string {
    return Paths.platform(`${Paths.dataDir}proto`);
  }

  public static interceptDir (): string {
    return Paths.platform(`${Paths.dataDir}intercept`);
  }

  public static sep (): string {
    return process.env.SHELL?.indexOf('bash') !== -1 ? '/' : path.sep;
  }

  private static platform (dir: string): string {
    return dir.replace(/\//g, Paths.sep());
  }
}
