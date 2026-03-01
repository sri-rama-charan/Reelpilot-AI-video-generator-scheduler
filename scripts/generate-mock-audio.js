/* eslint-disable */
const fs = require("fs");
const path = require("path");
const https = require("https");

// Reliable URLs for actual .way and .mp3 format files so browsers don't fail codec checks
const AUDIO_SOURCES = {
  male_wav:
    "https://codeskulptor-demos.commondatastorage.googleapis.com/descent/jump.wav",
  female_wav:
    "https://codeskulptor-demos.commondatastorage.googleapis.com/descent/gotitem.wav",
  male_mp3:
    "https://codeskulptor-demos.commondatastorage.googleapis.com/descent/jump.mp3",
  female_mp3:
    "https://codeskulptor-demos.commondatastorage.googleapis.com/descent/gotitem.mp3",
};

const ALL_VOICES = [
  // Deepgram
  { preview: "deepgram-aura-2-odysseus-en.wav", gender: "male" },
  { preview: "deepgram-aura-2-thalia-en.wav", gender: "female" },
  { preview: "deepgram-aura-2-amalthea-en.wav", gender: "female" },
  { preview: "deepgram-aura-2-andromeda-en.wav", gender: "female" },
  { preview: "deepgram-aura-2-apollo-en.wav", gender: "male" },

  // Fonadalab
  { preview: "fonadalab-vanee.mp3", gender: "female" },
  { preview: "fonadalab-chitraa.mp3", gender: "female" },
  { preview: "fonadalab-raaga.mp3", gender: "male" },
  { preview: "fonadalab-nirvani.mp3", gender: "female" },
];

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (response) => {
        // Handle redirects if any
        if (response.statusCode === 301 || response.statusCode === 302) {
          return downloadFile(response.headers.location, dest)
            .then(resolve)
            .catch(reject);
        }
        response.pipe(file);
        file.on("finish", () => {
          file.close(resolve);
        });
      })
      .on("error", (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
  });
}

async function main() {
  const publicDir = path.join(__dirname, "../public");
  const tempFiles = {};

  console.log("Downloading proper base audio files...");
  for (const [key, url] of Object.entries(AUDIO_SOURCES)) {
    const tempPath = path.join(publicDir, `temp_${key}`);
    await downloadFile(url, tempPath);
    tempFiles[key] = tempPath;
  }

  console.log("Generating voice previews...");
  for (const voice of ALL_VOICES) {
    const destPath = path.join(publicDir, voice.preview);
    const isWav = voice.preview.endsWith(".wav");
    const sourceKey = `${voice.gender}_${isWav ? "wav" : "mp3"}`;

    // Copy the correct codec file
    fs.copyFileSync(tempFiles[sourceKey], destPath);
    console.log(`Created: ${voice.preview} (Format: ${isWav ? "WAV" : "MP3"})`);
  }

  // Cleanup
  for (const tempPath of Object.values(tempFiles)) {
    try {
      fs.unlinkSync(tempPath);
    } catch (e) {}
  }

  console.log("Done! All preview files fixed and regenerated.");
}

main().catch(console.error);
