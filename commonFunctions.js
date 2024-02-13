const { ApiPromise, Keyring, WsProvider } = require("@polkadot/api");
const { u8aConcat, u8aToU8a } = require("@polkadot/util");
const { blake2AsHex, decodeAddress } = require("@polkadot/util-crypto");
const { networks } = require("./constants");

const getNetworkApi = async (network) => {
  try {
    const api = new ApiPromise({
      provider: new WsProvider(network.ws),
    });
    await api.isReadyOrError;
    return api;
  } catch (error) {
    console.error("getNetworkApi error", error);
    throw error;
  }
};

const generateKeyPair = (mnemonic, type = "sr25519") => {
  const keyring = new Keyring({ type });
  const pair = keyring.addFromUri(mnemonic);
  return pair;
};

const createStorageKeys = (args) => {
  // console.log("args", args);
  // decode address to byte array
  const keysByteArray = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i].type === 0) {
      const decoded_address = decodeAddress(args[i].value, false, 42);
      keysByteArray.push(decoded_address);
    }
    if (args[i].type === 1) {
      const hash_name = u8aToU8a(args[i].value);
      keysByteArray.push(hash_name);
    }
  }
  const key = u8aConcat(...keysByteArray);
  // encode the key using blake2b
  const hashed_key = blake2AsHex(key, 256);
  console.log("hashed_key", hashed_key);
  return { hashed_key };
};

const makePalletQuery = async (palletName, storeName, args) => {
  try {
    const api = await getNetworkApi(networks.PEAQ);
    const data = await api.query[palletName][storeName](...args);
    // console.log("data---", data);
    api.disconnect();
    return data;
  } catch (error) {
    console.error(`Error ${makePalletQuery.name} - `, error);
    return error;
  }
};

const sendTransaction = async (extrinsic, keyPair, nonce) => {
  const hash = await extrinsic.signAndSend(keyPair, { nonce }, ({ events = [], status }) => {
    console.log('Transaction status:', status.type);

    if (status.isInBlock) {
      console.log('Included at block hash', status.asInBlock.toHex());
      console.log('Events:');

      events.forEach(({ event: { data, method, section }, phase }) => {
        console.log('\t', phase.toString(), `: ${section}.${method}`, data.toString());
      });
    } else if (status.isFinalized) {
      console.log('Finalized block hash', status.asFinalized.toHex());
      
      process.exit(0);
    }
  });
  return hash;
};

module.exports = {
    getNetworkApi,
    generateKeyPair,
    createStorageKeys,
    makePalletQuery,
    sendTransaction,
};
