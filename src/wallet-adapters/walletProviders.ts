import { LedgerWalletAdapter } from "./ledger";
import { PhantomWalletAdapter } from "./phantom";

const ASSETS_URL = "https://raw.githubusercontent.com/Fair-Exchange/safecoinwiki/master/Logos/SafeCoin/";

export const WALLET_PROVIDERS = [
  {
    name: "Safe Webwallet",
    url: "https://wallet.safecoin.org",
    icon: `${ASSETS_URL}Safecoin_Logo_Full_Transparent.svg`,
  },
  {
    name: "Ledger",
    url: "https://www.ledger.com",
    icon: `${ASSETS_URL}ledger.svg`,
    adapter: LedgerWalletAdapter,
  },
];