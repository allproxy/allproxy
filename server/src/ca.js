'use strict'

const FS = require('fs')
const path = require('path')
const Forge = require('node-forge')
const pki = Forge.pki
const mkdirp = require('mkdirp')
const async = require('async')

const CAattrs = [{
  name: 'commonName',
  value: 'AllProxyCA'
}, {
  name: 'countryName',
  value: 'Internet'
}, {
  shortName: 'ST',
  value: 'Internet'
}, {
  name: 'localityName',
  value: 'Internet'
}, {
  name: 'organizationName',
  value: 'AllProxy CA'
}, {
  shortName: 'OU',
  value: 'CA'
}]

const CAextensions = [{
  name: 'basicConstraints',
  cA: true
}, {
  name: 'keyUsage',
  keyCertSign: true,
  digitalSignature: true,
  nonRepudiation: true,
  keyEncipherment: true,
  dataEncipherment: true
}, {
  name: 'extKeyUsage',
  serverAuth: true,
  clientAuth: true,
  codeSigning: true,
  emailProtection: true,
  timeStamping: true
}, {
  name: 'nsCertType',
  client: true,
  server: true,
  email: true,
  objsign: true,
  sslCA: true,
  emailCA: true,
  objCA: true
}, {
  name: 'subjectKeyIdentifier'
}]

const ServerAttrs = [{
  name: 'countryName',
  value: 'Internet'
}, {
  shortName: 'ST',
  value: 'Internet'
}, {
  name: 'localityName',
  value: 'Internet'
}, {
  name: 'organizationName',
  value: 'AllProxy CA'
}, {
  shortName: 'OU',
  value: 'AllProxy Server Certificate'
}]

const ServerExtensions = [{
  name: 'basicConstraints',
  cA: false
}, {
  name: 'keyUsage',
  keyCertSign: false,
  digitalSignature: true,
  nonRepudiation: false,
  keyEncipherment: true,
  dataEncipherment: true
}, {
  name: 'extKeyUsage',
  serverAuth: true,
  clientAuth: true,
  codeSigning: false,
  emailProtection: false,
  timeStamping: false
}, {
  name: 'nsCertType',
  client: true,
  server: true,
  email: false,
  objsign: false,
  sslCA: false,
  emailCA: false,
  objCA: false
}, {
  name: 'subjectKeyIdentifier'
}]

const CA = function () {
}

CA.create = function (caFolder, callback) {
  const ca = new CA()
  ca.baseCAFolder = caFolder
  ca.certsFolder = path.join(ca.baseCAFolder, 'certs')
  ca.keysFolder = path.join(ca.baseCAFolder, 'keys')

  mkdirp.sync(ca.baseCAFolder);
  mkdirp.sync(ca.certsFolder);
  mkdirp.sync(ca.keysFolder);
  async.series([
    function (callback) {
      FS.exists(path.join(ca.certsFolder, 'ca.pem'), function (exists) {
        if (exists) {
          ca.loadCA(callback)
        } else {
          ca.generateCA(callback)
        }
      })
    }
  ], function (err) {
    if (err) {
      return callback(err)
    }
    return callback(null, ca)
  })
}

CA.prototype.randomSerialNumber = function () {
  // generate random 16 bytes hex string
  let sn = ''
  for (let i = 0; i < 4; i++) {
    sn += ('00000000' + Math.floor(Math.random() * Math.pow(256, 4)).toString(16)).slice(-8)
  }
  sn = '01';
  return sn
}

