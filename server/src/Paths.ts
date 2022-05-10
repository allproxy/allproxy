import fs from 'fs';
import path from 'path';

export default class Paths {
  private static baseDir = process.env.NODE_ENV === 'production'
    ? `${__dirname + ''}/../../../`
    : `${__dirname + ''}/../../`

  private static dataDir = process.env.ALLPROXY_DATA_DIR
    ? `${process.env.ALLPROXY_DATA_DIR}/`
    : Paths.baseDir

  public static configJson(): string {
    return Paths.platform(`${Paths.dataDir}config.json`);
  }

  public static replaceResponsesDir(): string {
    return Paths.platform(`${Paths.dataDir}replace-responses/`);
  }

  public static sslCaDir(): string {
    return Paths.platform(`${Paths.dataDir}.http-mitm-proxy`);
  }

  public static makeCaPemSymLink() {
    const target = Paths.platform(Paths.platform('.http-mitm-proxy/certs/ca.pem'));
    const path = Paths.platform(Paths.dataDir + 'ca.pem');
    try {
      fs.symlinkSync(target, path);
    } catch (e) { } // Already exists
  }

  public static clientDir(): string {
    return Paths.platform(`${Paths.baseDir}client`);
  }

  public static protoDir(): string {
    return Paths.platform(`${Paths.dataDir}proto`)
  }

  private static platform(dir: string): string {
    return dir.replace(/\//g, path.sep);
  }
}
