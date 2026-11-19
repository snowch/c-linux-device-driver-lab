export const course = {
  "slug": "c-linux-device-driver-lab",
  "title": "C Linux Device Driver Lab",
  "summary": "Kernel modules, character devices, userspace ABI, readiness, workqueues and platform binding.",
  "instructions": "Run in Linux builds and loads the selected kernel module, then runs its check. The first build can take a few minutes. Wait for the unload message before editing and running again.",
  "files": {
    "lab_device.c": "./examples/lab_device.c",
    "probe.c": "./examples/probe.c",
    "lab_abi.h": "./examples/lab_abi.h",
    "lab_platform.c": "./examples/lab_platform.c",
    "Makefile": "./examples/Makefile",
    "run-driver.sh": "./examples/run-driver.sh"
  },
  "prepare": "mkdir -p /tmp/device-lab\ncmp -s /tmp/lesson-input/lab_device.c /tmp/device-lab/lab_device.c || cp /tmp/lesson-input/lab_device.c /tmp/device-lab/lab_device.c\ncmp -s /tmp/lesson-input/probe.c /tmp/device-lab/probe.c || cp /tmp/lesson-input/probe.c /tmp/device-lab/probe.c\ncmp -s /tmp/lesson-input/lab_abi.h /tmp/device-lab/lab_abi.h || cp /tmp/lesson-input/lab_abi.h /tmp/device-lab/lab_abi.h\ncmp -s /tmp/lesson-input/lab_platform.c /tmp/device-lab/lab_platform.c || cp /tmp/lesson-input/lab_platform.c /tmp/device-lab/lab_platform.c\ncmp -s /tmp/lesson-input/Makefile /tmp/device-lab/Makefile || cp /tmp/lesson-input/Makefile /tmp/device-lab/Makefile\ncmp -s /tmp/lesson-input/run-driver.sh /tmp/device-lab/run-driver.sh || cp /tmp/lesson-input/run-driver.sh /tmp/device-lab/run-driver.sh",
  "lessons": [
    {
      "id": "lifecycle",
      "section": "Modules and character devices",
      "title": "Load and unload a kernel module",
      "intro": "A loadable module extends a running Linux kernel. The lab uses matching kernel headers and builds the module in the guest with Kbuild.",
      "question": "What changes in /dev and /proc/modules while the module is loaded?",
      "focus": "static int __init lab_init",
      "task": "Change the module’s registration message in lab_init(). Run again, then enter dmesg | tail -12 in the Linux shell to see it.",
      "hint": "module_init and module_exit register the callbacks used by insmod and rmmod.",
      "explanation": "misc_register() allocates a minor number and registers the device. devtmpfs exposes /dev/lab0. Module exit unregisters it and waits for outstanding scheduled work.",
      "transfer": "Which resource would you clean up if a second registration failed after the first succeeded?",
      "reference": [
        "Read the external module guide",
        "https://docs.kernel.org/kbuild/modules.html"
      ],
      "command": "sh /tmp/device-lab/run-driver.sh lifecycle",
      "file": "lab_device.c"
    },
    {
      "id": "io",
      "section": "Modules and character devices",
      "title": "Move bytes through a character device",
      "intro": "A character device exposes operations through a file descriptor. This driver stores bytes in a bounded FIFO, where the earliest written byte is read first.",
      "question": "How many read calls will the probe need for a five-byte message when it requests two per call?",
      "focus": "static void exchange",
      "task": "Change CHUNK from 2 to 3 in probe.c, then run and compare the read counts and the final round trip.",
      "hint": "The app advances its buffer offset after each successful read. The driver reports actual bytes copied.",
      "explanation": "Each read consumes up to the requested count. The offset loop rebuilds the five-byte payload without assuming that requests are fully satisfied.",
      "transfer": "What return value would mean a read of one byte copied zero bytes, and how would the caller interpret it?",
      "reference": [
        "Read read(2)",
        "https://man7.org/linux/man-pages/man2/read.2.html"
      ],
      "file": "probe.c",
      "command": "sh /tmp/device-lab/run-driver.sh io"
    },
    {
      "id": "nonblock",
      "section": "Modules and character devices",
      "title": "Handle empty reads and full writes",
      "intro": "O_NONBLOCK lets a caller avoid waiting. The driver reports EAGAIN for an empty read or a write to a full queue.",
      "question": "How much data can the app enqueue before a further write would block?",
      "focus": "#define CAPACITY",
      "task": "Change CAPACITY from 64 to 16 in lab_device.c. Run and compare the reported capacity at which the next write returns EAGAIN.",
      "hint": "The probe queries capacity via ioctl(), then fills the queue before its final write. Keep CAPACITY a power of two for the FIFO.",
      "explanation": "The open flag chooses between waiting and returning EAGAIN. Queue capacity controls backpressure and does not change the meaning of an empty read.",
      "transfer": "What should happen if a single write requests more bytes than the driver currently has room for?",
      "reference": [
        "Read open(2)",
        "https://man7.org/linux/man-pages/man2/open.2.html"
      ],
      "command": "sh /tmp/device-lab/run-driver.sh nonblock",
      "file": "lab_device.c"
    },
    {
      "id": "blocking",
      "section": "Waits, control and mappings",
      "title": "Wake a reader when data arrives",
      "intro": "A wait queue lets a task sleep until a driver state change might let it continue. The driver releases its mutex before sleeping and rechecks the condition when it wakes.",
      "question": "What happens to a blocking read while the FIFO is empty and then becomes nonempty?",
      "focus": "static void blocking_read",
      "task": "Change both occurrences of X in the read check and write payload to Y, and update the output message. Run and check which value wakes the blocked reader.",
      "hint": "The child opens the device without O_NONBLOCK. The parent confirms the child is still running before writing.",
      "explanation": "The write changes the queue condition then wakes the reader. The reader reacquires the mutex and reads the byte.",
      "transfer": "Why must a woken reader check the condition again when several processes are waiting?",
      "reference": [
        "Read wait queues and wake events",
        "https://docs.kernel.org/driver-api/basics.html"
      ],
      "file": "probe.c",
      "command": "sh /tmp/device-lab/run-driver.sh blocking"
    },
    {
      "id": "control",
      "section": "Waits, control and mappings",
      "title": "Define a userspace ioctl contract",
      "intro": "An ioctl is a device-specific control operation. The shared lab_abi.h header defines request numbers and fixed-width fields for both kernel and userspace.",
      "question": "What does the driver report for an unknown control request, and what state changes after reset?",
      "focus": "static long lab_ioctl",
      "task": "Change CAPACITY to 32, then run. Check the reported capacity, queued bytes after reset and the error for the unknown request.",
      "hint": "LAB_GET_INFO copies the structure to userspace. LAB_RESET changes the queue without returning a structure.",
      "explanation": "The queue starts with the bytes written by the probe, then resets to empty. Unknown requests report ENOTTY. Fixed-width fields make the ABI layout predictable.",
      "transfer": "What should the driver return if it cannot write the output structure to the supplied userspace pointer?",
      "reference": [
        "Read kernel ioctl guidance",
        "https://docs.kernel.org/driver-api/ioctl.html"
      ],
      "command": "sh /tmp/device-lab/run-driver.sh control",
      "file": "lab_device.c"
    },
    {
      "id": "events",
      "section": "Waits, control and mappings",
      "title": "Notify poll from delayed work",
      "intro": "A workqueue runs a callback asynchronously in process context. This callback places one byte in the FIFO and wakes tasks waiting for readiness.",
      "question": "Can the app wait for a device event without repeatedly calling read()?",
      "focus": "#define DELAY_MS",
      "task": "Change DELAY_MS from 80 to 150 in lab_device.c and run again with the same one-second userspace timeout.",
      "hint": "The ioctl schedules work. poll_wait() attaches the waiter to the queue, then the driver reports current readiness.",
      "explanation": "An empty queue is initially unreadable. After the callback inserts data, poll wakes, then read consumes the event byte.",
      "transfer": "What should the lab do if work is still pending when rmmod starts?",
      "reference": [
        "Read the workqueue guide",
        "https://docs.kernel.org/core-api/workqueue.html"
      ],
      "command": "sh /tmp/device-lab/run-driver.sh events",
      "file": "lab_device.c"
    },
    {
      "id": "map",
      "section": "Waits, control and mappings",
      "title": "Map a read-only snapshot into userspace",
      "intro": "mmap can expose a driver-managed page. This example allocates and zeroes a page, copies the current status into it and maps it read-only.",
      "question": "Will the original mapping change when new bytes enter the queue?",
      "focus": "static int lab_mmap",
      "task": "In probe.c, move the write in map_snapshot() above the mmap call. Run and compare mapped queued with live queued.",
      "hint": "The driver populates the page at mapping time. The ioctl reads fresh state when called.",
      "explanation": "In the starter, the mapping precedes the write so the snapshot remains zero. Mapping after the write captures the updated queue count.",
      "transfer": "Why must the driver zero a page before mapping a small structure from it into userspace?",
      "reference": [
        "Read kernel memory-management APIs",
        "https://docs.kernel.org/core-api/mm-api.html"
      ],
      "command": "sh /tmp/device-lab/run-driver.sh map",
      "file": "lab_device.c"
    },
    {
      "id": "platform",
      "section": "Binding and verification",
      "title": "Bind a synthetic platform driver",
      "intro": "The platform bus matches a device with a driver. This exercise registers a synthetic platform device and publishes its sample rate through sysfs.",
      "question": "What path shows that the device is bound, and what happens to the path at unload?",
      "focus": "static int instrument_probe",
      "task": "Change SAMPLE_RATE to 50 in lab_platform.c, then run and inspect the sysfs value and the cleanup message.",
      "hint": "The device and driver use the same name. The read-only attribute is implemented by rate_show().",
      "explanation": "The driver core calls probe on a match and exposes the bound driver and attributes through sysfs. Unregistering the device calls remove and takes away the device path.",
      "transfer": "Change only the platform device name. What happens to the driver symlink, and why does the check fail?",
      "reference": [
        "Read the platform driver guide",
        "https://docs.kernel.org/driver-api/driver-model/platform.html"
      ],
      "file": "lab_platform.c",
      "command": "sh /tmp/device-lab/run-driver.sh platform"
    },
    {
      "id": "capstone",
      "section": "Binding and verification",
      "title": "Verify a complete character-device session",
      "intro": "Exercise the module as a userspace client. The probe checks a round trip, waits for a separate asynchronous notification, then confirms the queue is empty before unload.",
      "question": "What independent observations show that the device works and leaves no registered device after the test?",
      "focus": "if (argc == 2 && !strcmp(argv[1], \"capstone\"))",
      "task": "Extend the capstone probe to assert the documented capacity before exchange() and to verify that queued is zero at both the start and end. Run the suite.",
      "hint": "Use read_info() to observe the queue without consuming data. The shell harness separately checks the device path after rmmod.",
      "explanation": "A passing byte test checks the data path, the poll check verifies notification, and the final queue and device-path checks verify cleanup at two levels.",
      "transfer": "Add a second run that forces queue backpressure and checks that the driver recovers when the client reads from it.",
      "reference": [
        "Read the Linux driver API",
        "https://docs.kernel.org/driver-api/index.html"
      ],
      "file": "probe.c",
      "command": "sh /tmp/device-lab/run-driver.sh capstone"
    }
  ]
};
