export const concepts = {
  "module-api": {
    title: "Load and remove a kernel module",
    nodes: [
      ["insmod", "Linux loads module code"],
      ["module_init()", "Runs initialisation"],
      ["rmmod", "Calls the module’s cleanup callback"]
    ],
    caption: "The module logs work from kernel context. The runner reads those messages from the guest’s kernel log."
  },
  "parameters": {
    title: "Pass a setting into module initialisation",
    nodes: [
      ["Load command", "label=guest"],
      ["module_param()", "Exposes the setting to the module"],
      ["sysfs", "Shows the effective value"]
    ],
    caption: "The load argument is available before the initialisation callback runs."
  },
  "init-error": {
    title: "Compare successful and failed module loading",
    nodes: [
      ["insmod", "Pass the label at load"],
      ["Init callback", "Return 0 or -EINVAL"],
      ["Observe", "Module entry exists only after success"]
    ],
    caption: "The capstone uses the parameter and lifecycle interfaces to tell rejection from a module that can be removed."
  },
  "lifecycle": {
    title: "Register a device and remove it",
    nodes: [
      ["Init", "misc_register names lab0"],
      ["devtmpfs", "Supplies /dev/lab0"],
      ["Exit", "misc_deregister removes the entry"]
    ],
    caption: "The device node provides a userspace path to the registered device operations."
  },
  "open-device": {
    title: "Open a path backed by a driver",
    nodes: [
      ["Userspace", "open(\"/dev/lab0\", O_RDWR)"],
      ["Linux", "Finds the device and its file operations"],
      ["Result", "Descriptor or -1 and errno"]
    ],
    caption: "The descriptor is how later calls reach this instance of the device."
  },
  "io": {
    title: "Follow one write and read back through the driver",
    nodes: [
      ["Userspace", "write(fd, bytes, count)"],
      ["Kernel", "lab_write stores bytes in the queue"],
      ["Read path", "lab_read returns bytes and a count"]
    ],
    caption: "The caller advances by the count it actually receives. The queue preserves the order of bytes."
  },
  "nonblock": {
    title: "Return promptly for an empty or full queue",
    nodes: [
      ["Call", "Nonblocking read or write"],
      ["Driver checks", "Is there data or free space?"],
      ["No progress now", "Return -EAGAIN to userspace"]
    ],
    caption: "EAGAIN is a temporary condition. The caller can wait for readiness and try the operation again."
  },
  "short-write": {
    title: "Handle a positive short write",
    nodes: [
      ["Offered bytes", "More than the device can store"],
      ["First write", "Returns bytes accepted"],
      ["Retry", "Drain space and send the remainder"]
    ],
    caption: "A short positive return is progress. Retrying from the start would send those accepted bytes twice."
  },
  "references": {
    title: "Follow the reference that keeps a module loaded",
    nodes: [
      ["Open device", "Descriptor holds a reference"],
      ["Attempt rmmod", "Refused while descriptor is open"],
      ["Close and retry", "Module can unload and node disappears"]
    ],
    caption: "The open reference protects the device callbacks while a process can still call them."
  },
  "blocking": {
    title: "See why a blocked reader wakes",
    nodes: [
      ["Empty queue", "Driver waits for data"],
      ["Writer", "Adds a byte and wakes the wait queue"],
      ["Reader", "Rechecks queue and reads byte"]
    ],
    caption: "Waking the reader tells it to recheck the condition. The queued byte is what makes the read possible."
  },
  "interrupt": {
    title: "Compare interrupted and restarted reads",
    nodes: [
      ["Reader", "Blocks on an empty device"],
      ["Signal", "Interrupts the waiting syscall"],
      ["Result", "EINTR or a restarted read"]
    ],
    caption: "SA_RESTART can restart this kind of read. Look at the final syscall result before interpreting the wake."
  },
  "control": {
    title: "Send a command through a device descriptor",
    nodes: [
      ["Userspace", "ioctl(fd, request, argument)"],
      ["Driver", "Selects the matching ABI command"],
      ["Result", "Queue information, reset or error"]
    ],
    caption: "A control command can inspect or change device state without transferring a byte stream."
  },
  "events": {
    title: "Turn delayed work into readable input",
    nodes: [
      ["ioctl", "Schedules work for later"],
      ["Work callback", "Queues a byte and wakes waiters"],
      ["poll and read", "Detect readiness then consume byte"]
    ],
    caption: "poll’s readiness is evidence that a read can make progress. The read actually consumes the event."
  },
  "map": {
    title: "Compare a mapped snapshot with the live queue",
    nodes: [
      ["mmap()", "Captures queue state in a page"],
      ["Write", "Changes the live queue"],
      ["Compare", "Mapping holds snapshot, ioctl reports live state"]
    ],
    caption: "The read-only mapping exposes the state captured when it was created."
  },
  "waits-capstone": {
    title: "Clear stale readiness, then wait for a fresh event",
    nodes: [
      ["LAB_RESET", "Queued bytes go to zero"],
      ["LAB_SCHEDULE", "Driver schedules delayed work"],
      ["poll and read", "New byte arrives, queue drains"]
    ],
    caption: "Check readiness immediately after reset so the later wake can be attributed to the scheduled work."
  },
  "platform-rate": {
    title: "Follow a sysfs attribute read",
    nodes: [
      ["cat rate", "Opens the attribute file"],
      ["sysfs", "Calls the driver’s show callback"],
      ["Userspace", "Receives the formatted rate"]
    ],
    caption: "The callback supplies the file’s contents when userspace reads it."
  },
  "platform": {
    title: "Observe a platform device bind and unbind",
    nodes: [
      ["Register", "Driver and synthetic device use a matching name"],
      ["Bind", "probe runs and sysfs shows driver and rate"],
      ["Remove", "Device and its attributes disappear"]
    ],
    caption: "The driver link and attribute give separate evidence that binding completed successfully."
  },
  "capstone": {
    title: "Verify data, notification and cleanup together",
    nodes: [
      ["Exchange", "Check a write/read round trip"],
      ["Notify", "Scheduled work wakes the client"],
      ["Clean up", "Queue empties, descriptor closes, device is removed"]
    ],
    caption: "Each observation checks a different part of the complete character-device session."
  },
};
