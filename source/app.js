import React, { useEffect, useState } from 'react';
import { Box, Text, useApp, useInput, useStdout } from 'ink';
import ProgressBar from './components/ProgressBar.js';
import * as fs from 'fs';
import path from 'path'


const TEST_FILE_NAME = 'test_disk_speed.bin';
const TEST_FILE_PATH = process.cwd() + '/' + TEST_FILE_NAME;
const LATENCY_TEST_SAMPLES = 1000; // Number of random reads for latency test

// Test configurations
const TEST_CONFIGS = [
	{ chunkSize: 10 * 1024 * 1024, label: '10 MB', fileSize: 5 },
	{ chunkSize: 4 * 1024, label: '4 KB', fileSize: 5 }
];

function createRandomBuffer(size) {
	return Buffer.alloc(size, 0).fill(Math.random().toString(36));
}

export default function App() {

	const { exit } = useApp();
	const {stdout} = useStdout();

	const [currentTestIndex, setCurrentTestIndex] = useState(0);
	const [currentChunkSize, setCurrentChunkSize] = useState(TEST_CONFIGS[0].chunkSize);
	const [currentFileSize, setCurrentFileSize] = useState(TEST_CONFIGS[0].fileSize);
	const FILE_SIZE_BYTES = currentFileSize * 1024 * 1024 * 1024;
	const [writeProgress, setWriteProgress] = useState(0);
	const [readProgress, setReadProgress] = useState(0);
	const [latencyProgress, setLatencyProgress] = useState(0);
	const [currDir, setCurrDir] = useState("");
	const [writeDuration, setWriteDuration] = useState("");
	const [writeSpeed, setWriteSpeed] = useState("");
	const [readDuration, setReadDuration] = useState("");
	const [readSpeed, setReadSpeed] = useState("");
	const [latencyStats, setLatencyStats] = useState(null);
	const [status, setStatus] = useState("Ready");
	const [isRunning, setIsRunning] = useState(false);
	
	// Store results for all tests
	const [testResults, setTestResults] = useState([]);

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
	
	function formatBytes(bytes) {
		if (!Number.isFinite(bytes) || bytes === 0) return '0 B';
		const units = ['B', 'KB', 'MB', 'GB', 'TB'];
		const i = Math.floor(Math.log(bytes) / Math.log(1024));
		const value = bytes / Math.pow(1024, i);
		return `${value.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
	}

	function formatLatency(nanoseconds) {
		const microseconds = nanoseconds / 1000;
		const milliseconds = microseconds / 1000;
		
		if (milliseconds >= 1) {
			return `${milliseconds.toFixed(3)} ms`;
		} else if (microseconds >= 1) {
			return `${microseconds.toFixed(2)} μs`;
		} else {
			return `${nanoseconds.toFixed(0)} ns`;
		}
	}

	function writeTest(chunkSize) {
		setStatus("Write Test: Running...");
		setWriteProgress(0);
		setWriteDuration("");
		setWriteSpeed("");
		setIsRunning(true);

		const startTime = Date.now();
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
				const chunkSizeToWrite = Math.min(chunkSize, remainingBytes);
				const buffer = createRandomBuffer(chunkSizeToWrite);
				
				bytesWritten += chunkSizeToWrite;
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
					setImmediate(writeChunk);
				}
			};

			writeStream.on('finish', () => {
				const endTime = Date.now();
				const durationMs = endTime - startTime;
				saveResults(durationMs, setWriteDuration, setWriteSpeed);
				setStatus("Write Test: Completed");
				resolve({ durationMs, speed: FILE_SIZE_BYTES / (durationMs / 1000) / (1024 * 1024) });
			});

			writeChunk();
		});
	}

	function readTest(chunkSize) {
		setStatus("Read Test: Running...");
		setReadProgress(0);
		setReadDuration("");
		setReadSpeed("");

		const startTime = Date.now();
		
		let bytesRead = 0;

		return new Promise((resolve, reject) => {
			const readStream = fs.createReadStream(TEST_FILE_PATH, { highWaterMark: chunkSize });

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
				resolve({ durationMs, speed: bytesRead / (durationMs / 1000) / (1024 * 1024) });
			});
		});
	}

	function latencyTest() {
		setStatus("Latency Test: Running...");
		setLatencyProgress(0);
		setLatencyStats(null);

		return new Promise((resolve, reject) => {
			fs.stat(TEST_FILE_PATH, (err, stats) => {
				if (err) {
					setStatus(`Error: ${err.message}`);
					setIsRunning(false);
					reject(err);
					return;
				}

				const fileSize = stats.size;
				const chunkSize = 4 * 1024; // 4KB reads for latency test
				const buffer = Buffer.allocUnsafe(chunkSize);
				const latencies = [];
				
				let completedReads = 0;

				const performRead = (index) => {
					if (index >= LATENCY_TEST_SAMPLES) {
						// Calculate statistics
						latencies.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
						const sum = latencies.reduce((acc, val) => acc + val, 0n);
						const avg = Number(sum) / latencies.length;
						const min = Number(latencies[0]);
						const max = Number(latencies[latencies.length - 1]);
						const p50 = Number(latencies[Math.floor(latencies.length * 0.5)]);
						const p95 = Number(latencies[Math.floor(latencies.length * 0.95)]);
						const p99 = Number(latencies[Math.floor(latencies.length * 0.99)]);

						const stats = {
							avg,
							min,
							max,
							p50,
							p95,
							p99,
							samples: LATENCY_TEST_SAMPLES
						};

						setLatencyStats(stats);
						setStatus("Latency Test: Completed");
						resolve(stats);
						return;
					}

					// Random position in file
					const maxPosition = fileSize - chunkSize;
					const position = Math.floor(Math.random() * maxPosition);

					fs.open(TEST_FILE_PATH, 'r', (err, fd) => {
						if (err) {
							reject(err);
							return;
						}

						const startTime = process.hrtime.bigint();

						fs.read(fd, buffer, 0, chunkSize, position, (err, bytesRead) => {
							const endTime = process.hrtime.bigint();
							const latency = endTime - startTime;

							fs.close(fd, () => {});

							if (err) {
								reject(err);
								return;
							}

							latencies.push(latency);
							completedReads++;
							setLatencyProgress(completedReads / LATENCY_TEST_SAMPLES);

							// Update stats in real-time (every 100 samples)
							if (completedReads % 100 === 0) {
								const tempLatencies = [...latencies].sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
								const tempSum = tempLatencies.reduce((acc, val) => acc + val, 0n);
								const tempAvg = Number(tempSum) / tempLatencies.length;
								
								setLatencyStats({
									avg: tempAvg,
									min: Number(tempLatencies[0]),
									max: Number(tempLatencies[tempLatencies.length - 1]),
									p50: Number(tempLatencies[Math.floor(tempLatencies.length * 0.5)]),
									p95: Number(tempLatencies[Math.floor(tempLatencies.length * 0.95)]),
									p99: Number(tempLatencies[Math.floor(tempLatencies.length * 0.99)]),
									samples: completedReads
								});
							}

							// Use setImmediate to avoid blocking
							setImmediate(() => performRead(index + 1));
						});
					});
				};

				performRead(0);
			});
		});
	}

	async function runAllTests() {
		const results = [];
		
		for (let i = 0; i < TEST_CONFIGS.length; i++) {
			const config = TEST_CONFIGS[i];
			setCurrentTestIndex(i);
			setCurrentChunkSize(config.chunkSize);
			setCurrentFileSize(config.fileSize);
			setStatus(`Running test ${i + 1}/${TEST_CONFIGS.length} with chunk size: ${config.label}`);
			
			const writeResult = await writeTest(config.chunkSize);
			const readResult = await readTest(config.chunkSize);
			const latencyResult = await latencyTest();
			
			results.push({
				chunkSize: config.label,
				write: writeResult,
				read: readResult,
				latency: latencyResult
			});
		}
		
		setTestResults(results);
		
		// Cleanup test file
		fs.unlink(TEST_FILE_PATH, (err) => {
			if (err) {
				setStatus(`All tests completed! (cleanup failed: ${err.message})`);
			} else {
				setStatus("All tests completed!");
			}
		});
		
		setIsRunning(false);
	}

	useInput((input, key) => {
		if (key.escape) {
			exit();
		}

		if (key.return && !isRunning) {
			runAllTests();
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
				<Text>File Size: {currentFileSize} GB</Text>
				<Text>Current Chunk Size: {formatBytes(currentChunkSize)}</Text>
				{isRunning && (
					<Text color="yellow">Test {currentTestIndex + 1}/{TEST_CONFIGS.length}</Text>
				)}
				
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

				<Box paddingBottom={1} flexDirection="column">
					<ProgressBar value={latencyProgress} width={40} colour='magenta' label='Latency:' />
					{latencyStats && (
						<Box flexDirection="column" paddingLeft={2}>
							<Text>  Samples: {latencyStats.samples}</Text>
							<Text>  Average: {formatLatency(latencyStats.avg)}</Text>
							<Text>  Min: {formatLatency(latencyStats.min)} | Max: {formatLatency(latencyStats.max)}</Text>
							<Text>  P50: {formatLatency(latencyStats.p50)} | P95: {formatLatency(latencyStats.p95)} | P99: {formatLatency(latencyStats.p99)}</Text>
						</Box>
					)}
				</Box>

				<Text>{status}</Text>
				
				{testResults.length > 0 && (
					<Box paddingTop={2} flexDirection="column">
						<Text bold color="cyan">Test Results Summary:</Text>
						{testResults.map((result, index) => (
							<Box key={index} flexDirection="column" paddingTop={1}>
								<Text bold>Chunk Size: {result.chunkSize}</Text>
								<Text>  Write: {formatDuration(result.write.durationMs)} - {result.write.speed.toFixed(2)} MB/s</Text>
								<Text>  Read:  {formatDuration(result.read.durationMs)} - {result.read.speed.toFixed(2)} MB/s</Text>
								<Text>  Latency (4KB Random Reads):</Text>
								<Text>    Avg: {formatLatency(result.latency.avg)} | Min: {formatLatency(result.latency.min)} | Max: {formatLatency(result.latency.max)}</Text>
								<Text>    P50: {formatLatency(result.latency.p50)} | P95: {formatLatency(result.latency.p95)} | P99: {formatLatency(result.latency.p99)}</Text>
							</Box>
						))}
					</Box>
				)}
				
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