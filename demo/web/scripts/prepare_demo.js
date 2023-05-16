const fs = require("fs");
const path = require("path");
const testData = require("../../../resources/test/test_data.json");

availableLanguages = testData["tests"]["parameters"].map((x) => x["language"]);

const language = process.argv.slice(2)[0];
if (language === "==") {
  console.error(`Choose the language you would like to run the demo in with "yarn start [language]". 
        Available languages are ${availableLanguages.join(", ")}`);
  process.exit(1);
}

if (!availableLanguages.includes(language)) {
  console.error(`'${language}' is not an available demo language. 
        Available languages are ${availableLanguages.join(", ")}`);
  process.exit(1);
}

const suffix = language === "en" ? "" : `_${language}`;
const rootDir = path.join(__dirname, "..", "..", "..");

let outputDirectory = path.join(__dirname, "..", "models");
if (fs.existsSync(outputDirectory)) {
  fs.readdirSync(outputDirectory).forEach((f) => {
    fs.unlinkSync(path.join(outputDirectory, f));
  });
} else {
  fs.mkdirSync(outputDirectory, { recursive: true });
}

const modelDir = path.join(rootDir, "lib", "common");
const modelName = `leopard_params${suffix}.pv`;
fs.copyFileSync(
  path.join(modelDir, modelName),
  path.join(outputDirectory, modelName)
);

fs.writeFileSync(
  path.join(outputDirectory, "leopardModel.js"),
  `const leopardModel = {
  publicPath: "models/${modelName}",
  forceWrite: true,
};

(function () {
  if (typeof module !== "undefined" && typeof module.exports !== "undefined")
    module.exports = leopardModel;
})();`
);
