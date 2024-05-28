import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

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

        // Create a temporary file list for ffmpeg
        const tempFileList = path.join(imagesFolderPath, 'tempFileList.txt');
        const fileListContent = imageFiles.map(image => `file '${image}'\nduration ${imageDuration}`).join('\n');
        fs.writeFileSync(tempFileList, fileListContent);

        // Append the last image to ensure the video lasts as long as the audio
        fs.appendFileSync(tempFileList, `\nfile '${imageFiles[imageFiles.length - 1]}'`);

        // Run ffmpeg to create the video
        const ffmpegCommand = `ffmpeg -f concat -safe 0 -i "${tempFileList}" -i "${audioFilePath}" -c:v libx264 -c:a aac -strict experimental -b:a 192k -pix_fmt yuv420p -shortest "${outputFilePath}"`;
        exec(ffmpegCommand, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error creating video: ${stderr}`);
            } else {
                console.log(`Video created successfully: ${outputFilePath}`);
            }
            // Clean up temporary file
            fs.unlinkSync(tempFileList);
        });
    } catch (error) {
        console.error(`Error: ${error.message}`);
    }
}


const audioFilePath = 'audio/summary-27-may.mp3';
const imagesFolderPath = 'images/dispatches';
const outputFilePath = 'video/summary-27-may.mp4';

createVideoWithAudio(audioFilePath, imagesFolderPath, outputFilePath);