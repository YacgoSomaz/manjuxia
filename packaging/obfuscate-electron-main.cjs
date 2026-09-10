"use strict";

const fs = require("node:fs");
const path = require("node:path");
const JavaScriptObfuscator = require(path.join(__dirname, "..", "node_modules", "javascript-obfuscator"));
const root = path.resolve(__dirname, "..");
const input = fs.readFileSync(path.join(root, "electron", "main.js"), "utf8");
const output = JavaScriptObfuscator.obfuscate(input, {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.25,
  deadCodeInjection: false,
  identifierNamesGenerator: "hexadecimal",
  renameGlobals: false,
  selfDefending: false,
  stringArray: true,
  stringArrayEncoding: ["rc4"],
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayThreshold: 0.9,
  transformObjectKeys: true,
  unicodeEscapeSequence: false
}).getObfuscatedCode();
fs.writeFileSync(path.join(root, "electron", "main.protected.js"), output, "utf8");
console.log("ELECTRON_MAIN_PROTECTED_READY");