CA.prototype.generateCA = function (callback) {
  const self = this
  pki.rsa.generateKeyPair({ bits: 2048 }, function (err, keys) {
    if (err) {
      return callback(err)
    }
    const cert = pki.createCertificate()
    cert.publicKey = keys.publicKey
    cert.serialNumber = self.randomSerialNumber()
    cert.validity.notBefore = new Date()
    cert.validity.notBefore.setDate(cert.validity.notBefore.getDate() - 1)
    cert.validity.notAfter = new Date()
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 2)
    cert.setSubject(CAattrs)
    cert.setIssuer(CAattrs)
    cert.setExtensions(CAextensions)
    cert.sign(keys.privateKey, Forge.md.sha256.create())
    self.CAcert = cert
    self.CAkeys = keys
    async.parallel([
      FS.writeFile.bind(null, path.join(self.certsFolder, 'ca.pem'), pki.certificateToPem(cert)),
      FS.writeFile.bind(null, path.join(self.keysFolder, 'ca.private.key'), pki.privateKeyToPem(keys.privateKey)),
      FS.writeFile.bind(null, path.join(self.keysFolder, 'ca.public.key'), pki.publicKeyToPem(keys.publicKey))
    ], callback)
  })
}

CA.prototype.loadCA = function (callback) {
  const self = this
  async.auto({
    certPEM: function (callback) {
      FS.readFile(path.join(self.certsFolder, 'ca.pem'), 'utf-8', callback)
    },
    keyPrivatePEM: function (callback) {
      FS.readFile(path.join(self.keysFolder, 'ca.private.key'), 'utf-8', callback)
    },
    keyPublicPEM: function (callback) {
      FS.readFile(path.join(self.keysFolder, 'ca.public.key'), 'utf-8', callback)
    }
  }, function (err, results) {
    if (err) {
      return callback(err)
    }
    self.CAcert = pki.certificateFromPem(results.certPEM)
    self.CAkeys = {
      privateKey: pki.privateKeyFromPem(results.keyPrivatePEM),
      publicKey: pki.publicKeyFromPem(results.keyPublicPEM)
    }
    return callback()
  })
}

CA.prototype.generateServerCertificateKeys = function (hosts, cb) {
  const self = this
  if (typeof (hosts) === 'string') hosts = [hosts]
  const mainHost = hosts[0]
  const keysServer = pki.rsa.generateKeyPair(2048)
  const certServer = pki.createCertificate()
  certServer.publicKey = keysServer.publicKey
  certServer.serialNumber = this.randomSerialNumber()
  certServer.validity.notBefore = new Date()
  certServer.validity.notBefore.setDate(certServer.validity.notBefore.getDate() - 1)
  certServer.validity.notAfter = new Date()
  certServer.validity.notAfter.setFullYear(certServer.validity.notBefore.getFullYear() + 2)
  const attrsServer = ServerAttrs.slice(0)
  attrsServer.unshift({
    name: 'commonName',
    value: mainHost
  })
  certServer.setSubject(attrsServer)
  certServer.setIssuer(this.CAcert.issuer.attributes)
  certServer.setExtensions(ServerExtensions.concat([{
    name: 'subjectAltName',
    altNames: hosts.map(function (host) {
      if (host.match(/^[\d\.]+$/)) {
        return { type: 7, ip: host }
      }
      return { type: 2, value: host }
    })
  }]))
  certServer.sign(this.CAkeys.privateKey, Forge.md.sha256.create())
  const certPem = pki.certificateToPem(certServer)
  const keyPrivatePem = pki.privateKeyToPem(keysServer.privateKey)
  const keyPublicPem = pki.publicKeyToPem(keysServer.publicKey)
  FS.writeFile(this.certsFolder + '/' + mainHost.replace(/\*/g, '_') + '.pem', certPem, function (error) {
    if (error) console.error('Failed to save certificate to disk in ' + self.certsFolder, error)
  })
  FS.writeFile(this.keysFolder + '/' + mainHost.replace(/\*/g, '_') + '.key', keyPrivatePem, function (error) {
    if (error) console.error('Failed to save private key to disk in ' + self.keysFolder, error)
  })
  FS.writeFile(this.keysFolder + '/' + mainHost.replace(/\*/g, '_') + '.public.key', keyPublicPem, function (error) {
    if (error) console.error('Failed to save public key to disk in ' + self.keysFolder, error)
  })
  // returns synchronously even before files get written to disk
  cb(certPem, keyPrivatePem)
}

CA.prototype.getCACertPath = function () {
  return this.certsFolder + '/ca.pem'
}

CA.prototype.getCertContent = function () {
  return this.CAcert;
}

module.exports = CA
