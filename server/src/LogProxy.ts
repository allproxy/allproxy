import SocketIoMessage from './SocketIoMessage';
import Global from './Global';
import ProxyConfig from '../../common/ProxyConfig';
import { MessageType } from '../../common/Message';
import fs from 'fs'
import { BATCH_SIZE } from './SocketIoManager';
import BoolFilter from '../../common/BoolFilter'
import ConsoleLog from './ConsoleLog';
const exec = require('child_process').exec;

export default class LogProxy {
  proxyConfig: ProxyConfig;
  command: string;
  primaryJsonFields: string[];
  boolFilter: BoolFilter;
  retry = true;
  prevTimeMsec: number | undefined;

  constructor(proxyConfig: ProxyConfig) {
    this.proxyConfig = proxyConfig;
    this.command = proxyConfig.path;
    this.primaryJsonFields = proxyConfig.hostname ? proxyConfig.hostname.split(',') : [];
    this.boolFilter = new BoolFilter(proxyConfig.comment);
    this.start();
  }

  static destructor(proxyConfig: ProxyConfig) {
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

  async start() {
    LogProxy.destructor(this.proxyConfig);
    this.retry = true;

    this.command = this.command.replace('$HOME', process.env.HOME!);
    if (fs.existsSync(this.command)) {
      this.command = 'cat ' + this.command;
    }
    ConsoleLog.debug('LogProxy:start', this.command);

    const tokens = this.command.split(' ');

    // cat of entire log file?
    if (tokens[0].trim() === 'cat' && tokens.length === 2) {
      async function delay(): Promise<boolean> {
        return new Promise((resolve) => {
          setTimeout(() => resolve(true), 50);
        })
      }

      // Read the entire file and process each record...
      const buffer = fs.readFileSync(tokens[1]);
      for (const record of buffer.toString().split('\n')) {
        if (this.boolFilter.isFiltered(record)) continue;
        const queueCount = await this.processLogRecord('stdout', record);
        if (queueCount >= BATCH_SIZE * 2) {
          await delay();
        }
      }
      return;
    }

    const proc = exec(this.command);

    this.proxyConfig.logProxyProcess = proc; // save so we can kill process
    const startTime = Date.now();

    proc.stdout.on('data', (buffer: Buffer) => {
      if (warmUpCompleted()) {
        for (const record of buffer.toString().split('\n')) {
          if (this.boolFilter.isFiltered(record)) continue;
          this.processLogRecord('stdout', record);
        }
      }
    });

    proc.stderr.on('data', (buffer: Buffer) => {
      if (warmUpCompleted()) {
        for (const record of buffer.toString().split('\n')) {
          if (this.boolFilter.isFiltered(record)) continue;
          this.processLogRecord('stderr', record);
        }
      }
    });

    proc.on('error', (error: any) => {
      console.error(`error: ${error} - ${this.command}`);
    });

    proc.on('exit', (_rc: any) => {
      proc.stdout.removeAllListeners();
      proc.stderr.removeAllListeners();
      proc.removeAllListeners();
      if (this.retry) {
        setTimeout(() => this.start(), 10000); // Retry in 10 seconds
        this.retry = false;
      }
    });

    const warmUpCompleted = () => {
      return this.command.indexOf('tail ') !== -1 ? Date.now() > startTime + 3000 : true;
    }
  }

  TIMEOUT = 5000;
  //RECORD_LIMIT = 50;
  streamName = '';
  recordCount = 0;
  buffer = '';
  // eslint-disable-next-line no-undef
  timerHandle: NodeJS.Timeout | undefined;

  async processLogRecord(streamName: string, record: string): Promise<number> {
    let queueCount = 0;
    if (this.timerHandle) {
      clearInterval(this.timerHandle);
    }

    if (this.streamName.length === 0) {
      this.streamName = streamName;
    }

    record = record.trim();
    if (record.length === 0) {
      return 0;
    }

    // Look for embedded JSON object
    let nonJson = '';
    if (!record.startsWith('{') && !record.startsWith('[')) {
      const i = record.indexOf('{');
      if (i !== -1) {
        try {
          const json = JSON.parse(record.substring(i));
          nonJson = record.substring(0, i) + ' ';
          record = JSON.stringify(json);
        } catch (e) { }
      }
    }

    const hasPrimaryJsonField = (json: { [key: string]: any }): boolean => {
      const keys = Object.keys(json);
      for (const key of this.primaryJsonFields) {
        if (keys.indexOf(key) !== -1) {
          return true;
        }
      }
      return false;
    }

    const title = (json: { [key: string]: string }): string => {
      let title = '';
      this.primaryJsonFields.forEach((field) => {
        if (title.length > 0) title += ', ';
        title += field + ': ' + json[field];
      })
      return title;
    }

    let json: { [key: string]: any } | undefined
    try {
      json = JSON.parse(record)
    } catch (e) { }

    if (json) {
      if (hasPrimaryJsonField(json)) {
        let timeMsec: number | undefined;
        if (json['LogTime']) {
          timeMsec = Date.parse(json['LogTime']);
        } else if (json['msg_timestamp']) {
          timeMsec = Date.parse(json['msg_timestamp']);
        } else {
          timeMsec = Date.now();
        }
        queueCount = await this.emitToBrowser(nonJson + title(json), streamName, json, timeMsec);
      } else {
        const title = record.split('\n')[0];
        queueCount = await this.emitToBrowser(nonJson + title, streamName, json, Date.now());
      }
    } else {
      const title = record.split('\n')[0];
      queueCount = await this.emitToBrowser(title, streamName, record, Date.now());
    }
    return queueCount;
  }

  async emitToBrowser(title: string, streamName: string, data: string | {}, timeMsec?: number): Promise<number> {
    const seqNo = Global.nextSequenceNumber();
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
    return Global.socketIoManager.emitMessageToBrowser(MessageType.REQUEST_AND_RESPONSE, message, this.proxyConfig);
  }
}
