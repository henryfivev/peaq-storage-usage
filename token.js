import fs from "fs";
const { mnemonicGenerate, cryptoWaitReady } = require("@polkadot/util-crypto");
const {
  createStorageKeys,
  generateKeyPair,
  getNetworkApi,
  makePalletQuery,
  sendTransaction,
} = require("./commonFunctions");
const { networks } = require("./constants");
const seed = "put impulse gadget fence humble soup mother card yard renew chat quiz";


const getMachineKeyPair = async () => {
  console.log("Fetching machine key pair from seed.txt...");
  if (fs.existsSync("seed.txt")) {
    const seed = fs.readFileSync("seed.txt", "utf8");
    if (seed) return generateKeyPair(seed);
  }

  console.log("No seed found, generating new key pair...");
  const seed = mnemonicGenerate();

  const pair = generateKeyPair(seed);
  fs.writeFileSync("seed.txt", seed);
  console.log("New key pair generated and saved to seed.txt");
  return pair;
};


const callStoragePallet = async (itemType, value, action) => {
  try {
    const api = await getNetworkApi(networks.PEAQ);
    const keyPair = generateKeyPair(seed);

    const onChainNonce = (
      await api.rpc.system.accountNextIndex(generateKeyPair(seed).address)
    ).toBn();

    const extrinsic = api.tx.peaqStorage[action](itemType, value);

    const hash = sendTransaction(extrinsic, keyPair, onChainNonce);
    console.log("hash", hash);
    return hash;
  } catch (error) {
    console.error("Error storing data on chain", error);
  }
};

const getStoragePallet = async () => {
  try {
    const api = await getNetworkApi(networks.PEAQ);
    const keyPair = generateKeyPair(seed);

    const onChainNonce = (
      await api.rpc.system.accountNextIndex(generateKeyPair(seed).address)
    ).toBn();

    const extrinsic = api.tx.peaqStorage["getItem"]("sensorData");

    const hash = await sendTransaction(extrinsic, keyPair, onChainNonce);
    console.log("hash", hash);
    return hash;
  } catch (error) {
    console.error("Error storing data on chain", error);
  }
};


const getStorage = async (itemType) => {
  const machineAddress = generateKeyPair(seed).address;

  const { hashed_key } = createStorageKeys([
    { value: machineAddress, type: 0 },
    { value: itemType, type: 1 },
  ]);

  const checkIfExists = await makePalletQuery("peaqStorage", "itemStore", [
    hashed_key,
  ]);
  return checkIfExists;
};


const simpleTest = async () => {
  try {
    const pair = await getMachineKeyPair();
    console.log("Machine address:", pair.address);

    const checkIfExists = await getStorage("sensorData");
    const actionType = checkIfExists && !checkIfExists?.isStorageFallback ? "updateItem" : "addItem";

    console.log(checkIfExists.length);
    console.log(String.fromCharCode(...checkIfExists));
    await callStoragePallet("sensorData", "dddaaa", actionType);
    await getStoragePallet();

    console.log('Store and get item from chain successfully');
  } catch (error) {
    console.error('Error---', error);
  }
};


const main = async () => {
  await cryptoWaitReady();
  await simpleTest();
};

main();
