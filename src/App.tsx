import React from "react";
import axios from "axios";
import WalletConnect from "walletconnect";

// @ts-ignore
import logo from "./logo.svg";
import "./App.css";

const baseUrl = "https://api.deversifi.dev/v1/trading";

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
  const [starkProvider, setStarkProvider] = React.useState<any>();
  const [starkPublicKey, setStarkPublicKey] = React.useState<string>("");
  const [nonce, setNonce] = React.useState<string>("");
  const [signature, setSignature] = React.useState<string>("");

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
      contractAddress: "0x47d2fAc88B14163DE64e4AFF3cA08069caa459d9",
    });
    setStarkProvider(starkProvider);
    const starkPublicKey = await starkProvider.enable(
      layer,
      application,
      index
    );
    setStarkPublicKey(starkPublicKey);
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
    await starkProvider.register(deFiSignature);
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
          </>
        ) : (
          <button onClick={connect}>Connect</button>
        )}
      </header>
    </div>
  );
}

export default App;
