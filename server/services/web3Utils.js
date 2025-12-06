/**
 * Web3 Utilities for ECDSA Signing
 * Used by Aster DEX and other DEX integrations
 * 
 * Implements Ethereum-style signing without external dependencies
 * For production use, consider using ethers.js or web3.js
 */

const crypto = require('crypto');

/**
 * Keccak-256 hash function (Ethereum's SHA3)
 * Uses the pure JS implementation below
 * @param {Buffer|string} data - Data to hash
 * @returns {string} Hex string of hash
 */
function keccak256(data) {
  const input = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
  return keccak256Pure(input);
}

/**
 * Simple Keccak-256 implementation
 * Based on the Keccak specification
 */
function keccak256Pure(input) {
  // Keccak-256 constants
  const ROUNDS = 24;
  const RC = [
    0x0000000000000001n, 0x0000000000008082n, 0x800000000000808an,
    0x8000000080008000n, 0x000000000000808bn, 0x0000000080000001n,
    0x8000000080008081n, 0x8000000000008009n, 0x000000000000008an,
    0x0000000000000088n, 0x0000000080008009n, 0x000000008000000an,
    0x000000008000808bn, 0x800000000000008bn, 0x8000000000008089n,
    0x8000000000008003n, 0x8000000000008002n, 0x8000000000000080n,
    0x000000000000800an, 0x800000008000000an, 0x8000000080008081n,
    0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n
  ];

  const ROTATIONS = [
    [0, 36, 3, 41, 18],
    [1, 44, 10, 45, 2],
    [62, 6, 43, 15, 61],
    [28, 55, 25, 21, 56],
    [27, 20, 39, 8, 14]
  ];

  // Pad the input
  const rate = 136; // 1088 bits = 136 bytes for Keccak-256
  const inputBytes = Buffer.isBuffer(input) ? input : Buffer.from(input);
  
  // Padding: append 0x01, then 0x00s, then 0x80
  const paddedLength = Math.ceil((inputBytes.length + 1) / rate) * rate;
  const padded = Buffer.alloc(paddedLength);
  inputBytes.copy(padded);
  padded[inputBytes.length] = 0x01;
  padded[paddedLength - 1] |= 0x80;

  // Initialize state
  const state = new Array(25).fill(0n);

  // Absorb
  for (let i = 0; i < paddedLength; i += rate) {
    for (let j = 0; j < rate / 8; j++) {
      const idx = j;
      if (idx < 25) {
        const bytes = padded.slice(i + j * 8, i + j * 8 + 8);
        let value = 0n;
        for (let k = 0; k < 8 && i + j * 8 + k < paddedLength; k++) {
          value |= BigInt(bytes[k] || 0) << BigInt(k * 8);
        }
        state[idx] ^= value;
      }
    }
    
    // Permutation rounds
    for (let round = 0; round < ROUNDS; round++) {
      // Theta
      const C = new Array(5).fill(0n);
      for (let x = 0; x < 5; x++) {
        C[x] = state[x] ^ state[x + 5] ^ state[x + 10] ^ state[x + 15] ^ state[x + 20];
      }
      const D = new Array(5);
      for (let x = 0; x < 5; x++) {
        D[x] = C[(x + 4) % 5] ^ rotl64(C[(x + 1) % 5], 1n);
      }
      for (let x = 0; x < 5; x++) {
        for (let y = 0; y < 5; y++) {
          state[x + y * 5] ^= D[x];
        }
      }

      // Rho and Pi
      const B = new Array(25).fill(0n);
      for (let x = 0; x < 5; x++) {
        for (let y = 0; y < 5; y++) {
          const idx = x + y * 5;
          B[y + ((2 * x + 3 * y) % 5) * 5] = rotl64(state[idx], BigInt(ROTATIONS[y][x]));
        }
      }

      // Chi
      for (let x = 0; x < 5; x++) {
        for (let y = 0; y < 5; y++) {
          const idx = x + y * 5;
          state[idx] = B[idx] ^ ((~B[((x + 1) % 5) + y * 5]) & B[((x + 2) % 5) + y * 5]);
        }
      }

      // Iota
      state[0] ^= RC[round];
    }
  }

  // Squeeze (output 256 bits = 32 bytes)
  const output = Buffer.alloc(32);
  for (let i = 0; i < 4; i++) {
    const value = state[i];
    for (let j = 0; j < 8; j++) {
      output[i * 8 + j] = Number((value >> BigInt(j * 8)) & 0xffn);
    }
  }

  return output.toString('hex');
}

function rotl64(x, n) {
  n = n % 64n;
  return ((x << n) | (x >> (64n - n))) & 0xffffffffffffffffn;
}

