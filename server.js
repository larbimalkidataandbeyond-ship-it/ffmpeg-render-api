const express = require("express");
const { exec } = require("child_process");

const app = express();
app.use(express.json());

// ✅ Route de test pour vérifier FFmpeg
app.get("/ffmpeg-version", (req, res) => {
  exec("ffmpeg -version", (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
        stderr
      });
    }

    res.json({
      success: true,
      stdout,
      stderr
    });
  });
});

// ✅ Route pour convertir une vidéo en MP3 à partir d'une URL
app.post("/mp4-to-mp3", (req, res) => {
  const inputUrl = req.body.inputUrl;
  const outputFile = "/tmp/output.mp3";

  if (!inputUrl) {
    return res.status(400).json({
      success: false,
      message: "inputUrl est obligatoire"
    });
  }

  const command = `ffmpeg -y -i "${inputUrl}" -vn -acodec libmp3lame "${outputFile}"`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
        stderr
      });
    }

    res.json({
      success: true,
      message: "Conversion MP3 terminée",
      logs: { stdout, stderr }
    });
  });
});

const PORT = process.env.PORT || 3000;
// ✅ Route pour fusionner plusieurs MP3 en un seul
app.post("/merge-mp3", (req, res) => {
  const audioUrls = req.body.audioUrls; // tableau d'URLs MP3
  const outputFile = "/tmp/merged.mp3";

  if (!Array.isArray(audioUrls) || audioUrls.length < 2) {
    return res.status(400).json({
      success: false,
      message: "audioUrls doit contenir au moins 2 URLs MP3"
    });
  }

  // Créer le fichier texte pour concat FFmpeg
  const fs = require("fs");
  const listFile = "/tmp/list.txt";

  const fileContent = audioUrls
    .map(url => `file '${url}'`)
    .join("\n");

  fs.writeFileSync(listFile, fileContent);

  const command = `ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${outputFile}"`;

  const { exec } = require("child_process");

  exec(command, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
        stderr
      });
    }

    res.json({
      success: true,
      message: "Fusion MP3 terminée",
      outputFile: outputFile,
      logs: { stdout, stderr }
    });
  });
});

app.listen(PORT, () => {
  console.log("✅ FFmpeg API running on port " + PORT);
});
