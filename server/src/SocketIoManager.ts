import io, { Socket } from 'socket.io';
import TcpProxy from './TcpProxy';
import LogProxy from './LogProxy';
import fs from 'fs';
import ProxyConfig, { DYNAMICALLY_ADDED } from '../../common/ProxyConfig';
import Message, { MessageType } from '../../common/Message';
import url from 'url';
import net from 'net';
import Ping from './Ping';
import resend from './Resend';
import GrpcProxy from './GrpcProxy';
import Paths from './Paths';
import Global from './Global';
import ConsoleLog from './ConsoleLog';
import BrowserLauncher from './BrowserLauncher';
import Launcher from '@httptoolkit/browser-launcher';
import APFileSystem from './APFileSystem';
import { setOsBinaries } from '../../app';
import { spawn } from 'child_process';
import path from 'path';
import FileLineMatcher, { parseDateString } from './FileLineMatcher';
const { rgPath } = require('@vscode/ripgrep');

const USE_HTTP2 = true;
const CONFIG_JSON = Paths.configJson();
const CACHE_SOCKET_ID = 'cache';

export const BATCH_SIZE = 100; // windows size - maximum outstanding messages
const MAX_OUT = 2; // two message batches

type BreakpointQueueMessage = {
  message: Message,
  socket: Socket,
  resolve: (value: Message | Promise<Message>) => void
}
let breakpointQueue: BreakpointQueueMessage[] = [];

class SocketIoInfo {
  socket: io.Socket | undefined = undefined;
  configs: ProxyConfig[] = [];
  breakpointEnabled = false;
  seqNum = 0;
  messagesOut = 0;
  queuedMessages: Message[] = [];

  constructor(socket: io.Socket | undefined, configs: ProxyConfig[]) {
    this.socket = socket;
    this.configs = configs;
  }
};

export let socketIoManager: SocketIoManager;

export default class SocketIoManager {
  private socketIoMap = new Map<string, SocketIoInfo>();

  constructor() {
    this.activateConfig(this.getConfig());
    socketIoManager = this;
  }

  public clientEndedSocket() {
    for (const socketId in this.socketIoMap) {
      this.closeAnyServersWithSocket(socketId);
      this.socketIoMap.delete(socketId);
    }
  }

  private defaultConfig(): ProxyConfig[] {
    // proxy all http by default
    return [
      {
        isSecure: false,
        protocol: 'browser:',
        path: '/',
        hostname: '',
        port: 0,
        recording: true,
        hostReachable: true,
        comment: ''
      }
    ];
  }

  public getConfig(): ProxyConfig[] {
    const configs = fs.existsSync(CONFIG_JSON)
      ? JSON.parse(fs.readFileSync(CONFIG_JSON).toString()).configs
      : this.defaultConfig();
    let modified = false;
    for (const config of (configs as ProxyConfig[])) {
      if (config.protocol as string === 'proxy:') {
        config.protocol = 'browser:';
        modified = true;
      }
    }
    modified && this.saveConfig(configs);
    return configs;
  }

  private resolveQueue: ((value: ProxyConfig[]) => void)[] = [];

  public updateHostReachable(): Promise<ProxyConfig[]> {
    return new Promise((resolve) => {
      const configs = this.getConfig();

      this.resolveQueue.push(resolve);
      if (this.resolveQueue.length > 1) return;

      let count = 0;

      const done = () => {
        if (++count === configs.length) {
          // const queueCount = this.resolveQueue.length
          let func;
          // eslint-disable-next-line no-cond-assign
          while (func = this.resolveQueue.pop()) {
            func(configs);
          }
        }
      };
      configs.forEach(config => {
        if (config.protocol === 'browser:' || config.protocol === 'log:') {
          config.hostReachable = true;
          done();
        } else {
          config.hostReachable = false;
          setTimeout(async () => {
            const pingSuccessful = await Ping.host(config.hostname);
            if (!pingSuccessful) {
              done();
            } else {
              const socket = net.connect(config.port, config.hostname, () => {
                config.hostReachable = true;
                socket.end();
                done();
              });

              socket.on('error', (_err) => {
                done();
                socket.end();
              });
            }
          });
        }
      });
    });
  }

