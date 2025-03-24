// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";



const MultisigModule = buildModule("MultisigModule", (m) => {
  const address = m.getParameter("_address", ["0x9997eD8442f70DC8365d8bEbB2C72644B7c9aDc4", "0x391b638EB7d21B122Be2Ed69eb81DA7E0F168177"]);
  const number = m.getParameter("_number", 1);

  const multisig = m.contract("Multisig", [address, number]);

  return { multisig };
});

export default MultisigModule;
