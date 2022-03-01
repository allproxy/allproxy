import path from "path";
import Paths from "./Paths";
import fs from 'fs';
import protobuf from 'protobufjs';

let serviceFuncToFileNameMessageNames: Map<string,string[]> = new Map();

export function parseProtoFiles() {
    let protoNames: string[] = [];
    
    for(const protoFile of fs.readdirSync(Paths.protoDir())) {
      if(!protoFile.endsWith('.proto')) continue;
      const lines = fs.readFileSync(path.join(Paths.protoDir(), protoFile)).toString().split('\n');      
      let foundService = false;
      let packageName = '';
      let service = '';
      let func = '';
      for (let line of lines) { 
        line = line.trim();   
        if (line.startsWith('package')) {
            const end = line.indexOf(';');
            packageName = line.substring(line.indexOf(' ')+1, end === -1 ? undefined : end);
            packageName = packageName.trim();
        }    
        if (!foundService) {
          if (line.startsWith('service ')) foundService = true;
          const end = line.indexOf('{');
          service = line.substring(line.indexOf(' ')+1, end === -1 ? undefined : end);
          service = service.trim();
        } else {
          if (line === '}') {
            foundService = false;
            continue;
          }
          if (line.startsWith('rpc ')) {
            protoNames = [];
            protoNames.push(protoFile);
            func = line.substring(line.indexOf(' ')+1, line.indexOf('('));
            func = func.trim();
            let j = line.indexOf('(') + 1;
            for(let i = j; i < line.length; ++i) {              
              const c = line.substring(i,i+1);
              if (c === ')') {
                const messageName = line.substring(j,i);                
                protoNames.push(messageName);                
                if (protoNames.length === 3) {
                    const key = `/${packageName}.${service}/${func}`;
                    serviceFuncToFileNameMessageNames.set(key, protoNames); 
                    console.log(key, protoNames);
                    break;
                }             
                const k = line.substring(i).indexOf('(');  
                if (k === -1) break;
                i += k;
                j = i + 1;              
              }
            }            
          }
        }   
      } 
    }    
}

// map Grpc URL path to request message name and response message name
export function getProtoNames(urlPath: string): string[]|undefined {    
    return serviceFuncToFileNameMessageNames.get(urlPath);
}

export async function decodeProtobuf(fileName: string, packageName: string, messageName: string, buffer: Buffer): Promise<{}|undefined> {
    const root = await protobuf.load(path.join(Paths.protoDir(), fileName));
    const protobufType = root.lookupType(`${packageName}.${messageName}`);
    const message = buffer.subarray(5);
    const err = protobufType.verify(message);    
    if (err) {
        console.log(err);
        return undefined;
    }

    try {
        const decodedMessage = protobufType.decode(message);
        return protobufType.toObject(decodedMessage);
    } catch(e) {
        console.log(e);
        return undefined;
    }
}