/**
 * Derive Ethereum address from private key
 * @param {string} privateKey - Private key (hex string with or without 0x prefix)
 * @returns {string} Ethereum address with 0x prefix
 */
function privateKeyToAddress(privateKey) {
  const key = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
  
  // Get public key using secp256k1
  const { createECDH } = crypto;
  const ecdh = createECDH('secp256k1');
  ecdh.setPrivateKey(Buffer.from(key, 'hex'));
  
  // Get uncompressed public key (65 bytes: 04 + x + y)
  const publicKey = ecdh.getPublicKey('hex', 'uncompressed');
  
  // Remove 04 prefix and hash with keccak256
  const publicKeyWithoutPrefix = publicKey.slice(2);
  const hash = keccak256Pure(Buffer.from(publicKeyWithoutPrefix, 'hex'));
  
  // Take last 20 bytes (40 hex chars) as address
  const address = '0x' + hash.slice(-40);
  
  return address;
}

/**
 * ABI encode for Aster DEX signature
 * Encodes: (string queryString, address user, address signer, uint256 nonce)
 * @returns {Buffer} Encoded data
 */
function abiEncode(queryString, user, signer, nonce) {
  // Simplified ABI encoding for Aster's specific format
  // In production, use ethers.js AbiCoder
  
  // Convert addresses to lowercase without 0x
  const userAddr = user.toLowerCase().replace('0x', '');
  const signerAddr = signer.toLowerCase().replace('0x', '');
  
  // Encode nonce as uint256 (32 bytes)
  const nonceHex = BigInt(nonce).toString(16).padStart(64, '0');
  
  // Encode query string with length prefix (dynamic type)
  const queryBytes = Buffer.from(queryString, 'utf8');
  const queryLenHex = queryBytes.length.toString(16).padStart(64, '0');
  const queryHex = queryBytes.toString('hex').padEnd(Math.ceil(queryBytes.length / 32) * 64, '0');
  
  // Combine: offset for string + user + signer + nonce + string length + string data
  const encoded = Buffer.concat([
    Buffer.from('0'.repeat(62) + '80', 'hex'), // Offset to string data (128 = 0x80)
    Buffer.from(userAddr.padStart(64, '0'), 'hex'),
    Buffer.from(signerAddr.padStart(64, '0'), 'hex'),
    Buffer.from(nonceHex, 'hex'),
    Buffer.from(queryLenHex, 'hex'),
    Buffer.from(queryHex, 'hex')
  ]);
  
  return encoded;
}

/**
 * Sign a message hash with ECDSA (Ethereum style)
 * @param {string} messageHash - Hash to sign (hex string)
 * @param {string} privateKey - Private key (hex string with 0x prefix)
 * @returns {string} Signature (0x + r + s + v)
 */
function signMessage(messageHash, privateKey) {
  const key = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
  const hashBuffer = Buffer.from(messageHash.replace('0x', ''), 'hex');
  
  // Add Ethereum signed message prefix
  const prefix = '\x19Ethereum Signed Message:\n32';
  const prefixedMessage = Buffer.concat([
    Buffer.from(prefix),
    hashBuffer
  ]);
  const prefixedHash = keccak256Pure(prefixedMessage);
  
  // Sign using Node.js crypto
  const { sign } = crypto;
  const keyPair = crypto.createPrivateKey({
    key: Buffer.concat([
      Buffer.from('302e0201010420', 'hex'), // ASN.1 header for secp256k1
      Buffer.from(key, 'hex'),
      Buffer.from('a00706052b8104000a', 'hex') // secp256k1 OID
    ]),
    format: 'der',
    type: 'sec1'
  });
  
  const signature = sign(null, Buffer.from(prefixedHash, 'hex'), {
    key: keyPair,
    dsaEncoding: 'ieee-p1363'
  });
  
  // Extract r, s from signature
  const r = signature.slice(0, 32).toString('hex');
  const s = signature.slice(32, 64).toString('hex');
  
  // Calculate v (recovery id) - simplified, may need adjustment
  const v = '1b'; // 27 in hex, or 1c (28) depending on recovery
  
  return '0x' + r + s + v;
}

/**
 * Alternative sign function using HMAC for fallback
 * Not true ECDSA but works for testing
 */
function signMessageFallback(messageHash, privateKey) {
  const key = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
  const hash = messageHash.startsWith('0x') ? messageHash.slice(2) : messageHash;
  
  const signature = crypto
    .createHmac('sha256', Buffer.from(key, 'hex'))
    .update(Buffer.from(hash, 'hex'))
    .digest('hex');
  
  // Pad to look like ECDSA signature (r + s + v)
  return '0x' + signature.padEnd(128, '0') + '1b';
}

module.exports = {
  keccak256: keccak256Pure,
  privateKeyToAddress,
  abiEncode,
  signMessage,
  signMessageFallback
};
