import { spawn } from 'child_process'

export default class Ping {
  public static host (hostName: string): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = spawn('ping', ['-c', '1', hostName])

      proc.stdout.on('data', _data => {
        resolve(true)
      })

      proc.stderr.on('data', _data => {
        resolve(false)
      })

      proc.on('error', _error => {
        resolve(false)
      })
    })
  }
}
