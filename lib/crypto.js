'use strict';

const permissionLevels = ['active', 'owner'];

const leftpadZero = (dex) => {
    let hex = (+dex).toString(16).toUpperCase();
    if (hex.length % 2 > 0) { hex = '0' + hex; }
    return hex;
};

const sign = (string, privateKey) => {
    privateKey = utilitas.ensureString(privateKey);
    if (privateKey.length !== 64) { return ecc.signHash(string, privateKey); }
    const signature = ec.sign(string, privateKey, 'hex', { canonical: true });
    return signature.r.toString(16, 32)
        + signature.s.toString(16, 32)
        + leftpadZero(signature.recoveryParam.toString());
};

const signData = (data, privateKey) => {
    const [a, h] = [encryption.defaultAlgorithm, encryption.digestObject(data)];
    return { hash_algorithm: a, hash: h, signature: sign(h, privateKey) };
};

const recoverAddressBySignatureAndHash = (sig, msgHash) => {
    const mB = utilitas.hexDecode(msgHash, true);
    const sB = utilitas.hexDecode(sig.slice(0, 128), true);
    const ecdsaPubKey = secp256k1.ecdsaRecover(sB, Number(sig.slice(128)), mB);
    const pubKey = secp256k1.publicKeyConvert(ecdsaPubKey, false).slice(1);
    return utilitas.hexEncode(ethUtil.pubToAddress(Buffer.from(pubKey)), true);
};

// const recoverAddressBySignatureAndData = (sig, data) => {
//     return recoverAddressBySignatureAndHash(sig, encryption.digestObject(data));
// };

const verifySignature = (signature, hash, pubkey) => {
    return ecc.verifyHash(signature, hash, pubkey);
};

const verifySignatureOnChain = async (signature, hash, acc, options) => {
    options = options || {};
    options.permission = utilitas.ensureString(
        options.permission, { case: 'LOW' }
    ) || permissionLevels[0];
    const pmsLevel = permissionLevels.indexOf(options.permission);
    utilitas.assert(pmsLevel >= 0, 'Invalid permission.', 400);
    const keys = await account.getKeys(acc);
    const result = [];
    for (let item of keys) {
        const level = permissionLevels.indexOf(item.permission);
        if (level >= pmsLevel && verifySignature(signature, hash, item.key)) {
            result.push(item);
        }
    }
    return result.length ? result : null;
};

const verifySignatureLegacy = (signature, hash, userAddress) => {
    return userAddress === recoverAddressBySignatureAndHash(signature, hash);
};

const privateKeyToAddress = (privateKey) => {
    return keythereum.privateKeyToAddress(privateKey).slice(2);
};

module.exports = {
    privateKeyToAddress,
    sign,
    signData,
    verifySignature,
    verifySignatureLegacy,
    verifySignatureOnChain,
};

const { utilitas, encryption } = require('utilitas');
const keythereum = require('keythereum-pure-js');
const secp256k1 = require('secp256k1');
const elliptic = require('elliptic');
const ethUtil = require('ethereumjs-util');
const account = require('./account');
const ecc = require('eosjs-ecc');
const ec = new elliptic.ec('secp256k1');
