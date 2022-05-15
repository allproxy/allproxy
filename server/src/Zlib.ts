import zlib from 'zlib';

export function decompressResponse(headers: { [key: string]: any }, data: Buffer): Buffer {
  if (headers['content-encoding'] === 'gzip') {
    //delete headers['content-encoding'];
    data = zlib.gunzipSync(data);
  } else if (headers['content-encoding'] === 'br') {
    //delete headers['content-encoding'];
    data = zlib.brotliDecompressSync(data);
  } else if (headers['content-encoding'] === 'deflate') {
    //delete headers['content-encoding'];
    data = zlib.deflateSync(data);
  }
  return data;
}

export function compressResponse(headers: { [key: string]: any }, data: Buffer): Buffer {
  if (headers['content-encoding'] === 'gzip') {
    data = zlib.gzipSync(data);
  } else if (headers['content-encoding'] === 'br') {
    data = zlib.brotliCompressSync(data);
  } else if (headers['content-encoding'] === 'deflate') {
    data = zlib.inflateSync(data);
  }
  return data;
}
