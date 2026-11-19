# Introduction to Linux Device Drivers in C

Copyright © 2026 Christopher Snow.

[Open the course](https://snowch.github.io/c-linux-device-driver-lab/). Know basic C, Linux file descriptors and processes. Start with module APIs, then implement and test a character device and bind a synthetic platform driver.

Each lesson includes editable C source, a runnable experiment, a code change, a hint and a transfer question. **Run in Linux** compiles the source with GCC and executes it in a self-hosted Alpine Linux guest using WebAssembly. The browser saves source changes per lesson. Reset Linux starts a fresh guest and keeps the editor changes.

Choose **Download for offline use** before disconnecting. Save roughly 145 MB of free browser storage for this course. Open the same URL in the same browser profile after the page reports **Available offline**. The lesson files, editor, compiler, kernel and runtime are included. External documentation requires an internet connection. HTTPS or localhost and a browser with WebAssembly and service workers are required.

## Lessons

### Kernel module APIs

- [Load a standalone kernel module](https://snowch.github.io/c-linux-device-driver-lab/#module-api)
- [Pass a parameter when loading a module](https://snowch.github.io/c-linux-device-driver-lab/#parameters)
- [Observe a failed module initialisation](https://snowch.github.io/c-linux-device-driver-lab/#init-error)

### Character devices

- [Register and remove a character device](https://snowch.github.io/c-linux-device-driver-lab/#lifecycle)
- [Move bytes through a character device](https://snowch.github.io/c-linux-device-driver-lab/#io)
- [Handle empty reads and full writes](https://snowch.github.io/c-linux-device-driver-lab/#nonblock)
- [Retry a short character-device write](https://snowch.github.io/c-linux-device-driver-lab/#short-write)
- [Protect a module while a descriptor is open](https://snowch.github.io/c-linux-device-driver-lab/#references)

### Waits, control and mappings

- [Wake a reader when data arrives](https://snowch.github.io/c-linux-device-driver-lab/#blocking)
- [Interrupt a blocking device read with a signal](https://snowch.github.io/c-linux-device-driver-lab/#interrupt)
- [Define a userspace ioctl contract](https://snowch.github.io/c-linux-device-driver-lab/#control)
- [Notify poll from delayed work](https://snowch.github.io/c-linux-device-driver-lab/#events)
- [Map a read-only snapshot into userspace](https://snowch.github.io/c-linux-device-driver-lab/#map)

### Binding and verification

- [Bind a synthetic platform driver](https://snowch.github.io/c-linux-device-driver-lab/#platform)
- [Verify a complete character-device session](https://snowch.github.io/c-linux-device-driver-lab/#capstone)

## Scope

This introduction uses a real Linux kernel in a WebAssembly PC emulator. The exercises target loadable modules, character-device interfaces and a synthetic platform device. Hardware-facing driver work with bus enumeration, MMIO, hardware interrupts, DMA and power management belongs to a hardware-focused follow-on course.

## Develop

Use Node.js 22 or later. Run `npm run check` to build and validate the course. Run `npm run dev` to serve it at http://localhost:4173. GitHub Actions publishes `dist/` to Pages. Original source is in `examples/`, chapter content in `content/course.mjs`, and guest build notes in [runtime/README.md](runtime/README.md).

This course uses the chapter structure, typography and build conventions of [GPU Lab](https://github.com/snowch/gpu-lab).

The kernel module sources in `examples/` are licensed under [GPL-2.0-only](examples/GPL-2.0.txt). The other course materials follow the repository’s licence notice.
