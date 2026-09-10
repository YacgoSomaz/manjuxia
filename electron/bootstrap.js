"use strict";

// The commercial entrypoint is generated during packaging with string
// encryption and control-flow obfuscation. The source entrypoint is omitted
// from releases; server-side entitlement checks remain authoritative.
// Development runs must load the editable entrypoint.  Packaging regenerates
// main.protected.js from this file, while production builds retain the
// protected entrypoint below.
// A direct electron.exe launch does not always set defaultApp on Windows.
// `app.isPackaged` is the authoritative distinction: source/dev runs must use
// the editable entrypoint, while installed releases keep the protected one.
const { app } = require("electron");
require(!app.isPackaged ? "./main.js" : "./main.protected.js");
