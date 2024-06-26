import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import cliProgress from 'cli-progress';

/**
 * Combines images from a folder with an audio file to create a video.
 * @param {string} audioFilePath - The path to the audio file.
 * @param {string} imagesFolderPath - The path to the folder containing images.
 * @param {string} outputFilePath - The path to the output video file.
 */
export async function createVideoWithAudio(audioFilePath, imagesFolderPath, outputFilePath) {
    try {
        // Get list of images sorted by creation time
        const imageFiles = fs.readdirSync(imagesFolderPath)
            .filter(file => /\.(jpg|jpeg|png)$/i.test(file))
            .map(file => ({
                file,
                time: fs.statSync(path.join(imagesFolderPath, file)).ctime
            }))
            .sort((a, b) => a.time - b.time)
            .map(fileInfo => path.join(imagesFolderPath, fileInfo.file));

        if (imageFiles.length === 0) {
            throw new Error('No images found in the specified folder.');
        }

        // Get duration of the audio file
        const getAudioDuration = (filePath) => {
            return new Promise((resolve, reject) => {
                exec(`ffprobe -i "${filePath}" -show_entries format=duration -v quiet -of csv="p=0"`, (error, stdout, stderr) => {
                    if (error) {
                        reject(`Error getting audio duration: ${stderr}`);
                    } else {
                        resolve(parseFloat(stdout));
                    }
                });
            });
        };

        const audioDuration = await getAudioDuration(audioFilePath);
        const imageDuration = audioDuration / imageFiles.length;

        // console.log(`Audio duration: ${audioDuration} seconds`);
        // console.log(`Image duration: ${imageDuration} seconds and ${imageFiles.length} images totalling ${imageDuration * imageFiles.length} seconds`);

        // Create a temporary file list for ffmpeg
        const tempFileList = path.join(imagesFolderPath, 'tempFileList.txt');
        let fileListContent = imageFiles.map(image => `file '${path.resolve(image)}'\nduration ${imageDuration}`).join('\n');

        fs.writeFileSync(tempFileList, fileListContent);

        // console log the file list
        // console.log(fileListContent);

        // Append the last image to ensure the video lasts as long as the audio
        //fs.appendFileSync(tempFileList, `\nfile '${path.resolve(imageFiles[imageFiles.length - 1])}'`);

        // Create a progress bar
        const progressBar = new cliProgress.SingleBar({
            format: 'Creating Video [{bar}] {percentage}% | ETA: {eta}s',
            hideCursor: true
        }, cliProgress.Presets.shades_classic);

        // Start the progress bar
        progressBar.start(100, 0);

        // Run ffmpeg to create the video
        const ffmpegCommand = `ffmpeg -y -f concat -safe 0 -i "${tempFileList}" -i "${audioFilePath}" -c:v libx264 -c:a aac -strict experimental -b:a 192k -pix_fmt yuv420p -shortest "${outputFilePath}"`;
        const ffmpegProcess = exec(ffmpegCommand);

        ffmpegProcess.stderr.on('data', (data) => {
            // Update the progress bar based on the output from ffmpeg
            const progressMatch = data.toString().match(/time=\s*([0-9:.]+)/);
            if (progressMatch) {
                const timeString = progressMatch[1];
                const timeParts = timeString.split(':').map(parseFloat);
                const timeInSeconds = timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2];
                const percentage = (timeInSeconds / audioDuration) * 100;
                progressBar.update(Math.min(percentage, 100));
            }
        });

        ffmpegProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`Error creating video: ffmpeg process exited with code ${code}`);
            } else {
                console.log(`Video created successfully: ${outputFilePath}`);
            }
            // Stop the progress bar
            progressBar.stop();

            // Clean up temporary file
            fs.unlinkSync(tempFileList);
        });
    } catch (error) {
        console.error(`Error: ${error.message}`);
    }
}

const audioFilePath = 'audio/summary-end.mp3';
const imagesFolderPath = 'images/dispatches';
const outputFilePath = 'video/summary-end.mp4';

createVideoWithAudio(audioFilePath, imagesFolderPath, outputFilePath);
