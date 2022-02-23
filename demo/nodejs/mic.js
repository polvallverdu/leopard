#! /usr/bin/env node
//
// Copyright 2022 Picovoice Inc.
//
// You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
// file accompanying this source.
//
// Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
// an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.
//
"use strict";

const { program } = require("commander");
const readline = require("readline");
const Leopard = require("@picovoice/leopard-node");
const PvRecorder = require("@picovoice/pvrecorder-node");

const { PvStatusActivationLimitReached } = require("@picovoice/leopard-node/errors");
const PV_RECORDER_FRAME_LENGTH = 2048;

program
  .option(
    "-a, --access_key <string>",
    "AccessKey obtain from the Picovoice Console (https://console.picovoice.ai/)"
  )
  .option(
    "-l, --library_file_path <string>",
    "absolute path to leopard dynamic library"
  )
  .option("-m, --model_file_path <string>", "absolute path to leopard model")
  .option(
    "-i, --audio_device_index <number>",
    "index of audio device to use to record audio",
    Number,
    -1
  )
  .option("-d, --show_audio_devices", "show the list of available devices");

if (process.argv.length < 1) {
  program.help();
}
program.parse(process.argv);

let isInterrupted = false;

async function micDemo() {
  let accessKey = program["access_key"];
  let libraryFilePath = program["library_file_path"];
  let modelFilePath = program["model_file_path"];
  let audioDeviceIndex = program["audio_device_index"];
  let showAudioDevices = program["show_audio_devices"];

  let showAudioDevicesDefined = showAudioDevices !== undefined;

  if (showAudioDevicesDefined) {
    const devices = PvRecorder.getAudioDevices();
    for (let i = 0; i < devices.length; i++) {
      console.log(`index: ${i}, device name: ${devices[i]}`);
    }
    process.exit();
  }

  if (accessKey === undefined) {
    console.log("No AccessKey provided");
    process.exit();
  }

  let engineInstance = new Leopard(accessKey, modelFilePath, libraryFilePath);

  const recorder = new PvRecorder(audioDeviceIndex, PV_RECORDER_FRAME_LENGTH);

  console.log(`Using device: ${recorder.getSelectedDevice()}`);

  console.log(">>> Press `CTRL+C` to exit: ");

  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);

  process.stdin.on("keypress", (key, str) => {

    if (str.sequence === '\r') {
      isInterrupted = true;
    } else if (str.sequence === '\x03') {
      recorder.release();
      engineInstance.release();
      process.exit();
    }
  });

  while (true) {
    console.log(">>> Recording ... Press `ENTER` to stop: ");
    let audioFrame = [];
    recorder.start();
    while (!isInterrupted) {
      const pcm = await recorder.read();
      audioFrame.push(...pcm);
    }
    console.log(">>> Processing ... ");
    recorder.stop();
    const audioFrameInt16 = new Int16Array(audioFrame);
    try {
      console.log(engineInstance.process(audioFrameInt16));
    } catch (err) {
      if (err instanceof PvStatusActivationLimitReached) {
        console.error(`AccessKey '${access_key}' has reached it's processing limit.`);
      } else {
        console.error(err);
      }
      recorder.release();
      engineInstance.release();
      process.exit();
    }
    isInterrupted = false;
  }

}

micDemo();
