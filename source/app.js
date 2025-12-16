import React, { useEffect, useState } from 'react';
import { Box, Text, useApp, useInput, useStdout } from 'ink';
import ProgressBar from './components/ProgressBar.js';
import * as fs from 'fs';
import path from 'path'


const FILE_SIZE_GB = 5;
const FILE_SIZE_BYTES = FILE_SIZE_GB * 1024 * 1024 * 1024; 
const TEST_FILE_NAME = 'test_disk_speed.bin';
const TEST_FILE_PATH = process.cwd() + '/' + TEST_FILE_NAME;

function createRandomBuffer(size) {
	return Buffer.alloc(size, 0).fill(Math.random().toString(36));
}

export default function App() {

	const { exit } = useApp();
	const {stdout} = useStdout();


	const [writeProgress, setWriteProgress] = useState(0);
	const [readProgress, setReadProgress] = useState(0);
	const [currDir, setCurrDir] = useState("");
	const [writeDuration, setWriteDuration] = useState("");
	const [writeSpeed, setWriteSpeed] = useState("");
	const [readDuration, setReadDuration] = useState("");
	const [readSpeed, setReadSpeed] = useState("");
	const [status, setStatus] = useState("Ready");
	const [isRunning, setIsRunning] = useState(false);

	function saveResults(durationMs, setDurationFn, setSpeedFn) {
		const speedBytesPerSecond = FILE_SIZE_BYTES / (durationMs / 1000);
		const speedMBps = speedBytesPerSecond / (1024 * 1024);

		setDurationFn(formatDuration(durationMs));
		setSpeedFn(`${speedMBps.toFixed(2)} MB/s`);
	}

	function formatDuration(durationMs) {
	    if (durationMs > 1000) {
	        return `${(durationMs / 1000).toFixed(2)} s`;
	    }
	    return `${durationMs.toFixed(0)} ms`;
	}

	function writeTest() {
		setStatus("Write Test: Running...");
		setWriteProgress(0);
		setWriteDuration("");
		setWriteSpeed("");
		setIsRunning(true);

		const startTime = Date.now();
		const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks
		let bytesWritten = 0;

		return new Promise((resolve, reject) => {
			const writeStream = fs.createWriteStream(TEST_FILE_PATH);

			writeStream.on('error', (err) => {
				setStatus(`Error: ${err.message}`);
				setIsRunning(false);
				reject(err);
			});

			const writeChunk = () => {
				if (bytesWritten >= FILE_SIZE_BYTES) {
					writeStream.end();
					return;
				}

				const remainingBytes = FILE_SIZE_BYTES - bytesWritten;
				const chunkSize = Math.min(CHUNK_SIZE, remainingBytes);
				const buffer = createRandomBuffer(chunkSize);
				
				bytesWritten += chunkSize;
				const currentTime = Date.now();
				const elapsedMs = currentTime - startTime;
				const speedBytesPerSecond = bytesWritten / (elapsedMs / 1000);
				const speedMBps = speedBytesPerSecond / (1024 * 1024);
				
				setWriteProgress(bytesWritten / FILE_SIZE_BYTES);
				setWriteDuration(formatDuration(elapsedMs));
				setWriteSpeed(`${speedMBps.toFixed(2)} MB/s`);
				
				if (!writeStream.write(buffer)) {
					writeStream.once('drain', writeChunk);
				} else {
					writeChunk();
				}
			};

			writeStream.on('finish', () => {
				const endTime = Date.now();
				const durationMs = endTime - startTime;
				saveResults(durationMs, setWriteDuration, setWriteSpeed);
				setStatus("Write Test: Completed");
				resolve(FILE_SIZE_BYTES);
			});

			writeChunk();
		});
	}

	function readTest() {
		setStatus("Read Test: Running...");
		setReadProgress(0);
		setReadDuration("");
		setReadSpeed("");

		const startTime = Date.now();
		const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks
		let bytesRead = 0;

		return new Promise((resolve, reject) => {
			const readStream = fs.createReadStream(TEST_FILE_PATH, { highWaterMark: CHUNK_SIZE });

			readStream.on('error', (err) => {
				setStatus(`Error: ${err.message}`);
				setIsRunning(false);
				reject(err);
			});

			readStream.on('data', (chunk) => {
				bytesRead += chunk.length;
				const currentTime = Date.now();
				const elapsedMs = currentTime - startTime;
				const speedBytesPerSecond = bytesRead / (elapsedMs / 1000);
				const speedMBps = speedBytesPerSecond / (1024 * 1024);
				
				setReadProgress(bytesRead / FILE_SIZE_BYTES);
				setReadDuration(formatDuration(elapsedMs));
				setReadSpeed(`${speedMBps.toFixed(2)} MB/s`);
			});

			readStream.on('end', () => {
				const endTime = Date.now();
				const durationMs = endTime - startTime;
				saveResults(durationMs, setReadDuration, setReadSpeed);
				setStatus("Read Test: Completed");
				setIsRunning(false);
				fs.unlink(TEST_FILE_PATH, (err) => {
					if (err) {
						setStatus(`Read Test: Completed (cleanup failed: ${err.message})`);
					} else {
						setStatus("Read Test: Completed");
					}
				});
				resolve(bytesRead);
			});
		});
	}

	useInput((input, key) => {
		if (key.escape) {
			exit();
		}

		if (key.return && !isRunning) {
			writeTest().then(() => readTest());
		}
	});




	return (
		<Box flexDirection="column" padding={1}>
			<Text bold fontSize={32} color="cyan">
				Savitr
			</Text>
			<Text color="gray">a disk benchmarking tool</Text>

			<Box flexDirection='column' paddingTop={2}>
				<Text>Current dir: {process.cwd()}</Text>
				<Text>File Size: {FILE_SIZE_GB} GB</Text>
				
				<Box paddingTop={1} paddingBottom={1} flexDirection="column">
					<ProgressBar value={writeProgress} width={40} colour='cyan' label='Write:' />
					{writeDuration && <Text>  Duration: {writeDuration}</Text>}
					{writeSpeed && <Text>  Speed: {writeSpeed}</Text>}
				</Box>

				<Box paddingBottom={1} flexDirection="column">
					<ProgressBar value={readProgress} width={40} colour='green' label='Read:' />
					{readDuration && <Text>  Duration: {readDuration}</Text>}
					{readSpeed && <Text>  Speed: {readSpeed}</Text>}
				</Box>

				<Text>{status}</Text>
				
				<Box paddingTop={2}>
					{isRunning ? (
						<Text color="yellow">Testing in progress...</Text>
					) : (
						<Text color="gray">Press Enter to start the test, ESC to exit</Text>
					)}
				</Box>
			</Box>
		</Box>
	);
}
