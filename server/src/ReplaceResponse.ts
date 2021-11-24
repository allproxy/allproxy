import fs from 'fs';
import Paths from './Paths';
import { exec } from 'child_process';

const files: {[key:string]:string} = {};
let filesRead = false;

export default function replaceResponse (url: string): Buffer | null {
  if (!filesRead) {
    filesRead = true;
    const command = `find ${Paths.replaceResponsesDir()} -type f`;
    // console.log('replaceResponse', command)
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.log(error);
      }
      if (stderr) {
        console.log(stderr);
      }
      if (stdout) {
        for (const file of stdout.split('\n')) {
          if (file.length > 0) {
            const url = file.substr(Paths.replaceResponsesDir().length - 1);
            console.log('Found file in replace-responses directory for url:', url);
            files[url] = file;
          }
        }
      }
    });
  }

  const path = files[url];
  if (path) {
    console.log('Replacing response for url', url);
    return fs.readFileSync(path);
  }
  return null;
}
