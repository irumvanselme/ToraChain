import React from "react";
import { asset } from "@tora-chain/fe-common";

export const LogoSquare: React.FC = () => (
  <img src={asset("logo-square.svg")} className={"max-w-6"} alt="Logo square" />
);
