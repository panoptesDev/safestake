import { useLocalStorageState } from "./../utils/utils";
import {
  Cluster,
  clusterApiUrl,
  Connection,
  Signer,
  Transaction,
  TransactionInstruction,
} from "@panoptis/web3.js";
import React, { useContext, useMemo } from "react";
import { WalletAdapter } from "../wallet-adapters/walletAdapter";

export type ExtendedCluster = Cluster | "localnet";

interface Endpoint {
    name: ExtendedCluster,
    url: string,
};

export const ENDPOINTS: Endpoint[] = [
  {
    name: "mainnet-beta",
    url: clusterApiUrl("mainnet-beta"),
  },
  {
    name: "testnet",
    url: clusterApiUrl("testnet"),
  },
  {
    name: "devnet",
    url: clusterApiUrl("devnet"),
  },
  {
    name: "localnet",
    url: "http://127.0.0.1:8328",
  },
];

const DEFAULT = ENDPOINTS[0].url;

interface ConnectionConfig {
  cluster: ExtendedCluster;
  url: string;
  setUrl: (val: string) => void;
  connection: Connection;
  sendConnection: Connection;
}

const ConnectionContext = React.createContext<ConnectionConfig>({
  cluster: ENDPOINTS[0].name,
  url: DEFAULT,
  setUrl: () => {},
  connection: new Connection(DEFAULT, "confirmed"),
  sendConnection: new Connection(DEFAULT, "confirmed"),
});

export function ConnectionProvider({ children = undefined as any }) {
  const [url, setUrl] = useLocalStorageState(
    "connectionUrls",
    ENDPOINTS[0].url
  );

  const connection = useMemo(() => new Connection(url, "confirmed"), [
    url,
  ]);
  const sendConnection = useMemo(() => new Connection(url, "confirmed"), [
    url,
  ]);

  const endpoint =
    ENDPOINTS.find((end) => end.url === url) || ENDPOINTS[0];

  return (
    <ConnectionContext.Provider
      value={{
        cluster: endpoint.name,
        url,
        setUrl,
        connection,
        sendConnection,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection() {
  return useContext(ConnectionContext).connection;
}

export function useSendConnection() {
  return useContext(ConnectionContext).sendConnection;
}

export function useConnectionConfig() {
  const context = useContext(ConnectionContext);
  return {
    cluster: context.cluster,
    url: context.url,
    setUrl: context.setUrl,
  };
}

export async function sendTransaction(
  connection: Connection,
  wallet: WalletAdapter,
  instructions: TransactionInstruction[],
  signers: Signer[],
) {
  if (!wallet?.publicKey) {
    throw new Error("Wallet is not connected");
  }

  let transaction = new Transaction({feePayer: wallet.publicKey});
  transaction.add(...instructions);
  transaction.recentBlockhash = (
    await connection.getRecentBlockhash("finalized")
  ).blockhash;
  if(signers.length > 0) {
    transaction.partialSign(...signers);
  }
  transaction = await wallet.signTransaction(transaction);
  const rawTransaction = transaction.serialize();
  let options = {
    skipPreflight: true,
    commitment: "processed",
  };

  const txid = await connection.sendRawTransaction(rawTransaction, options);
  return txid;
};

export function useSafecoinExplorerUrlSuffix() {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error('Missing connection context');
  }
  const endpoint = context.url;
  if (endpoint === clusterApiUrl('devnet')) {
    return '?cluster=devnet';
  } else if (endpoint === clusterApiUrl('testnet')) {
    return '?cluster=testnet';
  }
  return '';
}
