/**
 * Expo config plugin — injects PrivacyInfo.xcprivacy into the iOS target.
 *
 * Apple requires a Privacy Manifest in all iOS apps submitted to the App Store
 * (Xcode 15+, iOS 17.4+). This plugin copies the manifest from
 * `plugins/PrivacyInfo.xcprivacy` into the native iOS target directory and
 * registers it in the Xcode project during `expo prebuild`.
 *
 * Usage: referenced from app.json `plugins` array (see app.json).
 */

const {
  withXcodeProject,
  withDangerousMod,
} = require("@expo/config-plugins");
const fs   = require("fs");
const path = require("path");

const MANIFEST_SOURCE = path.join(__dirname, "PrivacyInfo.xcprivacy");

/** @type {import('@expo/config-plugins').ConfigPlugin} */
module.exports = function withPrivacyManifest(config) {
  // Step 1: copy the file into the native ios/<AppName>/ directory
  config = withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const targetDir = path.join(
        cfg.modRequest.platformProjectRoot,
        cfg.modRequest.projectName
      );
      const dest = path.join(targetDir, "PrivacyInfo.xcprivacy");
      fs.copyFileSync(MANIFEST_SOURCE, dest);
      return cfg;
    },
  ]);

  // Step 2: add the file to the Xcode project so it's bundled in the app target
  config = withXcodeProject(config, (cfg) => {
    const xcodeProject = cfg.modResults;
    const appName      = cfg.modRequest.projectName;

    // Avoid duplicate entries on re-prebuild
    const existingFile = xcodeProject.pbxFileReferenceSection()
      ? Object.values(xcodeProject.pbxFileReferenceSection()).find(
          (ref) => typeof ref === "object" && ref.path === '"PrivacyInfo.xcprivacy"'
        )
      : null;

    if (!existingFile) {
      xcodeProject.addResourceFile(
        `${appName}/PrivacyInfo.xcprivacy`,
        { target: xcodeProject.getFirstTarget().uuid }
      );
    }

    return cfg;
  });

  return config;
};