  private saveConfig(proxyConfigs: ProxyConfig[]) {
    // Cache the config, to configure the proxy on the next start up prior
    // to receiving the config from the browser.
    fs.writeFileSync(CONFIG_JSON,
      JSON.stringify({ configs: proxyConfigs }, null, 2));
  }

  public addHttpServer(httpServer: any) {
    ConsoleLog.debug('SocketIoManager add Server');
    const server = new io.Server(httpServer);
    server.on('connection', (socket: io.Socket) => this._socketConnection(socket));
  }

  async _socketConnection(socket: io.Socket) {
    ConsoleLog.debug('SocketIoManager on connection');
    const config = this.getConfig();

    socket.emit('port config', Global.portConfig); // send port config to browser

    socket.emit('proxy config', config); // send config to browser

    socket.on('ping', (pingReply: () => void) => {
      pingReply()
    })

    socket.on('ostype', (os: string, urlPath: string, ipInfo: any) => {
      if (ipInfo) {
        if (process.env.FILE_SYSTEM_LOG === '1') {
          console.log(urlPath);
          console.log(os);

          // {
          //   ipAddress: '64.118.12.153',
          //   continentCode: 'NA',
          //   continentName: 'North America',
          //   countryCode: 'US',
          //   countryName: 'United States',
          //   stateProvCode: 'MN',
          //   stateProv: 'Minnesota',
          //   city: 'Underwood'
          // }
          ipInfo.date = getDateNow();
          ipInfo.os = os;
          ipInfo.app = urlPath;
          console.log(JSON.stringify(ipInfo));

          socket.handshake.url = urlPath;
          socket.handshake.address = ipInfo.ipAddress;
        }
      }
      setOsBinaries(os);
    })

    socket.on('proxy config', (proxyConfigs: ProxyConfig[]) => {
      ConsoleLog.info(`${Paths.configJson()}:\n`, proxyConfigs);
      this.saveConfig(proxyConfigs);

      // Make sure all matching connection based servers are closed.
      for (const proxyConfig of proxyConfigs) {
        if (proxyConfig._server) {
          this.closeAnyServerWithPort(proxyConfig.port);
        }
      }

      this.activateConfig(proxyConfigs, socket);
      // this.updateHostReachable();
    });

    socket.on('resend', (
      forwardProxy: boolean,
      method: string,
      url: string,
      message: Message,
      body?: string | object
    ) => {
      resend(forwardProxy, method, url, message, body);
    });

    socket.on('breakpoint', (enable: boolean) => {
      const socketIoInfo = this.socketIoMap.get(socket.id);
      if (socketIoInfo) {
        //ConsoleLog.info('breakpoint', enable);
        socketIoInfo.breakpointEnabled = enable;
      }
    })

    socket.on('detect browsers', (callback: any) => {
      // Running in docker container
      if (Global.inDockerContainer) {
        callback([]);
      } else {
        BrowserLauncher.detect()
          .then((browsers) => {
            callback(browsers)
          })
          .catch(e => {
            console.log('Error detecting browsers:', e)
            callback([]);
          });
      }
    })

    socket.on('launch browser', (browser: Launcher.Browser) => {
      BrowserLauncher.launch(browser);
    })

    socket.on('is file in downloads', (fileName: string, callback: (result: boolean) => void) => {
      callback(fs.existsSync(process.env.HOME + '/Downloads/' + fileName));
    })

    socket.on('read file', async (fileName: string, operator: 'and' | 'or', filters: string[], maxLines: number, callback: (lines: string[]) => void) => {

      const filePath = "'" + process.env.HOME + "" + path.sep + 'Downloads' + path.sep + fileName + "'";
      const rg = rgPath;
      let cmd = '';
      if (filters.length === 0) {
        cmd = rg + ' -F -m ' + maxLines + ' "" ' + filePath;
      } else {
        if (operator === 'and') {
          for (let i = 0; i < filters.length; ++i) {
            const filter = `'${filters[i]}'`;
            if (i === filters.length - 1) {
              cmd += i === 0
                ? rg + ' -F -m ' + maxLines + '  ' + filter + ' ' + filePath :
                ' | ' + rg + ' -F -m ' + maxLines + ' ' + filter;
            } else {
              cmd += i === 0
                ? rg + ' -F ' + filter + ' ' + filePath
                : ' | ' + rg + ' -F ' + filter;
            }
          }
        } else {
          cmd += rg + ' -F -m ' + maxLines + ' -e ' + filters.join('|') + ' ' + fileName;
        }
      }

      socketIoManager.emitStatusToBrowser(socket, 'Executing ripgrep: ' + cmd);
      const result = await ripgrep(cmd, filters, socket);
      const result2 = Buffer.concat(result);
      callback(result2.toString().split('\n'));
    })

    socket.on('new subset', async (fileName: string, filterField: string, filters: string[], timeFieldName: string, callback: (fileSize: number, startTime: string, endTime: string) => void) => {
      //console.log('new subset', fileName, filterField, filters);
      const downloads = process.env.HOME + "" + path.sep + 'Downloads';
      const i = fileName.lastIndexOf('.');
      const subsetFilePath = downloads + path.sep + fileName.substring(0, i) + '-' + filters.join(' ') + fileName.substring(i);
      const tempFilePath = subsetFilePath + '-unsorted';
      if (!await fs.existsSync(subsetFilePath) || fs.statSync(subsetFilePath).size === 0) {
        const rg = rgPath;
        let cmd = '';
        if (filters.length > 1) {
          const fieldValueFilters: string[] = [];
          for (const filter of filters) {
            fieldValueFilters.push(`"${filterField}":"${filter}`);
          }
          cmd += rg + " -e '" + fieldValueFilters.join('|') + "' " + downloads + path.sep + fileName;
        } else {
          const fieldValueFilter = `'"${filterField}":"${filters[0]}'`;
          cmd = rg + ' -F ' + fieldValueFilter + ' ' + downloads + path.sep + fileName;
        }
        socketIoManager.emitStatusToBrowser(socket, 'Executing ripgrep: ' + cmd);
        const size = await ripgrep2file(cmd, tempFilePath, socket);
        if (size === 0) {
          fs.rmSync(tempFilePath);
          callback(0, new Date(0).toISOString(), new Date(0).toISOString());
        } else {
          cmd = `jq -sc 'sort_by( ._source.msg_timestamp )[]' '${tempFilePath}' > '${subsetFilePath}'`;
          await execCommand(cmd, socket);
          socketIoManager.emitStatusToBrowser(socket, 'Sorting: ' + cmd);
          fs.rmSync(tempFilePath);
          const { startTime, endTime } = getFileDateRange(subsetFilePath, timeFieldName);
          callback(size, startTime, endTime);
        }
      } else {
        const stat = fs.statSync(subsetFilePath);
        const { startTime, endTime } = getFileDateRange(subsetFilePath, timeFieldName);
        callback(stat.size, startTime, endTime);
      }
    })

    socket.on('get subsets', (fileName, timeFieldName: string, callback: (subsets: { filterValue: string, fileSize: number, startTime: string, endTime: string }[]) => void) => {
      const subsets: { filterValue: string, fileSize: number, startTime: string, endTime: string }[] = [];
      const i = fileName.lastIndexOf('.');
      const prefix = fileName.substring(0, i) + '-';
      const suffix = fileName.substring(i);
      const downloads = process.env.HOME + path.sep + 'Downloads';
      for (const name of fs.readdirSync(downloads)) {
        if (name !== fileName && name.startsWith(prefix) && name.endsWith(suffix)) {
          const stat = fs.statSync(downloads + path.sep + name);
          const { startTime, endTime } = getFileDateRange(downloads + path.sep + name, timeFieldName);
          subsets.push({ filterValue: name.substring(prefix.length, name.lastIndexOf('.')), fileSize: stat.size, startTime: startTime, endTime: endTime });
        }
      }
      callback(subsets);
    });

    function getFileDateRange(filePath: string, timeFieldName: string): { startTime: string, endTime: string } {
      const chunkSize = 10 * 1024 * 1024;
      const timeFieldColon = `"${timeFieldName}":`;
      const buffer = Buffer.alloc(chunkSize);
      const mode = 'win32' ? 'r' : 444;
      const fd = fs.openSync(filePath, mode);
      const stat = fs.fstatSync(fd);
      fs.readSync(fd, buffer, 0, chunkSize, 0);
      let i = buffer.indexOf(timeFieldColon);
      let startTime: Date | undefined;
      let endTime: Date | undefined;
      if (i === -1) {
        console.log('Start time ' + timeFieldColon + ' not found!');
      } else {
        startTime = parseDateString(buffer, i + timeFieldColon.length);
      }
      fs.readSync(fd, buffer, 0, chunkSize, stat.size - chunkSize);
      i = buffer.lastIndexOf(timeFieldColon);
      if (i === -1) {
        console.log('End time ' + timeFieldColon + ' not found!');
      } else {
        endTime = parseDateString(buffer, i + timeFieldColon.length);
      }
      startTime = startTime ? startTime : new Date(0);
      endTime = endTime ? endTime : new Date(0);
      return { startTime: startTime.toISOString(), endTime: endTime.toISOString() };
    }

    socket.on('json field exists', async (fileName: string, jsonField: string, callback: (exists: boolean) => void) => {
      const downloads = process.env.HOME + "" + path.sep + 'Downloads';
      const rg = rgPath;
      const filter = `'"${jsonField}":"'`;
      let cmd = rg + ' -F -m 1 ' + filter + ' ' + downloads + path.sep + fileName;
      const data = await ripgrep(cmd, [], socket, 10 * 1000);
      //console.log('json field exists?', jsonField, data.length > 0);
      callback(data.length > 0);
    })

    socket.on('file line matcher', (
      fileName: string,
      timeFieldName: string,
      startTime: string,
      endTime: string,
      operator: 'and' | 'or',
      filters: string[],
      maxLines: number,
      callback: (lines: string[]) => void) => {
      //console.log('file line matcher', fileName, timeFieldName, startTime, endTime, operator, filters, maxLines);
      const matcher = new FileLineMatcher(socket);
      matcher.setTimeFilter(timeFieldName, new Date(startTime), new Date(endTime));
      matcher.setFilters(filters);
      matcher.setOperator(operator);
      matcher.setMaxLines(maxLines);

      const lines = matcher.read(fileName);

      callback(lines);
    })


    socket.on('disconnect', () => {
      this.closeAnyServersWithSocket(socket.id);
      this.socketIoMap.delete(socket.id);
    });

    socket.on('error', (e: any) => {
      console.error('error', e);
      this.closeAnyServersWithSocket(socket.id);
      this.socketIoMap.delete(socket.id);
    });

    const apFileSystem = new APFileSystem(socket);
    await apFileSystem.listen();
  }

