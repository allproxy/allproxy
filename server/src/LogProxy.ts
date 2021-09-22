import { spawn } from 'child_process'
import SocketIoMessage from './SocketIoMessage'
import Global from './Global'
import ProxyConfig from '../../common/ProxyConfig'
import { MessageType } from '../../common/Message'

export default class LogProxy {
  proxyConfig: ProxyConfig;
  command: string;
  retry = true;

  constructor (proxyConfig: ProxyConfig) {
    this.proxyConfig = proxyConfig
    this.command = proxyConfig.path
    this.start()
  }

  static destructor (proxyConfig: ProxyConfig) {
    if (proxyConfig.logProxyProcess) {
      try {
        const proc = proxyConfig.logProxyProcess
        // Global.log('killing:', proc.pid);
        proc.stdout.removeAllListeners()
        proc.stderr.removeAllListeners()
        proc.removeAllListeners()
        proc.kill('SIGINT')
      } catch (e) {
        Global.error(e)
      }
    }
  }

  start () {
    LogProxy.destructor(this.proxyConfig)
    this.retry = true
    Global.log(`Monitoring log: ${this.command}`)
    const tokens = this.command.split(' ')
    const proc = spawn(tokens[0], tokens.slice(1))
    // ('start', proc.pid);
    this.proxyConfig.logProxyProcess = proc // save so we can kill process
    const startTime = Date.now()

    proc.stdout.on('data', data => {
      if (warmUpCompleted()) {
        this.sendToBrowser('stdout', data)
      }
    })

    proc.stderr.on('data', data => {
      if (warmUpCompleted()) {
        this.sendToBrowser('stderr', data)
      }
    })

    proc.on('error', error => {
      Global.error(`error: ${error} - ${this.command}`)
    })

    proc.on('exit', _rc => {
      Global.log('LogProxy exiting:', this.command)
      proc.stdout.removeAllListeners()
      proc.stderr.removeAllListeners()
      proc.removeAllListeners()
      if (this.retry) {
        setTimeout(() => this.start(), 10000) // Retry in 10 seconds
        this.retry = false
      }
    })

    function warmUpCompleted () {
      return Date.now() > startTime + 3000
    }
  }

  TIMEOUT = 5000;
  RECORD_LIMIT = 50;
  streamName = '';
  recordCount = 0;
  buffer = '';
  // eslint-disable-next-line no-undef
  timerHandle: NodeJS.Timeout|undefined;

  async sendToBrowser (streamName: string, data: any) {
    if (this.timerHandle) {
      clearInterval(this.timerHandle)
    }

    if (this.streamName.length === 0) {
      this.streamName = streamName
    }

    this.buffer += data
    if (++this.recordCount < this.RECORD_LIMIT && streamName === this.streamName) {
      this.timerHandle = setInterval(
        () => {
          this.recordCount = this.RECORD_LIMIT
          this.sendToBrowser(this.streamName, '')
        },
        this.TIMEOUT
      )
      return
    }

    Global.log(`sendToBrowser log: ${this.command}`)
    const seqNo = ++Global.nextSequenceNumber
    const commandTokens = this.command.split(' ')
    const message = await SocketIoMessage.buildRequest(
      Date.now(),
      seqNo,
      {}, // headers
      '', // method
      this.buffer.toString().split('\n')[0], // url
      '', // endpoint
      { anyproxy_inner_body: this.command }, // req body
      'log:' + commandTokens[commandTokens.length - 1], // clientIp
      streamName, // serverHost
      '', // path
      0
    )
    SocketIoMessage.appendResponse(message, {}, this.buffer.toString(), 0, 0)
    message.protocol = 'log:'
    Global.socketIoManager.emitMessageToBrowser(MessageType.REQUEST_AND_RESPONSE, message, this.proxyConfig)

    // Global.log('buffered:', this.recordCount, this.buffer.toString());
    this.buffer = ''
    this.recordCount = 0
  }
}
