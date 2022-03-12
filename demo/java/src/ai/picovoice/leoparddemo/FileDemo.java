/*
    Copyright 2022 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/

package ai.picovoice.leoparddemo;

import ai.picovoice.leopard.*;
import org.apache.commons.cli.*;

import javax.sound.sampled.AudioFormat;
import javax.sound.sampled.AudioInputStream;
import javax.sound.sampled.AudioSystem;
import javax.sound.sampled.UnsupportedAudioFileException;
import java.io.File;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.Map;

public class FileDemo {

    public static void runDemo(String accessKey, File inputAudioFile, String libraryPath, String modelPath) {
        Leopard leopard = null;
        try {
            leopard = new Leopard.Builder()
                    .setAccessKey(accessKey)
                    .setLibraryPath(libraryPath)
                    .setModelPath(modelPath)
                    .build();

            String transcription = leopard.processFile(inputAudioFile.getPath());
            System.out.println(transcription);
        } catch (Exception e) {
            System.out.println(e.toString());
        } finally {
            if (leopard != null) {
                leopard.delete();
            }
        }
    }

    public static void main(String[] args) {
        Options options = BuildCommandLineOptions();
        CommandLineParser parser = new DefaultParser();
        HelpFormatter formatter = new HelpFormatter();

        CommandLine cmd;
        try {
            cmd = parser.parse(options, args);
        } catch (ParseException e) {
            System.out.println(e.getMessage());
            formatter.printHelp("leopardfiledemo", options);
            System.exit(1);
            return;
        }

        if (cmd.hasOption("help")) {
            formatter.printHelp("leopardfiledemo", options);
            return;
        }

        String accessKey = cmd.getOptionValue("access_key");
        String inputAudioPath = cmd.getOptionValue("input_audio_path");
        String libraryPath = cmd.getOptionValue("library_path");
        String modelPath = cmd.getOptionValue("model_path");

        if (accessKey == null || accessKey.length() == 0) {
            throw new IllegalArgumentException("AccessKey is required for Leopard.");
        }

        if(inputAudioPath == null){
            throw new IllegalArgumentException("No input audio file provided. This is a required argument.");
        }
        File inputAudioFile = new File(inputAudioPath);
        if (!inputAudioFile.exists()) {
            throw new IllegalArgumentException(String.format("Audio file at path %s does not exits.", inputAudioPath));
        }

        if (libraryPath == null) {
            libraryPath = Leopard.LIBRARY_PATH;
        }

        if (modelPath == null) {
            modelPath = Leopard.MODEL_PATH;
        }

        runDemo(accessKey, inputAudioFile, libraryPath, modelPath);
    }

    private static Options BuildCommandLineOptions() {
        Options options = new Options();

        options.addOption(Option.builder("a")
                .longOpt("access_key")
                .hasArg(true)
                .desc("AccessKey obtained from Picovoice Console (https://console.picovoice.ai/).")
                .build());

        options.addOption(Option.builder("i")
                .longOpt("input_audio_path")
                .hasArg(true)
                .desc("Absolute path to input audio file.")
                .build());

        options.addOption(Option.builder("l")
                .longOpt("library_path")
                .hasArg(true)
                .desc("Absolute path to the Leopard native runtime library.")
                .build());

        options.addOption(Option.builder("m")
                .longOpt("model_path")
                .hasArg(true)
                .desc("Absolute path to the file containing model parameters.")
                .build());

        options.addOption(new Option("h", "help", false, ""));

        return options;
    }
}
