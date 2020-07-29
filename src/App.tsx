import React from "react";
import axios from "axios";
import WalletConnect from "walletconnect";
import StarkwareProvider from "starkware-provider";

// @ts-ignore
import logo from "./logo.svg";
import { dvfConfig } from "./dvfConfig";
import "./App.css";

const baseUrl = "https://api.deversifi.dev/v1/trading";

let config = dvfConfig;

async function requestApi(path: string, params: any) {
  const res = await axios.post(baseUrl + path, params, {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });
  return res.data;
}

function App() {
  const [wc, setWC] = React.useState<WalletConnect>();
  const [starkProvider, setStarkProvider] = React.useState<StarkwareProvider>();
  const [starkPublicKey, setStarkPublicKey] = React.useState<string>("");
  const [nonce, setNonce] = React.useState<string>("");
  const [signature, setSignature] = React.useState<string>("");
  const [registerTx, setRegisterTx] = React.useState<string>("");
  const [transferSignature, setTransferSignature] = React.useState<string>("");

  async function getUserConfig() {
    config = await requestApi(`/r/getUserConf`, {
      nonce: Number(nonce),
      signature,
    });

    console.log(config);
  }
  async function connect() {
    if (!process.env.REACT_APP_INFURA_ID) {
      throw new Error("Missing Infura Id");
    }

    const wc = new WalletConnect();
    await wc.connect();
    setWC(wc);

    const layer = "starkex";
    const application = "starkexdvf";
    const index = "0"; //(default)

    const starkProvider = await wc.getStarkwareProvider({
      contractAddress: config.DVF.starkExContractAddress,
    });

    setStarkProvider(starkProvider);
    const starkPublicKey = await starkProvider.enable(
      layer,
      application,
      index
    );

    setStarkPublicKey(starkPublicKey);
    console.log(starkProvider);
  }

  async function signNonce() {
    if (!starkProvider) {
      throw new Error("Stark Provider not enabled");
    }
    const address = wc?.connector?.accounts[0];
    const msg = String(Date.now() / 1000);
    setNonce(msg);
    const sig = await starkProvider.send("personal_sign", [msg, address]);
    setSignature(sig);
  }

  async function register() {
    if (!starkProvider) {
      throw new Error("Stark Provider not enabled");
    }
    const { deFiSignature } = await requestApi(`/w/register`, {
      starkKey: starkPublicKey.replace("0x", ""),
      nonce: Number(nonce),
      signature,
    });
    const response = await starkProvider.register(deFiSignature);
    setRegisterTx(response);
    console.log({ response });
  }

  async function transfer() {
    // await getUserConfig()
    const token = "ETH";
    if (!starkProvider) {
      throw new Error("Stark Provider not enabled");
    }

    const tempVaultId = config.DVF.tempStarkVaultId;
    const starkVaultId = await requestApi(`/r/getVaultId`, {
      token,
      nonce: Number(nonce),
      signature,
    });

    const currency = config.tokenRegistry[token];
    console.log({ currency });
    const Tnonce = Math.ceil(Math.random() * 999999999);
    const quantizedAmount = "100000000";
    const expireTime = Math.floor(Date.now() / (1000 * 3600)) + 720;

    const to = {
      starkPublicKey: starkPublicKey,
      vaultId: String(starkVaultId),
    };
    // for testing, to be removed after WiP is done
    const Token = {
      type: "ETH" as "ETH",
      data: {
        quantum: String(currency.quantization),
      },
    };

    console.log(
      to,
      String(tempVaultId),
      Token,
      quantizedAmount,
      String(Tnonce),
      String(expireTime)
    );

    const transferSignature = await starkProvider.transfer(
      to,
      String(tempVaultId),
      Token,
      quantizedAmount,
      String(nonce),
      String(expireTime)
    );
    setTransferSignature(transferSignature);
  }

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <div>{starkPublicKey ? "Connected!" : "Not connected"}</div>
        {starkPublicKey ? (
          <>
            <div>{`starkPublicKey: ${starkPublicKey}`}</div>
            <button onClick={signNonce}>Sign Nonce</button>
            <div>{`nonce: ${nonce}`}</div>
            <div>{`signature: ${signature}`}</div>
            <button onClick={register}>Register</button>
            <div>{`register transaction: ${registerTx}`}</div>
            <button onClick={transfer}>Sign Transfer Message</button>
            <div>{`transfer signature: ${transferSignature}`}</div>
          </>
        ) : (
          <button onClick={connect}>Connect</button>
        )}
      </header>
    </div>
  );
}

export default App;
