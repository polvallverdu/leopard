import { Leopard } from "./leopard";
import { LeopardWorker } from "./leopard_worker";

import {
  LeopardInputConfig,
  LeopardWorkerInitRequest,
  LeopardWorkerProcessRequest,
  LeopardWorkerReleaseRequest,
  LeopardWorkerRequest,
  LeopardWorkerInitResponse,
  LeopardWorkerProcessResponse,
  LeopardWorkerReleaseResponse,
  LeopardWorkerFailureResponse,
  LeopardWorkerResponse
} from "./types";

import leopardWasm from "../lib/pv_leopard.wasm";

Leopard.setWasm(leopardWasm);
LeopardWorker.setWasm(leopardWasm);

export {
  Leopard,
  LeopardInputConfig,
  LeopardWorker,
  LeopardWorkerInitRequest,
  LeopardWorkerProcessRequest,
  LeopardWorkerReleaseRequest,
  LeopardWorkerRequest,
  LeopardWorkerInitResponse,
  LeopardWorkerProcessResponse,
  LeopardWorkerReleaseResponse,
  LeopardWorkerFailureResponse,
  LeopardWorkerResponse
};
