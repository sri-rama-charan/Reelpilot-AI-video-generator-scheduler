import { Config } from "@remotion/cli/config";

Config.setEntryPoint("./remotion/src/Root.tsx");
Config.setCodec("h264");
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
