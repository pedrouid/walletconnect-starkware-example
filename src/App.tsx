import React from "react";
import WalletConnect from "walletconnect";
import StarkwareProvider, { deserializeSignature } from "starkware-provider";
import { MethodParams } from "starkware-types";

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
  const [transferParams, setTransferParams] = React.useState<
    MethodParams.StarkTransferParams
  >();

  const [transferSignature, setTransferSignature] = React.useState<string>("");
  const [depositTx, setDepositTx] = React.useState<string>("");
  const [depositStatus, setDepositStatus] = React.useState<string>("");

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
    console.log({ starkProvider });
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

  async function formatTransfer() {
    const amount = 0.1;
    const tokenType = "ETH" as "ETH";

    const tempVaultId = DVF.config.DVF.tempStarkVaultId;
    const starkVaultId = await DVF.getVaultId(tokenType, nonce, signature);

    const currency = DVF.config.tokenRegistry[tokenType];
    console.log({ currency });
    const Tnonce = Math.ceil(Math.random() * 999999999);
    const quantizedAmount =
      (amount * (10 ** currency.decimals) / currency.quantization);
    console.log({amount, quantizedAmount})
    const expirationTimestamp = Math.floor(Date.now() / (1000 * 3600)) + 720;

    const to = {
      starkPublicKey: starkPublicKey,
      vaultId: String(starkVaultId),
    };
    const from = {
      starkPublicKey: starkPublicKey,
      vaultId: String(tempVaultId),
    };
    // for testing, to be removed after WiP is done
    const token = {
      type: tokenType,
      data: {
        quantum: String(currency.quantization),
      },
    };

    const transferParams: MethodParams.StarkTransferParams = {
      from,
      to,
      token,
      quantizedAmount: String(quantizedAmount),
      nonce: String(Tnonce),
      expirationTimestamp: String(expirationTimestamp),
    };
    console.log(transferParams);
    setTransferParams(transferParams);
  }

  async function transfer() {
    if (!starkProvider) {
      throw new Error("Stark Provider not enabled");
    }
    if (!transferParams) {
      throw new Error("Transfer params is undefined");
    }

    const transferSignature = await starkProvider.transfer(
      transferParams.to,
      transferParams.from.vaultId,
      transferParams.token,
      transferParams.quantizedAmount,
      transferParams.nonce,
      transferParams.expirationTimestamp
    );
    console.log('transferSignature ', transferSignature)
    setTransferSignature(transferSignature);
  }

  async function onchainDeposit() {
    if (!starkProvider) {
      throw new Error("Stark Provider not enabled");
    }
    if (!transferParams) {
      throw new Error("Transfer params is undefined");
    }
    const depositTx = await starkProvider.deposit(
      transferParams.quantizedAmount,
      transferParams.token,
      transferParams.to.vaultId
    );
    setDepositTx(depositTx);
    console.log({ depositTx });
  }

  async function offchainDeposit() {
    if (!transferParams) {
      throw new Error("Transfer params is undefined");
    }
    const sig = deserializeSignature(transferSignature);
    const starkSignature = {
      r: sig.r.toString(16),
      s: sig.s.toString(16),
      recoveryParam: sig.recoveryParam as number,
    };
    console.log({ starkSignature });
    // calling offchain deposit method
    const depositResponse = await DVF.deposit(
      transferParams.token.type,
      transferParams.quantizedAmount,
      transferParams.nonce,
      starkPublicKey,
      starkSignature,
      transferParams.to.vaultId,
      transferParams.expirationTimestamp
    );

    console.log({ depositResponse });
    setDepositStatus(depositResponse?.status || "");
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
            <button onClick={formatTransfer}>Format Transfer</button>
            <div>{`transfer params set: ${!!transferParams}`}</div>
            <button onClick={transfer}>Sign Transfer</button>
            <div>{`transfer signature: ${transferSignature}`}</div>
            <button onClick={onchainDeposit}>OnChain Deposit</button>
            <div>{`deposit transaction: ${depositTx}`}</div>
            <button onClick={offchainDeposit}>OffChain Deposit</button>
            <div>{`deposit status: ${depositStatus}`}</div>
          </>
        ) : (
          <button onClick={connect}>Connect</button>
        )}
      </header>
    </div>
  );
}

export default App;
