//import zlib from 'zlib';
const pako = require('pako');

export function decompressResponse(headers: { [key: string]: any }, data: Buffer): Buffer {
  //console.log('decompress', headers['content-encoding']);
  if (headers['content-encoding'] === 'gzip') {
    //delete headers['content-encoding'];
    //data = zlib.gunzipSync(data);
    data = pako.ungzip(data, { to: 'string' });
  } else if (headers['content-encoding'] === 'br') {
    //delete headers['content-encoding'];
    //data = zlib.brotliDecompressSync(data);
    data = pako.deflate(data);
  } else if (headers['content-encoding'] === 'deflate') {
    //delete headers['content-encoding'];
    //data = zlib.deflateSync(data);
    data = pako.deflate(data);
  }
  return data;
}

export function compressResponse(headers: { [key: string]: any }, data: Buffer): Buffer {
  //console.log('compress', headers['content-encoding']);
  if (headers['content-encoding'] === 'gzip') {
    //data = zlib.gzipSync(data);
    data = pako.gzip(data);
  } else if (headers['content-encoding'] === 'br') {
    ///data = zlib.brotliCompressSync(data);
    data = pako.inflate(data);
  } else if (headers['content-encoding'] === 'deflate') {
    //data = zlib.inflateSync(data);
    data = pako.inflate(data);
  }
  return data;
}
