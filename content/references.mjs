function kernel(path, title, note) {
  return { title, url: 'https://docs.kernel.org/' + path, note };
}
function header(file, title, note) {
  return { title, url: 'https://github.com/torvalds/linux/blob/v6.18/include/linux/' + file, note };
}
function man(page, note, title) {
  const [name, section] = page.split('.');
  return {
    title: title ?? `${name}(${section})`,
    url: `https://man7.org/linux/man-pages/man${section}/${page}.html`,
    note
  };
}

const moduleInit = kernel('driver-api/basics.html#c.module_init', 'module_init()', 'Declare the module’s entry point. Return 0 to finish loading or a negative errno value such as -EINVAL to reject the load.');
const moduleExit = kernel('driver-api/basics.html#c.module_exit', 'module_exit()', 'Declare the cleanup function for a successfully loaded module. Release resources before the module is removed.');
const moduleParam = header('moduleparam.h', 'module_param()', 'The charp type declares the string parameter used by the lab. The permission bits control its sysfs exposure. 0444 makes it readable there.');
const insmod = man('insmod.8', 'Pass name=value after the module path to supply load-time parameters. For this lab, check dmesg for the module’s messages.');
const rmmod = man('rmmod.8', 'Remove a loaded module by name. Normal removal requires its references to be released.');
const misc = kernel('driver-api/misc_devices.html#c.misc_register', 'misc_register(), misc_deregister()', 'Register a device name and file operations as a misc device. MISC_DYNAMIC_MINOR asks Linux to allocate the minor number. Deregister on exit.');
const operations = kernel('filesystems/vfs.html#struct-file-operations', 'struct file_operations', 'The kernel dispatches actions on a device descriptor to these callbacks. Set .owner to THIS_MODULE so open files hold a module reference.');
const kfifoRead = kernel('core-api/kernel-api.html#c.kfifo_to_user', 'kfifo_to_user()', 'Copy up to the requested number of bytes from the FIFO into the user buffer. The copied argument reports progress separately from the error status.');
const kfifoWrite = kernel('core-api/kernel-api.html#c.kfifo_from_user', 'kfifo_from_user()', 'Copy from the user buffer into available FIFO space. The driver uses the copied count as the positive return value even when the request was larger.');
const waitEvent = kernel('driver-api/basics.html#c.wait_event_interruptible', 'wait_event_interruptible()', 'Sleep until the supplied condition becomes true or a signal interrupts the wait. Change the condition’s state before calling wake_up_interruptible().');
const read = man('read.2', 'Check the returned byte count. A short positive return is valid. An empty nonblocking read can fail with EAGAIN.');
const write = man('write.2', 'A positive return is the number accepted. Advance by that count, then retry the remaining bytes when the device can accept more.');
const ioctl = kernel('driver-api/ioctl.html', 'ioctl request encoding and ABI', 'Use _IOR for data the kernel writes back to userspace and _IO for requests with no data. Unknown requests should return -ENOTTY in the driver.');
const poll = man('poll.2', 'Inspect revents for the requested readiness. A timeout returns zero. In the lab, POLLIN means a read can make progress.');
const delayed = kernel('core-api/workqueue.html#c.schedule_delayed_work', 'schedule_delayed_work()', 'Queue a callback to run after a delay in jiffies. The return value is false if this work is already queued.');
const cancel = kernel('core-api/workqueue.html#c.cancel_delayed_work_sync', 'cancel_delayed_work_sync()', 'Cancel queued work and wait for a running callback to finish before unloading the module.');

export const references = {
  'module-api': [
    moduleInit, moduleExit, insmod, rmmod,
    kernel('core-api/printk-basics.html', 'pr_info() and the kernel log', 'pr_info() writes at information level. The loader uses dmesg to read the init and exit messages.')
  ],
  parameters: [
    moduleParam, insmod,
    kernel('admin-guide/kernel-parameters.html', 'Module parameters in sysfs', 'A loaded module can expose readable values in /sys/module/<module>/parameters. The lab reads the effective label there.')
  ],
  'init-error': [moduleInit, moduleParam, insmod, man('errno.3', 'EINVAL denotes an invalid argument. This init function returns the negative kernel form -EINVAL for an empty label.')],
  lifecycle: [misc, operations, moduleInit, moduleExit],
  io: [operations, kfifoRead, kfifoWrite, read, write],
  nonblock: [
    man('open.2', 'O_NONBLOCK requests nonblocking behaviour on the open file. This driver checks it and returns -EAGAIN when the queue cannot make progress.', 'open(O_NONBLOCK)'),
    waitEvent, read, write
  ],
  'short-write': [kfifoWrite, write, read],
  references: [
    operations, rmmod, man('close.2', 'close() releases the descriptor. The open file’s reference is released once its last descriptor or other holder is gone.'),
    kernel('kernel-hacking/hacking.html#try-module-get-module-put', 'Module reference counting', 'A held reference prevents a module from disappearing while its callbacks may still be used.')
  ],
  blocking: [waitEvent, kfifoRead, kfifoWrite, read, write],
  interrupt: [
    waitEvent,
    man('sigaction.2', 'Set SA_RESTART to allow restartable system calls to resume after a caught signal. The lab compares the two settings on a blocking device read.'),
    man('signal.7', 'A read blocked on this device can report EINTR without SA_RESTART. Linux handles the restart or interruption when returning to userspace.', 'Interrupted calls and SA_RESTART'),
    man('setitimer.2', 'An ITIMER_REAL timer delivers SIGALRM when it expires. The lab arms it before waiting for data.')
  ],
  control: [
    ioctl,
    man('ioctl.2', 'Issue a request on a device descriptor. Check -1 and errno for an error. The lab passes a pointer to struct lab_info for its information request.'),
    kernel('kernel-hacking/hacking.html#copy-to-user-copy-from-user-get-user-put-user', 'copy_to_user()', 'Returns the number of bytes it could not copy. The lab converts a nonzero number into -EFAULT.'),
    kernel('core-api/kernel-api.html#c.kfifo_reset', 'kfifo_reset()', 'Reset the FIFO under exclusive access. This driver serialises the reset with the queue mutex.')
  ],
  events: [
    delayed, cancel,
    header('poll.h', 'poll_wait()', 'Register the changed wait queue with the poll table. The file operation still returns the readiness bits computed from the current FIFO state.'), poll, waitEvent
  ],
  map: [
    man('mmap.2', 'Map one page at offset zero with PROT_READ. Test the result against MAP_FAILED. The driver fills a separate page with the current queue state.'),
    kernel('core-api/mm-api.html#c.vm_insert_page', 'vm_insert_page()', 'Install an allocated page into the user mapping. A successful insertion holds a reference so the driver can drop its own with put_page().'),
    ioctl
  ],
  platform: [
    kernel('driver-api/driver-model/platform.html', 'Platform device and driver registration', 'The lab registers a platform driver and a synthetic platform device under the same name. The match invokes .probe. Remove the device before unregistering its driver.'),
    kernel('filesystems/sysfs.html#attributes', 'DEVICE_ATTR_RO() and sysfs attributes', 'Expose a read-only attribute backed by a show callback. Use sysfs_emit() to write the sample rate to the supplied buffer.')
  ],
  capstone: [misc, read, write, ioctl, delayed, poll, rmmod]
};
