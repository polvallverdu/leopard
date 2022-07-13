/*
  Copyright 2022 Picovoice Inc.

  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
  file accompanying this source.

  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

import { base64ToUint8Array, PvFile } from "@picovoice/web-utils";

import PvWorker from "web-worker:./leopard_worker_handler.ts";

import {
  LeopardConfig,
  LeopardInitConfig,
  LeopardWorkerInitResponse,
  LeopardWorkerProcessResponse,
  LeopardWorkerReleaseResponse
} from "./types";

export class LeopardWorker {
  private _worker: Worker;
  private readonly _version: string;
  private readonly _sampleRate: number;

  private static _wasm: string;
  private static _wasmSimd: string;

  private constructor(worker: Worker, version: string, sampleRate: number) {
    this._worker = worker;
    this._version = version;
    this._sampleRate = sampleRate;
  }

  /**
   * Get Leopard engine version.
   */
  get version(): string {
    return this._version;
  }

  /**
   * Get sample rate.
   */
  get sampleRate(): number {
    return this._sampleRate;
  }

  /**
   * Creates a worker instance of the Picovoice Leopard Speech-to-Text engine using a base64'd string
   * of the model file. The model size is large, hence it will try to use the
   * existing one if it exists, otherwise saves the model in storage.
   *
   * @param accessKey AccessKey generated by Picovoice Console.
   * @param modelBase64 The model in base64 string to initialize Leopard.
   * @param options Optional configuration arguments.
   * @param options.modelPath The path to save and use the model from. Use different names to use different models
   * across different Leopard instances.
   * @param options.forceWrite Flag to overwrite the model in storage even if it exists.
   * @param options.enableAutomaticPunctuation Flag to enable automatic punctuation insertion.
   *
   * @returns An instance of LeopardWorker.
   */
  public static async fromBase64(
    accessKey: string,
    modelBase64: string,
    options: LeopardConfig = {}
  ): Promise<LeopardWorker> {
    const {modelPath = "leopard_model", forceWrite = false, ...rest} = options;

    if (!(await PvFile.exists(modelPath)) || forceWrite) {
      const pvFile = await PvFile.open(modelPath, "w");
      await pvFile.write(base64ToUint8Array(modelBase64));
    }
    return this.create(accessKey, modelPath, rest);
  }

  /**
   * Creates a worker instance of the Picovoice Leopard Speech-to-Text engine using '.pv' file in
   * public directory. The model size is large, hence it will try to use the existing one if it exists,
   * otherwise saves the model in storage.
   *
   * @param accessKey AccessKey generated by Picovoice Console.
   * @param publicPath The relative path to the public directory the server is hosted.
   * @param options Optional configuration arguments.
   * @param options.modelPath The path to save and use the model from. Use different names to use different models
   * across different Leopard instances.
   * @param options.forceWrite Flag to overwrite the model in storage even if it exists.
   * @param options.enableAutomaticPunctuation Flag to enable automatic punctuation insertion.
   *
   * @returns An instance of LeopardWorker.
   */
  public static async fromPublicDirectory(
    accessKey: string,
    publicPath: string,
    options: LeopardConfig = {}
  ): Promise<LeopardWorker> {
    const {modelPath = "leopard_model", forceWrite = false, ...rest} = options;

    if (!(await PvFile.exists(modelPath)) || forceWrite) {
      const pvFile = await PvFile.open(modelPath, "w");
      const response = await fetch(publicPath);
      if (!response.ok) {
        throw new Error(`Failed to get model from '${publicPath}'`);
      }
      const data = await response.arrayBuffer();
      await pvFile.write(new Uint8Array(data));
    }
    return this.create(accessKey, modelPath, rest);
  }

  /**
   * Set base64 wasm file.
   * @param wasm Base64'd wasm file to use to initialize wasm.
   */
  public static setWasm(wasm: string): void {
    if (this._wasm === undefined) {
      this._wasm = wasm;
    }
  }

  /**
   * Set base64 wasm file with SIMD feature.
   * @param wasmSimd Base64'd wasm file to use to initialize wasm.
   */
  public static setWasmSimd(wasmSimd: string): void {
    if (this._wasmSimd === undefined) {
      this._wasmSimd = wasmSimd;
    }
  }

  /**
   * Creates a worker instance of the Picovoice Leopard Speech-to-Text engine.
   * Behind the scenes, it requires the WebAssembly code to load and initialize before
   * it can create an instance.
   *
   * @param accessKey AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)
   * @param modelPath Path to the model saved in indexedDB.
   * @param initConfig Flag to enable automatic punctuation insertion.
   *
   * @returns An instance of LeopardWorker.
   */
  private static async create(accessKey: string, modelPath: string, initConfig: LeopardInitConfig): Promise<LeopardWorker> {
    const worker = new PvWorker();
    const returnPromise: Promise<LeopardWorker> = new Promise((resolve, reject) => {
      // @ts-ignore - block from GC
      this.worker = worker;
      worker.onmessage = (event: MessageEvent<LeopardWorkerInitResponse>): void => {
        switch (event.data.command) {
          case "ok":
            resolve(new LeopardWorker(worker, event.data.version, event.data.sampleRate));
            break;
          case "failed":
          case "error":
            reject(event.data.message);
            break;
          default:
            // @ts-ignore
            reject(`Unrecognized command: ${event.data.command}`);
        }
      };
    });

    worker.postMessage({
      command: "init",
      accessKey: accessKey,
      modelPath: modelPath,
      initConfig: initConfig,
      wasm: this._wasm,
      wasmSimd: this._wasmSimd,
    });

    return returnPromise;
  }

  /**
   * Processes audio in a worker. The required sample rate can be retrieved from '.sampleRate'.
   * The audio needs to be 16-bit linearly-encoded. Furthermore, the engine operates on single-channel audio.
   *
   * @param pcm Frame of audio with properties described above.
   * @param options Optional process arguments.
   * @param options.transfer Flag to indicate if the buffer should be transferred or not. If set to true,
   * input buffer array will be transferred to the worker.
   * @param options.transferCB Optional callback containing a new Int16Array with contents from 'pcm'. Use this callback
   * to get the input pcm when using transfer.
   * @return The transcription.
   */
  public process(
    pcm: Int16Array,
    options : { transfer?: boolean, transferCB?: (data: Int16Array) => void } = {}
  ): Promise<string> {
    const { transfer = false, transferCB } = options;

    const returnPromise: Promise<string> = new Promise((resolve, reject) => {
      this._worker.onmessage = (event: MessageEvent<LeopardWorkerProcessResponse>): void => {
        if (transfer && transferCB && event.data.inputFrame) {
          transferCB(new Int16Array(event.data.inputFrame.buffer));
        }
        switch (event.data.command) {
          case "ok":
            resolve(event.data.transcription);
            break;
          case "failed":
          case "error":
            reject(event.data.message);
            break;
          default:
            // @ts-ignore
            reject(`Unrecognized command: ${event.data.command}`);
        }
      };
    });

    const transferable = (transfer) ? [pcm.buffer] : [];

    this._worker.postMessage({
      command: "process",
      inputFrame: pcm,
      transfer: transfer
    }, transferable);

    return returnPromise;
  }

  /**
   * Releases resources acquired by WebAssembly module.
   */
  public release(): Promise<void> {
    const returnPromise: Promise<void> = new Promise((resolve, reject) => {
      this._worker.onmessage = (event: MessageEvent<LeopardWorkerReleaseResponse>): void => {
        switch (event.data.command) {
          case "ok":
            resolve();
            break;
          case "failed":
          case "error":
            reject(event.data.message);
            break;
          default:
            // @ts-ignore
            reject(`Unrecognized command: ${event.data.command}`);
        }
      };
    });

    this._worker.postMessage({
      command: "release"
    });

    return returnPromise;
  }

  /**
   * Terminates the active worker. Stops all requests being handled by worker.
   */
  public terminate(): void {
    this._worker.terminate();
  }
}
