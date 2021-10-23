import path from 'path'

export default class Paths {
  private static baseDir = process.env.NODE_ENV === 'production'
    ? `${__dirname + ''}/../../../`
    : `${__dirname + ''}/../../`

  public static configJson (): string {
    return Paths.platform(`${Paths.baseDir}config.json`)
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
