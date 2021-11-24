import zlib from 'zlib';

export default function decompressResponse (headers: {[key:string]: any}, data: Buffer): Buffer {
  if (headers['content-encoding'] === 'gzip') {
    delete headers['content-encoding'];
    data = zlib.gunzipSync(data);
  } else if (headers['content-encoding'] === 'br') {
    delete headers['content-encoding'];
    data = zlib.brotliDecompressSync(data);
  }
  return data;
}
