#!/usr/bin/env node
/**
 * Computes the IPFS CIDv0 of lit-action.js using only Node.js built-ins.
 * CIDv0 = base58btc( 0x12 0x20 + sha256( MerkleDAGNode( UnixFS(file) ) ) )
 */
const fs = require('fs');
const crypto = require('crypto');

const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58(buf) {
  let digits = [0];
  for (const byte of buf) {
    let carry = byte;
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry) { digits.push(carry % 58); carry = (carry / 58) | 0; }
  }
  const leading = [...buf].findIndex(b => b !== 0);
  return '1'.repeat(leading < 0 ? buf.length : leading) +
    digits.reverse().map(d => BASE58[d]).join('');
}

function varint(n) {
  const out = [];
  while (n > 127) { out.push((n & 0x7f) | 0x80); n >>>= 7; }
  out.push(n);
  return Buffer.from(out);
}

function pbBytes(field, data) {
  const tag = varint((field << 3) | 2);
  return Buffer.concat([tag, varint(data.length), data]);
}

function pbVarint(field, n) {
  return Buffer.concat([varint((field << 3) | 0), varint(n)]);
}

const content = fs.readFileSync('lit-action.js');

// UnixFS Data proto: type=File(2), Data=content, filesize=len
const unixfs = Buffer.concat([
  pbVarint(1, 2),           // type = File
  pbBytes(2, content),      // Data = raw bytes
  pbVarint(4, content.length), // filesize
]);

// MerkleDAG PBNode: Data = unixfs blob (field 1)
const dagNode = pbBytes(1, unixfs);

// sha256 → multihash → base58
const sha = crypto.createHash('sha256').update(dagNode).digest();
const multihash = Buffer.concat([Buffer.from([0x12, 0x20]), sha]);
const cid = base58(multihash);

console.log(cid);
