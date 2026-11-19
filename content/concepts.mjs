export const concepts = {
  "module-api": {
    title: "Load and remove a kernel module",
    nodes: [
      ["insmod","Linux loads module code"],
      ["module_init()","Runs initialisation"],
      ["rmmod","Calls the module’s cleanup callback"],
    ],
    caption: "The module logs work from kernel context. The runner reads those messages from the guest’s kernel log.",
  },
  "parameters": {
    title: "Pass a setting into module initialisation",
    visual: {
      kind: "layers",
      layers: [
        ["Loader","insmod lab_hello.ko label=guest","Supplies a load-time argument"],
        ["Kernel module","module_param()","Provides the configured label to the init callback"],
        ["Userspace","Read sysfs","Inspect the effective parameter value"],
      ],
      crossings: ["Pass parameter","Expose attribute"],
    },
    caption: "The load argument is available before the initialisation callback runs.",
  },
  "init-error": {
    title: "Compare successful and failed module loading",
    visual: {
      kind: "compare",
      cases: [
        {"label":"Nonempty label","facts":[["Init return","0"],["Module state","Loaded and removable"]]},
        {"label":"Empty label","facts":[["Init return","-EINVAL"],["Module state","Load rejected and no loaded module remains"]]},
      ],
    },
    caption: "The capstone uses the parameter and lifecycle interfaces to tell rejection from a module that can be removed.",
  },
  "lifecycle": {
    title: "Register a device and remove it",
    nodes: [
      ["Init","misc_register names lab0"],
      ["devtmpfs","Supplies /dev/lab0"],
      ["Exit","misc_deregister removes the entry"],
    ],
    caption: "The device node provides a userspace path to the registered device operations.",
  },
  "open-device": {
    title: "Open a path backed by a driver",
    visual: {
      kind: "layers",
      layers: [
        ["Userspace","open(\"/dev/lab0\", O_RDWR)","The path names a character device"],
        ["Kernel","Device file operations","Resolve the device and dispatch to its open operation"],
        ["Userspace","fd","Use this descriptor for later read and write calls"],
      ],
      crossings: ["Cross the syscall boundary","Return descriptor"],
    },
    caption: "The descriptor is how later calls reach this instance of the device.",
  },
  "io": {
    title: "Follow one write and read back through the driver",
    visual: {
      kind: "queue",
      writer: ["write()","Userspace sends hello"],
      name: "Driver FIFO",
      cells: ["h","e","l","l","o"],
      reader: ["read()","Starter requests up to 2 bytes at a time"],
      signal: ["Expected chunks","he, ll, o"],
    },
    caption: "The caller advances by the count it actually receives. The queue preserves the order of bytes.",
  },
  "nonblock": {
    title: "Return promptly for an empty or full queue",
    visual: {
      kind: "compare",
      cases: [
        {"label":"Empty device queue","facts":[["Operation","Nonblocking read"],["What’s missing","Input bytes"],["Return","EAGAIN"]]},
        {"label":"Full device queue","facts":[["Operation","Nonblocking write"],["What’s missing","Queue space"],["Return","EAGAIN"]]},
      ],
    },
    caption: "EAGAIN is a temporary condition. The caller can wait for readiness and try the operation again.",
  },
  "short-write": {
    title: "Handle a positive short write",
    visual: {
      kind: "queue",
      writer: ["write()","Offers more bytes than capacity"],
      name: "Accepted bytes in FIFO",
      cells: ["a","a","a","…"],
      reader: ["Read to drain","Makes room for retrying the remainder"],
      signal: ["Next write","Start at the first byte that was not accepted."],
    },
    caption: "A short positive return is progress. Retrying from the start would send those accepted bytes twice.",
  },
  "references": {
    title: "Follow the reference that keeps a module loaded",
    visual: {
      kind: "state",
      identity: "One loaded module and its device",
      before: ["Descriptor open","The held reference makes rmmod fail."],
      action: "close() releases the reference",
      after: ["Descriptor closed","rmmod can unload the module and remove the device node."],
    },
    caption: "The open reference protects the device callbacks while a process can still call them.",
  },
  "blocking": {
    title: "See why a blocked reader wakes",
    visual: {
      kind: "queue",
      writer: ["Writer","Adds a byte to the queue"],
      name: "Driver FIFO",
      cells: ["X",null,null],
      reader: ["Reader","Rechecks the queue after waking"],
      signal: ["Wakeup","The driver signals the wait queue after adding data."],
    },
    caption: "Waking the reader tells it to recheck the condition. The queued byte is what makes the read possible.",
  },
  "interrupt": {
    title: "Compare interrupted and restarted reads",
    visual: {
      kind: "compare",
      cases: [
        {"label":"Restart disabled","facts":[["While blocked","Signal arrives"],["read() result","-1 and EINTR"]]},
        {"label":"SA_RESTART set","facts":[["While blocked","Signal arrives"],["read() result","Call restarts and can receive the later byte"]]},
      ],
    },
    caption: "SA_RESTART can restart this kind of read. Look at the final syscall result before interpreting the wake.",
  },
  "control": {
    title: "Send a command through a device descriptor",
    visual: {
      kind: "layers",
      layers: [
        ["Userspace","ioctl(fd, request, argument)","Select a documented request number"],
        ["Kernel","Driver’s ioctl callback","Inspect or reset device state. Reject unknown requests."],
        ["Userspace","Return value or filled structure","An unsupported request reports ENOTTY."],
      ],
      crossings: ["Syscall dispatch","Return result"],
    },
    caption: "A control command can inspect or change device state without transferring a byte stream.",
  },
  "events": {
    title: "Turn delayed work into readable input",
    visual: {
      kind: "queue",
      writer: ["Driver work item","Adds ! after the requested delay"],
      name: "Event byte in the FIFO",
      cells: ["!",null,null,null],
      reader: ["Userspace","poll() wakes, then read() consumes !"],
      signal: ["POLLIN","Readiness follows insertion. Reading the byte drains the queue."],
    },
    caption: "poll’s readiness is evidence that a read can make progress. The read actually consumes the event.",
  },
  "map": {
    title: "Compare a mapped snapshot with the live queue",
    visual: {
      kind: "compare",
      cases: [
        {"label":"Read-only mapping","facts":[["When created","Snapshot of queue state"],["After a write","Still shows the captured state"]]},
        {"label":"Live ioctl query","facts":[["When called","Reads current queue state"],["After a write","Shows the updated queued bytes"]]},
      ],
    },
    caption: "The read-only mapping exposes the state captured when it was created.",
  },
  "waits-capstone": {
    title: "Clear stale readiness, then wait for a fresh event",
    visual: {
      kind: "queue",
      writer: ["LAB_RESET → LAB_SCHEDULE","Clear the old byte, then schedule fresh work"],
      name: "New queue contents",
      cells: ["!",null,null],
      reader: ["poll() → read()","Detect and consume the scheduled event"],
      signal: ["Check the boundaries","The queue is empty after reset and again after the read."],
    },
    caption: "Check readiness immediately after reset so the later wake can be attributed to the scheduled work.",
  },
  "platform-rate": {
    title: "Follow a sysfs attribute read",
    visual: {
      kind: "layers",
      layers: [
        ["Userspace","cat rate","Opens the attribute in the device’s sysfs directory"],
        ["Kernel","Driver show callback","Formats the current sample rate"],
        ["Userspace","25","Read the bytes returned by that callback"],
      ],
      crossings: ["Read sysfs attribute","Return the formatted value"],
    },
    caption: "The callback supplies the file’s contents when userspace reads it.",
  },
  "platform": {
    title: "Observe a platform device bind and unbind",
    visual: {
      kind: "state",
      identity: "Synthetic platform device · lab-instrument",
      before: ["Bound","Matching driver. sysfs exposes the driver link and rate."],
      action: "Unregister the device",
      after: ["Removed","The device directory and its attributes disappear."],
    },
    caption: "The driver link and attribute give separate evidence that binding completed successfully.",
  },
  "capstone": {
    title: "Verify data, notification and cleanup together",
    nodes: [
      ["Exchange","Check a write/read round trip"],
      ["Notify","Scheduled work wakes the client"],
      ["Clean up","Queue empties, descriptor closes, device is removed"],
    ],
    caption: "Each observation checks a different part of the complete character-device session.",
  },
};
