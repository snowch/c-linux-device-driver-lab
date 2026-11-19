const step = (heading, text, file, anchor, lines) => ({ heading, text, file, anchor, lines });
const guide = (goal, look, edit, ...steps) => ({ goal, look, edit, steps });

export const walkthroughs = {
  'module-api': { ...guide(
    'Load the smallest module in this course, look for its two messages, and unload it. The first run uses the bundled module so you can see the lifecycle before building from source.',
    'Find an init line, an exit line and “standalone module removed”. Linux calls the functions in that order.',
    'insmod lab_hello.ko',
    step('Connect two functions to the module lifecycle', 'module_init() tells Linux which function to call when loading. module_exit() supplies the cleanup function for unloading.', 'lab_hello.c', 'module_init(hello_init);', 2),
    step('Load, check and unload', 'insmod loads the module, /proc/modules lists it, and rmmod calls its cleanup function. The last check confirms its sysfs entry is gone.', 'run-driver.sh', 'insmod lab_hello.ko', 4)), editFile: 'run-driver.sh' },
  parameters: guide(
    'Pass one value at module load and read it back from a kernel-published file.',
    'Look for “sysfs label: guest”. The module’s compiled-in default is hello.',
    'label=guest',
    step('Declare the value Linux can set', 'module_param() declares label as a string. The mode 0444 exposes the current value through a read-only sysfs file.', 'lab_hello.c', 'static char *label =', 3),
    step('Supply a different value at load time', 'The argument after the module name overrides the default before init runs. The harness reads the actual value from sysfs.', 'run-driver.sh', 'label=guest', 4)),
  'init-error': guide(
    'Give a module an empty label so you can distinguish a load attempt from successful initialisation.',
    'Look for an invalid-parameter error and confirmation that no loaded module remains.',
    'label=\n',
    step('Reject a value in init', 'Kernel code returns the negative error value -EINVAL. A nonzero init return stops the module from remaining loaded.', 'lab_hello.c', 'if (!label || !label[0])', 4),
    step('Check what the kernel left behind', 'The failure path checks that the module directory is absent. The success path explicitly unloads the module after inspecting it.', 'run-driver.sh', 'test -z "$label"', 3)),
  lifecycle: guide(
    'Take the next step from a standalone module. Give userspace a device file and remove it again on unload.',
    'Find /dev/lab0 and the lab_device entry in /proc/modules. The final line confirms the device node was removed.',
    'pr_info("lab_device: registered',
    step('Describe the device and its operations', 'The misc-device framework allocates a minor number. The name supplies lab0, and fops connects system calls on the open device to driver functions.', 'lab_device.c', 'static struct miscdevice device =', 6),
    step('Register it during module init', 'misc_register() makes the device available so devtmpfs can expose its node. The return value becomes the module’s init result.', 'lab_device.c', 'int result = misc_register(&device);', 4)),
  io: guide(
    'Open the character device, write a message and read it back in small pieces.',
    'Look for reads of 2, 2 and 1 byte and “round trip: hello”. The total is independent of the request size.',
    'CHUNK = 2',
    step('Limit how many bytes each read asks for', 'The request is the smaller of the remaining message and CHUNK. The next read starts at buffer + total.', 'probe.c', 'size_t request = sizeof payload - 1 - total;', 4),
    step('Use the count the driver actually returns', 'The kernel copies bytes from its queue using a helper that can access user memory. The driver returns the number copied when it made progress.', 'lab_device.c', 'error = kfifo_to_user(&queue,', 5)),
  nonblock: guide(
    'Check what an empty read and a full write do when userspace has asked the driver to avoid waiting.',
    'Find EAGAIN on the empty read and again when the probe tries to write past the 64-byte capacity.',
    '#define CAPACITY',
    step('Use the descriptor’s nonblocking flag', 'The read path reaches this check when the queue is empty. With O_NONBLOCK it returns -EAGAIN. Otherwise it can wait for data.', 'lab_device.c', 'if (file->f_flags & O_NONBLOCK)', 3),
    step('Fill the queue and try one extra byte', 'The probe asks the driver for its capacity, fills it and makes a second request. That second request should report EAGAIN.', 'probe.c', 'require(write(fd, data, info.capacity)', 3)),
  'short-write': guide(
    'Send a buffer larger than the device can hold and make the next write start where the first stopped.',
    'Find “requested 67 bytes, accepted 64, remaining 3” and “retry queued 3 bytes”.',
    'const size_t extra =',
    step('Use a positive short count as progress', 'The return value from write() tells the caller how many bytes entered the queue. The requested size is only an upper limit.', 'probe.c', 'ssize_t accepted = write(fd, data, length);', 4),
    step('Make room and resubmit the remainder', 'After draining the queue, advance the source pointer by accepted and reduce the length by that same count.', 'probe.c', 'require(read(fd, data, info.capacity)', 3)),
  references: guide(
    'Keep the device open during an unload attempt and observe how Linux protects active callers.',
    'Find the refusal while open, then the successful unload after the descriptor closes.',
    'hold_device_open=1',
    step('Associate the open file with its module', 'THIS_MODULE tells the kernel which module owns these file operations. An open device can hold a reference that prevents module removal.', 'lab_device.c', 'static const struct file_operations operations =', 5),
    step('Hold a descriptor while attempting removal', 'The shell keeps file descriptor 9 open across rmmod. It closes the descriptor before the normal unload at the end.', 'run-driver.sh', 'exec 9<>/dev/lab0', 5)),
  blocking: guide(
    'Let a reader sleep on an empty device, then let a second process write the byte that wakes it.',
    'Find the waiting message followed by “blocked reader returned X”.',
    'int ok = read(input,',
    step('Wait without holding the queue lock', 'The driver drops the mutex before sleeping. The wait condition only becomes true when data appears, and the loop checks again after waking.', 'lab_device.c', 'error = wait_event_interruptible(changed, !kfifo_is_empty', 4),
    step('Send the byte and collect the reader', 'The probe checks the reader has not exited and writes X. It then waits for the reader to finish and checks the exit status.', 'probe.c', 'require(write(fd, "X", 1)', 3)),
  interrupt: guide(
    'Interrupt a blocked read with a signal. Then repeat with a signal handler that allows Linux to restart the call.',
    'The starter reports EINTR. With restart enabled, expect the read to return R after the later writer runs.',
    'const int restart_reads =',
    step('Choose whether a signal can restart a read', 'SA_RESTART allows the kernel to restart calls such as this blocking read after the handler returns. With flags zero, the interrupted read can report EINTR.', 'probe.c', 'const int restart_reads =', 4),
    step('Make the signal arrive before the data', 'The alarm is armed for 50 milliseconds. The separate writer waits longer, so the empty read encounters the signal first.', 'probe.c', 'struct itimerval alarm_time =', 4)),
  control: guide(
    'Ask the device for queue information, reset it, then try a request it does not understand.',
    'The starter reports capacity 64, queued 5, queued after reset 0 and ENOTTY for the unknown request.',
    '#define CAPACITY',
    step('Take a snapshot and copy it to the caller', 'The mutex protects the queue length while the driver gathers the two fields. copy_to_user() transfers the resulting structure across the kernel boundary.', 'lab_device.c', 'case LAB_GET_INFO:', 5),
    step('Clear the queue through an explicit request', 'LAB_RESET deliberately changes device state. The ioctl() returns a status and a separate call reads the new queue length.', 'lab_device.c', 'case LAB_RESET:', 6)),
  events: guide(
    'Arrange for the device to produce a byte later, then let a userspace poll wait for it.',
    'Look for the empty poll returning zero and then the delayed-work message delivering !.',
    '#define DELAY_MS',
    step('Schedule work to run later', 'LAB_SCHEDULE queues a callback rather than producing the byte directly. The delay gives the caller a chance to start waiting.', 'lab_device.c', 'case LAB_SCHEDULE:', 2),
    step('Publish the byte before waking the reader', 'The callback adds the byte under the lock. It wakes the queue after inserting it, so the next readiness check can see the data.', 'lab_device.c', 'inserted = kfifo_put(&queue, value);', 4)),
  map: { ...guide(
    'Map a read-only snapshot of the queue, write new data and compare the snapshot with a fresh query.',
    'Expect mapped queued=0 and live queued=5. The mapped page describes the older state.',
    'const struct lab_info *mapped = mmap(',
    step('Capture the state at mapping time', 'The driver fills a page with queue information and inserts that page into the process’s mapping. Later writes to the queue do not update that page.', 'lab_device.c', '*info = (struct lab_info){', 5),
    step('Compare with a live read after writing', 'The probe maps the page before writing, then reads the current queue information through the device. It can display both descriptions together.', 'probe.c', 'const struct lab_info *mapped = mmap(', 6)), editFile: 'probe.c' },
  platform: guide(
    'Bind a synthetic device to its platform driver and read a value exported through sysfs.',
    'Find the bound driver, sample rate 25 and confirmation that the device was removed after unload.',
    '#define SAMPLE_RATE',
    step('Expose a read-only attribute', 'The function prints the sample rate into the kernel’s sysfs buffer. DEVICE_ATTR_RO declares this as a read-only attribute.', 'lab_platform.c', 'return sysfs_emit(buffer, "%u', 3),
    step('Register the matching pair', 'The device name matches the platform driver name. Once the device registers, Linux can call probe() for that match.', 'lab_platform.c', 'instrument = platform_device_register_simple', 5)),
  capstone: guide(
    'Use one probe to verify the device’s normal data path, readiness notification and final queue state.',
    'Look for the round trip, the delayed notification and an empty final queue. The harness then checks successful unload.',
    'exchange(fd);',
    step('Run the independent checks in sequence', 'The first helper exercises read and write, the second waits for a notification, and the last condition checks that the probe drained the queue.', 'probe.c', 'exchange(fd);', 4),
    step('Verify cleanup from userspace', 'The shell unloads the module, then checks that the device node disappeared. This confirms cleanup independently of the byte tests.', 'run-driver.sh', 'rmmod lab_device', 3)),
};
