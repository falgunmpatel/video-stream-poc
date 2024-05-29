import express from 'express';
import cors from 'cors';
import multer from 'multer';
import {v4 as uuidv4} from 'uuid';
import path from 'path';
import { exec } from 'child_process';
import fs from 'fs';

const app = express();

//multer middleware
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './uploads');
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + uuidv4() + path.extname(file.originalname));
    }
});

//multer configuration
const upload = multer({storage});


app.use(cors(
    {
        origin: ['http://localhost:3000', 'http://localhost:5173'],
        credentials: true
    }
));

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*'); //warning: this is not safe
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    next();
})

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use("/uploads", express.static("uploads"));


app.get('/', (req, res) => {
    res.json({
        message: 'Hello World!'
    });
});

app.post('/upload', upload.single('file'), (req, res) => {
  const lessonId = uuidv4();
  const videoPath = req.file.path;
  const outputPath = `uploads/courses/${lessonId}`;
  const hlsPath = `${outputPath}/index.m3u8`;
  console.log("hlsPath ::", hlsPath);

  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  // command to convert video to HLS format using ffmpeg
  const ffmpegCommand = `ffmpeg -i ${videoPath} -codec:v libx264 -codec:a aac -hls_time 10 -hls_playlist_type vod -hls_segment_filename "${outputPath}/segment%03d.ts" -start_number 0 ${hlsPath}`;

    // execute the command
    // no queue for POC (proof of concept), but in production, we need to queue the requests
    // How to use queue and where to store converted video?
    

    exec(ffmpegCommand, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
        const videoUrl = `http://localhost:8000/${hlsPath}`;

        res.json({
            message: "Video converted to HLS successfully!!",
            lessonId: lessonId,
            videoUrl: videoUrl,
        });
    });


});

app.listen(8000, () => {
    console.log('Server started on http://localhost:8000');
})
