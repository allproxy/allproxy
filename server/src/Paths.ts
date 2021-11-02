import path from 'path'

export default class Paths {
  private static baseDir = process.env.NODE_ENV === 'production'
    ? `${__dirname + ''}/../../../`
    : `${__dirname + ''}/../../`

  public static configJson (): string {
    return process.env.ALLPROXY_CONFIG
      ? process.env.ALLPROXY_CONFIG
      : Paths.platform(`${Paths.baseDir}config.json`)
  }

  public static sslCaDir (): string {
    return Paths.platform(`${Paths.baseDir}/.http-mitm-proxy`)
  }

  public static serverKey (): string {
    return Paths.platform(`${Paths.baseDir}private/keys/server.key`)
  }

  public static serverCrt (): string {
    return Paths.platform(`${Paths.baseDir}private/keys/server.crt`)
  }

  public static clientDir (): string {
    return Paths.platform(`${Paths.baseDir}client`)
  }

  private static platform (dir: string): string {
    return dir.replace(/\//g, path.sep)
  }
}
