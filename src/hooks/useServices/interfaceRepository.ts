import axios from "axios";
import memoize from "lodash/memoize";
import { LowercaseNetworks } from "@gnosis.pm/safe-apps-sdk";

import { Safe } from "../../providers/SafeProvider/safeConnector";
interface ContractMethod {
  inputs: any[];
  name: string;
  payable: boolean;
}

export interface ContractInterface {
  payableFallback: boolean;
  methods: ContractMethod[];
}

const getAbi = memoize(async (apiUrl: string) => axios.get(apiUrl));

const abiUrlGetterByNetwork: {
  [key in LowercaseNetworks]?: ((address: string) => string) | null;
} = {
  mainnet: (address: string) =>
    `https://api.etherscan.io/api?module=contract&action=getabi&address=${address}`,
  morden: null,
  rinkeby: (address: string) =>
    `https://api-rinkeby.etherscan.io/api?module=contract&action=getabi&address=${address}`,
  ropsten: null,
  goerli: null,
  kovan: null,
  xdai: (address: string) =>
    `https://blockscout.com/poa/xdai/api?module=contract&action=getabi&address=${address}`,
  energy_web_chain: (address: string) =>
    `https://explorer.energyweb.org/api?module=contract&action=getabi&address=${address}`,
  volta: (address: string) =>
    `https://volta-explorer.energyweb.org/api?module=contract&action=getabi&address=${address}`,
  unknown: null,
};

class InterfaceRepository {
  safe: Safe;
  web3: any;

  constructor(safe: Safe, web3: any) {
    this.safe = safe;
    this.web3 = web3;
  }

  private async _loadAbiFromBlockExplorer(address: string): Promise<string> {
    const getAbiUrl = abiUrlGetterByNetwork[this.safe.getSafeInfo().network];
    if (!getAbiUrl) {
      throw Error(`Network: ${this.safe.getSafeInfo().network} not supported.`);
    }

    const abi = await getAbi(getAbiUrl(address));
    if (abi.data.status !== "1")
      throw Error(
        `Request not successful: ${abi.data.message}; ${abi.data.result}.`
      );
    return abi.data.result;
  }

  private _isMethodPayable = (m: any) =>
    m.payable || m.stateMutability === "payable";

  async loadAbi(addressOrAbi: string): Promise<ContractInterface> {
    const abiString = this.web3.utils.isAddress(addressOrAbi)
      ? await this._loadAbiFromBlockExplorer(addressOrAbi)
      : addressOrAbi;

    const abi = JSON.parse(abiString);

    const methods = abi
      .filter((e: any) => {
        if (["pure", "view"].includes(e.stateMutability)) {
          return false;
        }

        if (e?.type.toLowerCase() === "event") {
          return false;
        }

        return !e.constant;
      })
      .map((m: any) => {
        return {
          inputs: m.inputs || [],
          name: m.name || (m.type === "fallback" ? "fallback" : "receive"),
          payable: this._isMethodPayable(m),
        };
      });

    const payableFallback =
      abi.findIndex(
        (e: any) => e.type === "fallback" && this._isMethodPayable(e)
      ) >= 0;

    return { payableFallback, methods };
  }
}

export type InterfaceRepo = InstanceType<typeof InterfaceRepository>;

export default InterfaceRepository;
