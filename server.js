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
app.listen(PORT, () => {
  console.log("✅ FFmpeg API running on port " + PORT);
});
