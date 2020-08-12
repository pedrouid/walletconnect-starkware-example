import React from "react";
import WalletConnect from "walletconnect";
import StarkwareProvider from "starkware-provider";

// @ts-ignore
import logo from "./logo.svg";
import * as DVF from "./dvf";
import "./App.css";

function App() {
  const [wc, setWC] = React.useState<WalletConnect>();
  const [starkProvider, setStarkProvider] = React.useState<StarkwareProvider>();
  const [starkPublicKey, setStarkPublicKey] = React.useState<string>("");
  const [nonce, setNonce] = React.useState<string>("");
  const [signature, setSignature] = React.useState<string>("");
  const [registerTx, setRegisterTx] = React.useState<string>("");
  const [transferSignature, setTransferSignature] = React.useState<string>("");

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
      contractAddress: DVF.config.DVF.starkExContractAddress,
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
    const msg = String(Date.now() / 1000).split(".")[0];
    setNonce(msg);
    const sig = await starkProvider.send("personal_sign", [msg, address]);
    setSignature(sig);
  }

  async function register() {
    if (!starkProvider) {
      throw new Error("Stark Provider not enabled");
    }
    const res = await DVF.registerUser(starkPublicKey, nonce, signature);
    if (!res.isRegistered) {
      const registerTx = await starkProvider.register(res.deFiSignature);
      setRegisterTx(registerTx);
      console.log({ registerTx });
    }
  }

  async function transfer() {
    // await DVF.etUserConfig()
    const token = "ETH";
    if (!starkProvider) {
      throw new Error("Stark Provider not enabled");
    }

    const tempVaultId = DVF.config.DVF.tempStarkVaultId;
    const starkVaultId = await DVF.getVaultId(token, nonce, signature);

    const currency = DVF.config.tokenRegistry[token];
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
