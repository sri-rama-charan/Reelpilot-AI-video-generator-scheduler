import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";
dotenv.config({ path: ".env.local" });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function check() {
  const { data, error } = await supabaseAdmin
    .from("videos")
    .select(
      "id, title, script, status, created_at, audio_urls, captions_scenes, images, tts_provider",
    )
    .order("created_at", { ascending: false })
    .limit(1);

  let out = "";
  if (error) out += "Error: " + error.message;
  else if (data && data.length > 0) {
    const v = data[0];
    out += `Last Video ID: ${v.id}\n`;
    out += `Created At: ${v.created_at}\n`;
    out += `Status: ${v.status}\n`;
    out += `Script Length: ${v.script?.length} chars, ~${v.script?.split(" ").length} words\n`;
    out += `Scenes: ${v.audio_urls?.length}\n`;

    let totalAudioSecs = 0;
    if (v.captions_scenes) {
      for (const scene of v.captions_scenes) {
        const lastEnd = scene.words?.length
          ? Math.max(...scene.words.map((w) => w.end))
          : 0;
        out += `Scene ${scene.order} audio length: ${lastEnd.toFixed(2)}s\n`;
        totalAudioSecs += lastEnd;
      }
    }
    out += `Total Audio Duration (raw sum): ${totalAudioSecs.toFixed(2)} seconds\n`;
    out += `Script text:\n${v.script}\n`;
  } else {
    out += "No videos found";
  }
  fs.writeFileSync("out.txt", out, "utf8");
}
check();
