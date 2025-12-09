const express = require("express");
const { exec } = require("child_process");
const fs = require("fs");

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
      outputFile: outputFile,
      logs: { stdout, stderr }
    });
  });
});

// ✅ ✅ ✅ Route CORRIGÉE pour fusionner plusieurs MP3 (TÉLÉCHARGEMENT + FUSION LOCALE)
app.post("/merge-mp3", async (req, res) => {
  const audioUrls = req.body.audioUrls;

  if (!Array.isArray(audioUrls) || audioUrls.length < 2) {
    return res.status(400).json({
      success: false,
      message: "audioUrls doit contenir au moins 2 URLs"
    });
  }

  try {
    const localFiles = [];

    // ✅ 1. Télécharger chaque MP3 dans /tmp
    for (let i = 0; i < audioUrls.length; i++) {
      const localPath = `/tmp/audio${i}.mp3`;

      await new Promise((resolve, reject) => {
        const cmd = `curl -L "${audioUrls[i]}" -o "${localPath}"`;
        exec(cmd, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      localFiles.push(localPath);
    }

    // ✅ 2. Créer le fichier liste pour FFmpeg
    const listFile = "/tmp/list.txt";
    const fileContent = localFiles.map(f => `file '${f}'`).join("\n");
    fs.writeFileSync(listFile, fileContent);

    // ✅ 3. Fusion finale
    const outputFile = "/tmp/merged.mp3";
    const ffmpegCmd = `ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${outputFile}"`;

    exec(ffmpegCmd, (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({
          success: false,
          error: error.message,
          stderr
        });
      }

      res.json({
        success: true,
        message: "Fusion MP3 terminée avec succès",
        outputFile: outputFile,
        logs: { stdout, stderr }
      });
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("✅ FFmpeg API running on port " + PORT);
});
