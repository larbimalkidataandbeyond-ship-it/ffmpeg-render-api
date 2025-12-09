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

// ✅ ✅ ✅ FUSION MP3 + URL DE TÉLÉCHARGEMENT
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

    // ✅ 1. Télécharger chaque MP3
    for (let i = 0; i < audioUrls.length; i++) {
      const localPath = `/tmp/audio${i}.mp3`;
      const cmd = `ffmpeg -y -i "${audioUrls[i]}" -acodec copy "${localPath}"`;

      await new Promise((resolve, reject) => {
        exec(cmd, (err) => err ? reject(err) : resolve());
      });

      localFiles.push(localPath);
    }

    // ✅ 2. Créer list.txt
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

      // ✅ 4. Générer une URL publique TEMPORAIRE
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

// ✅ ✅ ✅ Route de téléchargement (Make va l’utiliser)
app.get("/download/:id", (req, res) => {
  const filePath = `/tmp/public_${req.params.id}.mp3`;

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("Fichier expiré");
  }

  res.download(filePath, "merged.mp3");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("✅ FFmpeg API running on port " + PORT));
