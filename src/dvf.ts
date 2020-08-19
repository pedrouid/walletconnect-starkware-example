import axios, { AxiosInstance } from "axios";
import * as starkwareCrypto from "starkware-crypto";

export const config = {
  DVF: {
    defaultFeeRate: 0.002,
    deversifiAddress: "0x9ab450355b4ab504cbc0e4de484781dac08e6a26",
    starkExContractAddress: "0x238d3f5383e44656106c6171a146deed3a09d1a3",
    exchangeSymbols: ["ETH:USDT", "ZRX:USDT", "ZRX:ETH", "BTC:USDT", "ETH:BTC"],
    tempStarkVaultId: 1,
    minDepositUSDT: 1,
  },
  tokenRegistry: {
    ETH: {
      decimals: 18,
      quantization: 10000000000,
      minOrderSize: 0.05,
      settleSpread: 0,
      starkTokenId:
        "0xb333e3142fe16b78628f19bb15afddaef437e72d6d7f5c6c20c6801a27fba6",
    },
    USDT: {
      decimals: 6,
      quantization: 1,
      minOrderSize: 10,
      settleSpread: 0,
      starkTokenId:
        "0x180bef8ae3462e919489763b84dc1dc700c45a249dec4d1136814a639f2dd7b",
      tokenAddress: "0x4c5f66596197a86fb30a2435e2ef4ddcb39342c9",
    },
    ZRX: {
      decimals: 18,
      quantization: 10000000000,
      minOrderSize: 20,
      settleSpread: 0,
      starkTokenId:
        "0x3901ee6a6c5ac0f6e284f4273b961b7e9f29d25367d31d90b75820473a202f7",
      tokenAddress: "0xcd077abedd831a3443ffbe24fb76661bbb17eb69",
    },
    BTC: {
      decimals: 18,
      quantization: 10000000000,
      minOrderSize: 0.0004,
      settleSpread: 0,
      starkTokenId:
        "0x21ef21d6b234cd669edd702dd3d1d017be888337010b950ae3679eb4194b4bc",
      tokenAddress: "0x40d8978500bf68324a51533cd6a21e3e59be324a",
    },
  },
};

const api: AxiosInstance = axios.create({
  baseURL: "https://api.deversifi.dev/v1/trading",
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

export async function getVaultId(
  token: string,
  nonce: string,
  signature: string
) {
  const { data } = await api.post(`/r/getVaultId`, {
    token,
    nonce: Number(nonce),
    signature,
  });
  return data;
}

export async function registerUser(
  starkPublicKey: string,
  nonce: string,
  signature: string
) {
  const { data } = await api.post(`/w/register`, {
    starkKey: starkwareCrypto.getXCoordinate(starkPublicKey),
    nonce: Number(nonce),
    signature,
  });
  return data;
}

export async function deposit(
  token: string,
  amount: string,
  nonce: string,
  starkPublicKey: string,
  starkSignature: { r: string; s: string; recoveryParam: number },
  starkVaultId: string,
  expireTime: string
) {
  const { data } = await api.post(`/w/deposit`, {
    token,
    amount,
    nonce: Number(nonce),
    starkPublicKey: {
      x: starkwareCrypto.getXCoordinate(starkPublicKey),
      y: starkwareCrypto.getYCoordinate(starkPublicKey),
    },
    starkSignature,
    starkVaultId: Number(starkVaultId),
    expireTime: Number(expireTime),
  });
  return data;
}

export async function getConfig() {
  return config;
}
