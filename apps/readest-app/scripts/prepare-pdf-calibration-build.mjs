// Apply the independent fork identity in the build checkout only.
import { readFileSync, writeFileSync } from 'node:fs';

const configPath = new URL('../src-tauri/tauri.conf.json', import.meta.url);
const config = JSON.parse(readFileSync(configPath, 'utf8'));
config.productName = 'Readest PDF Calibration';
config.mainBinaryName = 'readest-pdf-calibration';
config.identifier = 'io.github.dwdgg.readest.pdfcalibration';
config.version = '0.12.12-pdf.1';
config.bundle.createUpdaterArtifacts = false;
config.bundle.fileAssociations = [];
// The official thumbnail hooks share a COM class ID with the installed original.
delete config.bundle.windows.nsis.installerHooks;
config.plugins.updater.endpoints = [];
config.plugins['deep-link'].desktop.schemes = ['readest-pdf-calibration'];
writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
