'use strict';

const log = (content) => { return utilitas.modLog(content, __filename); };

let apiUrl = null;

const getApiUrl = async (path, args) => {
    console.log(path);
    const pfncs = await config({ basicConfigOnly: true });
    if (!apiUrl && pfncs.speedTest && pfncs.debug) {
        log('Evaluating Chain API nodes...');
    }
    apiUrl = pfncs.speedTest
        ? await network.pickFastestHost(pfncs.chainApi, { debug: pfncs.debug })
        : utilitas.getConfigFromStringOrArray(pfncs.chainApi);
    utilitas.assert(apiUrl, 'Chain api root has not been configured', 500);
    return path ? utilitas.assembleApiUrl(apiUrl, `api/${path}`, args) : apiUrl;
};

const requestApi = async (method, path, urlArgs, body, error, options = {}) => {
    utilitas.assert(method && path, 'Invalid chain api requesting args.', 400);
    const req = { method: method, ...options };
    if (body) { req.body = body; }
    const result = await fetch(await getApiUrl(path,
        urlArgs), req).then(res => res.json());
    utilitas.assert(result && result.data && !result.error, error
        || 'Error querying chain api.', 500);
    return result.data;
};

const getNodes = async () => {
    return await requestApi('GET', 'nodes');
};

module.exports = {
    getApiUrl,
    getNodes,
    requestApi,
};

const { utilitas, network, fetch } = require('utilitas');
const config = require('./config');