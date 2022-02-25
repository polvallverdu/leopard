/*
    Copyright 2022 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/

package ai.picovoice.leopard;

import java.io.File;
import java.util.Arrays;
import java.util.HashMap;
import java.util.logging.Logger;
import java.util.Set;
import java.util.stream.*;

public class Leopard {

    private final long libraryHandle;

    public static final String LIBRARY_PATH;
    public static final String MODEL_PATH;
    public static final String[] VALID_EXTENSIONS;

    static {
        LIBRARY_PATH = Utils.getPackagedLibraryPath();
        MODEL_PATH = Utils.getPackagedModelPath();
        VALID_EXTENSIONS = Utils.getValidFileExtensions();
    }

    /**
     * Constructor.
     *
     * @param accessKey     AccessKey obtained from Picovoice Console.
     * @param libraryPath   Absolute path to the native Leopard library.
     * @param modelPath     Absolute path to the file containing model parameters.
     * @throws LeopardException if there is an error while initializing Leopard.
     */
    public Leopard(String accessKey, String libraryPath, String modelPath) throws LeopardException {
        try {
            System.load(libraryPath);
        } catch (Exception exception) {
            throw new LeopardException(exception);
        }
        libraryHandle = init(accessKey, modelPath);
    }

    /**
     * Releases resources acquired by Leopard.
     */
    public void delete() {
        delete(libraryHandle);
    }

    /**
     * Processes given audio data and returns its transcription.
     *
     * @param pcm A frame of audio samples. The incoming audio needs to have a sample rate
     *            equal to {@link #getSampleRate()} and be 16-bit linearly-encoded. Furthermore,
     *            Leopard operates on single channel audio only.
     * @return Inferred transcription.
     * @throws LeopardException if there is an error while processing the audio frame.
     */
    public String process(short[] pcm) throws LeopardException {
        return process(libraryHandle, pcm, pcm.length);
    }

    /**
     * Processes given audio file and returns its transcription.
     *
     * @param path Absolute path to the audio file. The file needs to have a sample rate equal to or greater
                   than `.sample_rate`. The supported formats are: `FLAC`, `MP3`, `Ogg`, `Opus`, `Vorbis`, `WAV`, and `WebM`.
     * @return Inferred transcription.
     * @throws LeopardException if there is an error while processing the audio frame.
     */
    public String processFile(String path) throws LeopardException {
        try {
            return processFile(libraryHandle, path);
        } catch (LeopardInvalidArgumentException e) {
            if (path.contains(".")) {
                String extension = path.substring(path.lastIndexOf(".") + 1);
                if (!Arrays.asList(VALID_EXTENSIONS).contains(extension)) {
                    throw new LeopardInvalidArgumentException(String.format("Specified file with extension '%s' is not supported", extension));
                }
            }
            throw e;
        }
    }

    /**
     * Getter for required audio sample rate for PCM data.
     *
     * @return Required audio sample rate for PCM data.
     */
    public native int getSampleRate();

    /**
     * Getter for Leopard version.
     *
     * @return Leopard version.
     */
    public native String getVersion();

    private native long init(String accessKey, String modelPath) throws LeopardException;

    private native void delete(long object);

    private native String process(long object, short[] pcm, int numSamples) throws LeopardException;

    private native String processFile(long object, String path) throws LeopardException;

    public static class Builder {
        private String accessKey = null;
        private String libraryPath = null;
        private String modelPath = null;

        public Builder setAccessKey(String accessKey) {
            this.accessKey = accessKey;
            return this;
        }

        public Builder setLibraryPath(String libraryPath) {
            this.libraryPath = libraryPath;
            return this;
        }

        public Builder setModelPath(String modelPath) {
            this.modelPath = modelPath;
            return this;
        }

        public Leopard build() throws LeopardException {

            if (!Utils.isEnvironmentSupported()) {
                throw new LeopardRuntimeException("Could not initialize Leopard. " +
                        "Execution environment not currently supported by Leopard Java.");
            }

            if (accessKey == null) {
                throw new LeopardInvalidArgumentException("AccessKey must not be null");
            }

            if (libraryPath == null) {
                if (Utils.isResourcesAvailable()) {
                    libraryPath = LIBRARY_PATH;
                } else {
                    throw new LeopardInvalidArgumentException("Default library unavailable. Please " +
                            "provide a native Leopard library path (-l <library_path>).");
                }
                if (!new File(libraryPath).exists()) {
                    throw new LeopardIOException(String.format("Couldn't find library file at " +
                            "'%s'", libraryPath));
                }
            }

            if (modelPath == null) {
                if (Utils.isResourcesAvailable()) {
                    modelPath = MODEL_PATH;
                } else {
                    throw new LeopardInvalidArgumentException("Default model unavailable. Please provide a " +
                            "valid Leopard model path (-m <model_path>).");
                }
                if (!new File(modelPath).exists()) {
                    throw new LeopardIOException(String.format("Couldn't find model file at " +
                            "'%s'", modelPath));
                }
            }

            return new Leopard(accessKey, libraryPath, modelPath);
        }
    }
}