  async activateConfig(proxyConfigs: ProxyConfig[], socket?: io.Socket) {
    ConsoleLog.debug('SocketIoManager.activateConfig');
    for (const proxyConfig of proxyConfigs) {
      if (proxyConfig.protocol === 'log:') {
        // eslint-disable-next-line no-new
        new LogProxy(proxyConfig);
      } else if (proxyConfig.protocol === 'grpc:' && USE_HTTP2) {
        GrpcProxy.reverseProxy(proxyConfig);
      } else if (
        proxyConfig.protocol !== 'http:' &&
        proxyConfig.protocol !== 'https:' &&
        proxyConfig.protocol !== 'browser:'
      ) {
        // eslint-disable-next-line no-new
        new TcpProxy(proxyConfig);
      }
    }

    this.socketIoMap.set(socket ? socket.id : CACHE_SOCKET_ID,
      new SocketIoInfo((socket || undefined), proxyConfigs));
    if (socket !== undefined) {
      this.closeAnyServersWithSocket(CACHE_SOCKET_ID);
      this.socketIoMap.delete(CACHE_SOCKET_ID);
    }
  }

  // Close 'any:' protocol servers that are running for the browser owning the socket
  closeAnyServersWithSocket(socketId: string) {
    this.socketIoMap.forEach((socketInfo: SocketIoInfo, key: string) => {
      if (socketId && key !== socketId) return;
      for (const proxyConfig of socketInfo.configs) {
        if (proxyConfig.protocol === 'log:') {
          LogProxy.destructor(proxyConfig);
        } if (proxyConfig.protocol === 'grpc:') {
          GrpcProxy.destructor(proxyConfig);
        } else if (proxyConfig._server) {
          TcpProxy.destructor(proxyConfig);
        }
      }
    });
  }

