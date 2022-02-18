import { spawn } from 'child_process';
import SocketIoMessage from './SocketIoMessage';
import Global from './Global';
import ProxyConfig from '../../common/ProxyConfig';
import { MessageType } from '../../common/Message';

export default class LogProxy {
  proxyConfig: ProxyConfig;
  command: string;
  jsonFieldFilter: string;
  bufferingCount: number;
  retry = true;
  prevTimeMsec: number| undefined;

  constructor (proxyConfig: ProxyConfig) {
    this.proxyConfig = proxyConfig;
    this.command = proxyConfig.path;
    this.jsonFieldFilter = proxyConfig.hostname;
    this.bufferingCount = proxyConfig.port;
    this.start();
  }

  static destructor (proxyConfig: ProxyConfig) {
    if (proxyConfig.logProxyProcess) {
      try {
        const proc = proxyConfig.logProxyProcess;
        proc.stdout.removeAllListeners();
        proc.stderr.removeAllListeners();
        proc.removeAllListeners();
        proc.kill('SIGINT');
      } catch (e) {
        console.error(e);
      }
    }
  }

  start () {
    LogProxy.destructor(this.proxyConfig);
    this.retry = true;
    const tokens = this.command.split(' ');
    const proc = spawn(tokens[0], tokens.slice(1));
    // ('start', proc.pid);
    this.proxyConfig.logProxyProcess = proc; // save so we can kill process
    const startTime = Date.now();

    proc.stdout.on('data', data => {
      if (warmUpCompleted()) {
        this.sendToBrowser('stdout', data);
      }
    });

    proc.stderr.on('data', data => {
      if (warmUpCompleted()) {
        this.sendToBrowser('stderr', data);
      }
    });

    proc.on('error', error => {
      console.error(`error: ${error} - ${this.command}`);
    });

    proc.on('exit', _rc => {
      proc.stdout.removeAllListeners();
      proc.stderr.removeAllListeners();
      proc.removeAllListeners();
      if (this.retry) {
        setTimeout(() => this.start(), 10000); // Retry in 10 seconds
        this.retry = false;
      }
    });

    function warmUpCompleted () {
      return Date.now() > startTime + 3000;
    }
  }

  TIMEOUT = 5000;
  //RECORD_LIMIT = 50;
  streamName = '';
  recordCount = 0;
  buffer = '';
  // eslint-disable-next-line no-undef
  timerHandle: NodeJS.Timeout|undefined;

  async sendToBrowser (streamName: string, data: any) {
    if (this.timerHandle) {
      clearInterval(this.timerHandle);
    }

    if (this.streamName.length === 0) {
      this.streamName = streamName;
    }        
    
    if (this.jsonFieldFilter && this.jsonFieldFilter.length > 0) {
      let json: {[key:string]: any} | undefined
      try {
        json = JSON.parse(data)
      } catch(e) {}
      if (json && json[this.jsonFieldFilter]) {
        let timeMsec: number|undefined;
        if (json['msg_timestamp']) {
          timeMsec = Date.parse(json['msg_timestamp']);
        } else {
          timeMsec = Date.now();
        }
        this.emitToBrowser(json[this.jsonFieldFilter], streamName, json, timeMsec)
      }
    } else {
      this.buffer += data;
      if (++this.recordCount < this.bufferingCount && streamName === this.streamName) {
        this.timerHandle = setInterval(
          () => {
            this.recordCount = this.bufferingCount;
            this.sendToBrowser(this.streamName, '');
          },
          this.TIMEOUT
        );
        return;
      }
      //const commandTokens = this.command.split(' ');
      //const title = commandTokens[commandTokens.length - 1];
      const title = this.buffer.toString().split('\n')[0];
      this.emitToBrowser(title, streamName, this.buffer.toString(), Date.now());
      
      this.buffer = '';
      this.recordCount = 0;
    }
  }

  async emitToBrowser(title: string, streamName: string, data: string | {}, timeMsec?: number) {
    const seqNo = ++Global.nextSequenceNumber;    
    const message = await SocketIoMessage.buildRequest(
      Date.now(),
      seqNo,
      {}, // headers
      '', // method
      title, // url
      '', // endpoint
      { allproxy_inner_body: this.command }, // req body
      '', // 'log:' + title, // clientIp
      streamName, // serverHost
      '', // path
      0
    );

    let elapsedTime = 0;
    if (timeMsec && this.prevTimeMsec) {
      elapsedTime = timeMsec - this.prevTimeMsec;
    }
    SocketIoMessage.appendResponse(
      message, 
      {}, // res headers
      data, 
      0, // status
      elapsedTime // elapsed time
    );
    this.prevTimeMsec = timeMsec;
    message.protocol = 'log:';
    Global.socketIoManager.emitMessageToBrowser(MessageType.REQUEST_AND_RESPONSE, message, this.proxyConfig);
  }
}
