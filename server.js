const express = require("express");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

// ✅ Route de test FFmpeg
app.get("/ffmpeg-version", (req, res) => {
  exec("ffmpeg -version", (error, stdout, stderr) => {
    if (error) return res.status(500).json({ success: false, error: error.message });
    res.json({ success: true, stdout });
  });
});

// ✅ ✅ ✅ FUSION MP3 + TÉLÉCHARGEMENT ROBUSTE + URL DE TÉLÉCHARGEMENT
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

    // ✅ 1. Télécharger chaque MP3 avec protection réseau
    for (let i = 0; i < audioUrls.length; i++) {
      const localPath = `/tmp/audio${i}.mp3`;

      const safeDownloadCmd = `
        ffmpeg -y 
        -timeout 20000000 
        -reconnect 1 
        -reconnect_streamed 1 
        -reconnect_delay_max 2 
        -i "${audioUrls[i]}" 
        -vn 
        -acodec libmp3lame 
        "${localPath}"
      `;

      await new Promise((resolve, reject) => {
        exec(safeDownloadCmd, (err) => err ? reject(err) : resolve());
      });

      localFiles.push(localPath);
    }

    // ✅ 2. Créer le fichier list.txt (LOCAL UNIQUEMENT)
    const listFile = "/tmp/list.txt";
    const fileContent = localFiles.map(f => `file '${f}'`).join("\n");
    fs.writeFileSync(listFile, fileContent);

    // ✅ 3. Fusion finale
    const outputFile = "/tmp/merged.mp3";
    const mergeCmd = `ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${outputFile}"`;

    exec(mergeCmd, (error) => {
      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }

      // ✅ 4. Générer une URL temporaire publique
      const fileId = Date.now();
      const publicPath = `/tmp/public_${fileId}.mp3`;
      fs.copyFileSync(outputFile, publicPath);

      const downloadUrl = `${req.protocol}://${req.get("host")}/download/${fileId}`;

      res.json({
        success: true,
        fileName: "merged.mp3",
        downloadUrl: downloadUrl
      });
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ ✅ ✅ Route de téléchargement public
app.get("/download/:id", (req, res) => {
  const filePath = `/tmp/public_${req.params.id}.mp3`;

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("Fichier expiré");
  }

  res.download(filePath, "merged.mp3");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("✅ FFmpeg API running on port " + PORT));