  // Close 'any:' protocol servers the specified listening port
  closeAnyServerWithPort(port: number) {
    this.socketIoMap.forEach((socketInfo: SocketIoInfo, _key: string) => {
      for (const proxyConfig of socketInfo.configs) {
        if (proxyConfig._server && proxyConfig.port === port) {
          if (proxyConfig.protocol === 'grpc:' && USE_HTTP2) {
            GrpcProxy.destructor(proxyConfig);
          } else {
            TcpProxy.destructor(proxyConfig);
          }
        }
      }
    });
  }

  isMatch(needle: string, haystack: string) {
    if (needle.indexOf('.*') !== -1) {
      const match = haystack.match(needle);
      return match !== null && match.length > 0;
    } else {
      return haystack.startsWith(needle);
    }
  }

  /**
   * Find proxy config matching URL
   * @params protocol
   * @params clientHostName
   * @param {*} reqUrl
   * @param isForwardProxy
   * @returns ProxyConfig
   */
  findProxyConfigMatchingURL(
    protocol: 'http:' | 'https:',
    clientHostName: string,
    reqUrl: url.UrlWithStringQuery,
    proxyType: 'forward' | 'reverse' = 'reverse'
  ): ProxyConfig | undefined {
    const reqUrlPath = reqUrl.pathname!.replace(/\/\//g, '/');
    const isForwardProxy = proxyType === 'forward';

    let matchingProxyConfig: ProxyConfig | undefined;
    // Find matching proxy configuration
    this.socketIoMap.forEach((socketInfo: SocketIoInfo, _key: string) => {
      for (const proxyConfig of socketInfo.configs) {
        if (proxyConfig.protocol !== protocol && proxyConfig.protocol !== 'browser:') continue;
        if ((this.isMatch(proxyConfig.path, reqUrlPath) ||
          this.isMatch(proxyConfig.path, clientHostName + reqUrlPath)) &&
          isForwardProxy === (proxyConfig.protocol === 'browser:')) {
          if (matchingProxyConfig === undefined || proxyConfig.path.length > matchingProxyConfig.path.length) {
            matchingProxyConfig = proxyConfig;
          }
        }
      }
    });
    return matchingProxyConfig;
  }

  findGrpcProxyConfig(
    hostname: string,
    port: number
  ): ProxyConfig | undefined {
    let matchingProxyConfig;
    // Find matching proxy configuration
    this.socketIoMap.forEach((socketInfo: SocketIoInfo, _key: string) => {
      for (const proxyConfig of socketInfo.configs) {
        if (proxyConfig.protocol === 'grpc:' && proxyConfig.hostname === hostname && proxyConfig.port === port) {
          ConsoleLog.debug(`findGrpcProxy(${hostname}, ${port}) return:`, proxyConfig)
          matchingProxyConfig = proxyConfig;
        }
      }
    });
    return matchingProxyConfig;
  }

  /**
   * Emit message to browser.
   * @param {*} message
   * @param {*} proxyConfig
   */
  emitMessageToBrowser(messageType: MessageType, message: Message, inProxyConfig?: ProxyConfig): number {
    let queueCount = 0;
    const isDynamic = inProxyConfig === undefined || inProxyConfig.comment === DYNAMICALLY_ADDED;
    const emittedSocketId: { [key: string]: boolean } = {}
    message.type = messageType;
    const path = inProxyConfig ? inProxyConfig.path : '';
    let emitted = false;
    this.socketIoMap.forEach((socketInfo: SocketIoInfo, socketId: string) => {
      for (const proxyConfig of socketInfo.configs) {
        if (inProxyConfig === undefined || isDynamic ||
          (proxyConfig.path === path && inProxyConfig.protocol === proxyConfig.protocol)) {
          if (proxyConfig.protocol === 'log:' && inProxyConfig !== proxyConfig) continue;
          if (emittedSocketId[socketId]) continue;
          if (!proxyConfig.recording) {
            if (proxyConfig.protocol !== 'log:') {
              ConsoleLog.info('Record is disabled for protocol ', proxyConfig.protocol);
            }
            continue;
          }
          message.proxyConfig = isDynamic ? inProxyConfig : proxyConfig;
          // Remove _server: net.Server
          if (message.proxyConfig && message.proxyConfig._server) {
            const pc = message.proxyConfig;
            const server = pc._server;
            delete pc._server;
            message.proxyConfig = Object.assign({}, pc);
            pc._server = server;
          }
          if (socketInfo.socket) {
            if (socketInfo.queuedMessages.length > 0) {
              socketInfo.queuedMessages.push(message);
              queueCount += socketInfo.queuedMessages.length;
            } else {
              queueCount += this.emitMessageWithFlowControl([message], socketInfo, socketId);
            }
            emittedSocketId[socketId] = true;
            emitted = true;
          }
        }
      }
    });
    if (!emitted) {
      // console.error(message.sequenceNumber, 'no browser socket to emit to', message.url)
    }
    return queueCount;
  }

  private emitMessageWithFlowControl(messages: Message[], socketInfo: SocketIoInfo, socketId: string): number {
    if (socketInfo.messagesOut >= MAX_OUT) {
      socketInfo.queuedMessages = socketInfo.queuedMessages.concat(messages);
    } else {
      if (socketInfo.socket) {
        ++socketInfo.seqNum;
        ++socketInfo.messagesOut;
        socketInfo.socket.emit(
          'reqResJson',
          messages,
          socketInfo.queuedMessages.length,
          // callback:
          (_response: string) => {
            --socketInfo.messagesOut;

            ConsoleLog.info(
              `out=${socketInfo.messagesOut}`,
              `sent=${messages.length}`,
              `queued=${socketInfo.queuedMessages.length}`,
              `(${_response})`)

            const count = Math.min(BATCH_SIZE, socketInfo.queuedMessages.length);
            if (count > 0) {

              this.emitMessageWithFlowControl(
                socketInfo.queuedMessages.splice(0, count),
                socketInfo,
                socketId
              )
            }
          }
        );
      }
    }
    return socketInfo.queuedMessages.length;
  }

  public isBreakpointEnabled(): boolean {
    let enabled = false;
    this.socketIoMap.forEach((socketInfo: SocketIoInfo, _socketId: string) => {
      if (socketInfo.breakpointEnabled) {
        enabled = true;
      }
    })
    return enabled;
  }

  public async handleBreakpoint(
    message: Message
  ): Promise<Message> {
    return new Promise<Message>(resolve => {
      let socket: Socket | undefined;
      this.socketIoMap.forEach((socketInfo: SocketIoInfo, _socketId: string) => {
        if (socketInfo.breakpointEnabled) {
          socket = socketInfo.socket
          message.proxyConfig = socketInfo.configs[0];
        }
      })
      // Breakpoint found?
      if (socket) {
        breakpointQueue.push({ message, socket, resolve });
        // Only one breakpoint inprogress?
        if (breakpointQueue.length === 1) {
          handleBreakpoints();
          function handleBreakpoints() {
            const bpMessage = breakpointQueue[0];
            bpMessage.socket!.emit('breakpoint', bpMessage.message, (message2: Message) => {
              bpMessage.resolve(message2);
              breakpointQueue.shift();
              if (breakpointQueue.length > 0) {
                handleBreakpoints();
              }
            })
          }
        }
      } else {
        resolve(message);
      }
    })
  }

  public emitStatusToBrowser(socket: Socket, message: string) {
    socket.emit('status dialog', message);
  }

  public emitErrorToBrowser(socket: Socket, message: string) {
    socket.emit('error dialog', message);
  }
}

async function execCommand(command: string, socket: Socket): Promise<void> {
  //console.log(command);
  return await new Promise<void>(resolve => {
    const tokens = command.split(' ');
    const p = spawn(tokens[0], tokens.slice(1), { shell: true });
    p.stderr.on('data', (data: Buffer) => {
      console.error('spawn error', data.toString());
      socketIoManager.emitErrorToBrowser(socket, command + ': ' + data.toString());
      resolve();
    })
    p.on('exit', () => {
      resolve();
    })
  })
}

async function ripgrep(command: string, filters: string[], socket: Socket, timeout?: number): Promise<Buffer[]> {
  //console.log(command);
  let result: Buffer[] = [];
  let size = 0;
  let progressTime = Date.now();
  return await new Promise<Buffer[]>(resolve => {
    const tokens = command.split(' ');
    const p = spawn(tokens[0], tokens.slice(1), { shell: true, timeout })
    p.stdout.on('data', (data: Buffer) => {
      result.push(data);
      if (timeout === undefined) {
        size += data.length;
        if (Date.now() - progressTime >= 1000 * 1) {
          socketIoManager.emitStatusToBrowser(socket, size + ' bytes match filters: ' + filters);
          progressTime = Date.now();
        }
      }
    })
    p.stderr.on('data', (data: Buffer) => {
      console.error('ripgrep error', data.toString());
      socketIoManager.emitErrorToBrowser(socket, command + ': ' + data.toString());
      resolve(result);
    })
    p.on('exit', () => {
      resolve(result);
    })
  })
}

async function ripgrep2file(command: string, fileName: string, socket: Socket): Promise<number> {
  //console.log(command);
  let fileCreated = false;
  let size = 0;
  let progressTime = Date.now();
  return await new Promise<number>(resolve => {
    const tokens = command.split(' ');
    //console.log('rebgrep2file', tokens);
    const p = spawn(tokens[0], tokens.slice(1), { shell: true })
    p.stdout.on('data', (data: Buffer) => {
      size += data.length;
      if (Date.now() - progressTime >= 1000 * 1) {
        socketIoManager.emitStatusToBrowser(socket, size + ' written to ' + fileName);
        progressTime = Date.now();
      }
      if (!fileCreated) {
        fs.writeFileSync(fileName, data);
        fileCreated = true;
      } else {
        fs.appendFileSync(fileName, data);
      }
    })
    p.stderr.on('data', (data: Buffer) => {
      console.error('ripgrep error', data.toString());
      socketIoManager.emitErrorToBrowser(socket, command + ': ' + data.toString());
      resolve(0);
    })
    p.on('exit', () => {
      if (!fs.existsSync(fileName)) {
        resolve(0);
      } else {
        const stat = fs.statSync(fileName);
        resolve(stat.size);
      }
    })
  })
}

function getDateNow() {
  // return json.sequenceNumber; // used for testing only
  const date = new Date();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const msecs = (date.getMilliseconds() / 1000).toFixed(3).toString().replace('0.', '');
  return `${date.toDateString()} ${hours}:${minutes}:${seconds}.${msecs}`;
}
