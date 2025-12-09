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
// ✅ ✅ ✅ FUSION MP3 À PARTIR DE DATA BASE64 (SANS URL)
app.post("/merge-mp3-from-base64", async (req, res) => {
  const audioBase64Array = req.body.audioBase64Array;

  if (!Array.isArray(audioBase64Array) || audioBase64Array.length < 2) {
    return res.status(400).json({
      success: false,
      message: "audioBase64Array doit contenir au moins 2 fichiers audio en Base64"
    });
  }

  try {
    const localFiles = [];

    // ✅ 1. Reconstruire les fichiers MP3 depuis le Base64
    for (let i = 0; i < audioBase64Array.length; i++) {
      const localPath = `/tmp/audio_base64_${i}.mp3`;

      // Supprime le préfixe s’il existe: data:audio/mpeg;base64,
      const cleanBase64 = audioBase64Array[i].replace(/^data:audio\/\w+;base64,/, "");

      const buffer = Buffer.from(cleanBase64, "base64");
      fs.writeFileSync(localPath, buffer);

      localFiles.push(localPath);
    }

    // ✅ 2. Créer list.txt pour concat
    const listFile = "/tmp/list_base64.txt";
    const fileContent = localFiles.map(f => `file '${f}'`).join("\n");
    fs.writeFileSync(listFile, fileContent);

    // ✅ 3. Fusion finale
    const outputFile = "/tmp/merged_from_base64.mp3";
    const mergeCmd = `ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${outputFile}"`;

    exec(mergeCmd, (error) => {
      if (error) {
        return res.status(500).json({
          success: false,
          error: error.message
        });
      }

      // ✅ 4. Générer URL de téléchargement
      const fileId = Date.now();
      const publicPath = `/tmp/public_base64_${fileId}.mp3`;
      fs.copyFileSync(outputFile, publicPath);

      const downloadUrl = `${req.protocol}://${req.get("host")}/download-base64/${fileId}`;

      res.json({
        success: true,
        fileName: "merged_from_base64.mp3",
        downloadUrl: downloadUrl
      });
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ✅ ✅ ✅ Route de téléchargement pour le merge Base64
app.get("/download-base64/:id", (req, res) => {
  const filePath = `/tmp/public_base64_${req.params.id}.mp3`;

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("Fichier expiré");
  }

  res.download(filePath, "merged_from_base64.mp3");
});
// ✅ ✅ ✅ IMAGE + AUDIO → MP4
app.post("/image-audio-to-mp4", async (req, res) => {
  const { imageUrl, audioUrl } = req.body;

  if (!imageUrl || !audioUrl) {
    return res.status(400).json({
      success: false,
      message: "imageUrl et audioUrl sont obligatoires"
    });
  }

  try {
    const imagePath = "/tmp/image.jpg";
    const audioPath = "/tmp/audio.mp3";
    const outputPath = "/tmp/video.mp4";

    // ✅ Télécharger l’image
    await new Promise((resolve, reject) => {
      exec(`ffmpeg -y -i "${imageUrl}" "${imagePath}"`, err => err ? reject(err) : resolve());
    });

    // ✅ Télécharger l’audio
    await new Promise((resolve, reject) => {
      exec(`ffmpeg -y -i "${audioUrl}" -vn "${audioPath}"`, err => err ? reject(err) : resolve());
    });

    // ✅ Créer la vidéo MP4 (durée = durée audio)
    const mergeCmd = `
      ffmpeg -y 
      -loop 1 -i "${imagePath}" 
      -i "${audioPath}" 
      -c:v libx264 -c:a aac 
      -shortest 
      -pix_fmt yuv420p 
      "${outputPath}"
    `;

    exec(mergeCmd, err => {
      if (err) return res.status(500).json({ success: false, error: err.message });

      const fileId = Date.now();
      const publicPath = `/tmp/public_video_${fileId}.mp4`;
      fs.copyFileSync(outputPath, publicPath);

      const downloadUrl = `${req.protocol}://${req.get("host")}/download-video/${fileId}`;

      res.json({
        success: true,
        fileName: "video.mp4",
        downloadUrl
      });
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Téléchargement vidéo
app.get("/download-video/:id", (req, res) => {
  const filePath = `/tmp/public_video_${req.params.id}.mp4`;

  if (!fs.existsSync(filePath)) return res.status(404).send("Fichier expiré");

  res.download(filePath, "video.mp4");
});
// ✅ ✅ ✅ MERGE PLUSIEURS MP4 → 1 MP4
app.post("/merge-mp4", async (req, res) => {
  const videoUrls = req.body.videoUrls;

  if (!Array.isArray(videoUrls) || videoUrls.length < 2) {
    return res.status(400).json({
      success: false,
      message: "videoUrls doit contenir au moins 2 URLs MP4"
    });
  }

  try {
    const localFiles = [];

    // ✅ Télécharger chaque vidéo
    for (let i = 0; i < videoUrls.length; i++) {
      const localPath = `/tmp/video_${i}.mp4`;

      await new Promise((resolve, reject) => {
        exec(`ffmpeg -y -i "${videoUrls[i]}" -c copy "${localPath}"`, err =>
          err ? reject(err) : resolve()
        );
      });

      localFiles.push(localPath);
    }

    // ✅ Créer list.txt
    const listFile = "/tmp/list_videos.txt";
    const fileContent = localFiles.map(f => `file '${f}'`).join("\n");
    fs.writeFileSync(listFile, fileContent);

    // ✅ Fusion finale
    const outputFile = "/tmp/merged_videos.mp4";
    const mergeCmd = `ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${outputFile}"`;

    exec(mergeCmd, err => {
      if (err) return res.status(500).json({ success: false, error: err.message });

      const fileId = Date.now();
      const publicPath = `/tmp/public_merged_video_${fileId}.mp4`;
      fs.copyFileSync(outputFile, publicPath);

      const downloadUrl = `${req.protocol}://${req.get("host")}/download-merged-video/${fileId}`;

      res.json({
        success: true,
        fileName: "merged.mp4",
        downloadUrl
      });
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Téléchargement MP4 fusionnée
app.get("/download-merged-video/:id", (req, res) => {
  const filePath = `/tmp/public_merged_video_${req.params.id}.mp4`;

  if (!fs.existsSync(filePath)) return res.status(404).send("Fichier expiré");

  res.download(filePath, "merged.mp4");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("✅ FFmpeg API running on port " + PORT));

