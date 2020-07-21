import React from "react";
import WalletConnect from "walletconnect";
import * as encUtils from "enc-utils";

// @ts-ignore
import logo from "./logo.svg";
import "./App.css";

const baseUrl = "https://api.stg.deversifi.com/v1/trading";

async function requestApi(url: string, params: any) {
  const response = await fetch(url, {
    method: "POST",
    body: JSON.stringify(params),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });
  return response.json();
}

function App() {
  const [wc, setWC] = React.useState<WalletConnect>();
  const [starkProvider, setStarkProvider] = React.useState<any>();
  const [starkPublicKey, setStarkPublicKey] = React.useState<string>("");
  const [nonce, setNonce] = React.useState<string>("");
  const [signature, setSignature] = React.useState<string>("");

  // function reset() {
  //   console.log("reset");
  //   setWC(undefined);
  //   setStarkProvider(undefined);
  //   setStarkPublicKey("");
  // }

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
    const sig = await starkProvider.send("personal_sign", [
      encUtils.utf8ToHex(msg),
      address,
    ]);
    setSignature(sig);
  }

  async function register() {
    if (!starkProvider) {
      throw new Error("Stark Provider not enabled");
    }
    const operatorSignature = await requestApi(`${baseUrl}/w/register`, {
      starkKey:
        "6d840e6d0ecfcbcfa83c0f704439e16c69383d93f51427feb9a4f2d21fbe075",
      nonce: 1579783140.807,
      signature:
        "0x7e83e5fb1eb382d06906efa984a1cbf9c7a5bd301cbbbfa68d5d23624f9d301358329465291f5b72a9680687badf8f01a474193bd738add3d89e8d7e0e034b2b00",
    });
    await starkProvider.register(operatorSignature);
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
