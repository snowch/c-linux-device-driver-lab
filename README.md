# C Linux Device Driver Lab

Copyright © 2026 Christopher Snow.

[Open the course](https://snowch.github.io/c-linux-device-driver-lab/). Kernel modules, character devices, userspace ABI, readiness, workqueues and platform binding. Know basic C and how to read a shell command. Start with descriptors and processes in the [systems lab](https://snowch.github.io/c-linux-systems-lab/) if those concepts are new.

Each lesson includes editable C source, a runnable experiment, a code change, a hint and a transfer question. **Run in Linux** compiles the source with GCC and executes it in a self-hosted Alpine Linux guest using WebAssembly. The browser saves source changes per lesson. Reset Linux starts a fresh guest and keeps the editor changes.

Choose **Download for offline use** before disconnecting. Save roughly 130 MB of free browser storage for this course. Open the same URL in the same browser profile after the page reports **Available offline**. The lesson files, editor, compiler, kernel and runtime are included. External documentation requires an internet connection. HTTPS or localhost and a browser with WebAssembly and service workers are required.

## Lessons

- [Load and unload a kernel module](https://snowch.github.io/c-linux-device-driver-lab/#lifecycle)
- [Move bytes through a character device](https://snowch.github.io/c-linux-device-driver-lab/#io)
- [Handle empty reads and full writes](https://snowch.github.io/c-linux-device-driver-lab/#nonblock)
- [Wake a reader when data arrives](https://snowch.github.io/c-linux-device-driver-lab/#blocking)
- [Define a userspace ioctl contract](https://snowch.github.io/c-linux-device-driver-lab/#control)
- [Notify poll from delayed work](https://snowch.github.io/c-linux-device-driver-lab/#events)
- [Map a read-only snapshot into userspace](https://snowch.github.io/c-linux-device-driver-lab/#map)
- [Bind a synthetic platform driver](https://snowch.github.io/c-linux-device-driver-lab/#platform)
- [Verify a complete character-device session](https://snowch.github.io/c-linux-device-driver-lab/#capstone)

## Develop

Use Node.js 22 or later. Run `npm run check` to build and validate the course. Run `npm run dev` to serve it at http://localhost:4173. GitHub Actions publishes `dist/` to Pages. Original source is in `examples/`, chapter content in `content/course.mjs`, and guest build notes in [runtime/README.md](runtime/README.md).

This course uses the chapter structure, typography and build conventions of [GPU Lab](https://github.com/snowch/gpu-lab).
