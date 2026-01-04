Savitr

A simple CLI tool for benchmarking disk read/write speeds. It writes a large test file to disk and reads it back, measuring throughput along the way.

[Screenshot.png](https://i.postimg.cc/ncq4JDZp/Screenshot-2025-12-17-at-4-16-14-PM.png)

Savitr runs two sequential tests:

    Write Test - Creates a 5GB file filled with random data and measures how fast your disk can write it
    Read Test - Reads that same file back and measures read speed

Both tests show real-time progress bars, elapsed time, and current speed in MB/s.

A simple CLI tool for benchmarking disk read/write speeds. It writes a large test file to disk and reads it back, measuring throughput along the way.

## What it does

Savitr runs two sequential tests:

- **Write Test** — creates a 5 GB file filled with random data and measures how fast your disk can write it.
- **Read Test** — reads that same file back and measures read speed.

Both tests show real-time progress bars, elapsed time, and current speed in MB/s.

## Usage

Run it directly with npx (no installation needed):

```bash
npx savitr
```

Once running:

- Press Enter to start the benchmark
- Press Esc to exit

The test file (`test_disk_speed.bin`) is created in the directory where you run the command.

## Requirements

- Node.js 18+
- About 5 GB of free disk space (for the test file)

## How it works

The tool writes data in 10 MB chunks using Node's streaming APIs. This streaming approach avoids allocating very large buffers in memory, allows reporting progress, and is suitable for testing large files.

Speed is calculated as bytes written (or read) divided by elapsed time; the app reports live metrics and final averages for each phase.

## Notes on accuracy

This is a straightforward, sequential test. It does not account for:

- OS-level caching (repeated reads may be faster due to cache)
- Random I/O patterns
- Queue depth or concurrent operations

For quick, casual benchmarking this gives a useful approximation. For more rigorous testing consider tools like `fio`.

## Tech

Built with Ink (React for CLIs).

## License

MIT
