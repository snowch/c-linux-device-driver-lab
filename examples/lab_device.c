// SPDX-License-Identifier: GPL-2.0-only
#include <linux/fs.h>
#include <linux/highmem.h>
#include <linux/init.h>
#include <linux/jiffies.h>
#include <linux/kfifo.h>
#include <linux/miscdevice.h>
#include <linux/mm.h>
#include <linux/module.h>
#include <linux/mutex.h>
#include <linux/poll.h>
#include <linux/uaccess.h>
#include <linux/wait.h>
#include <linux/workqueue.h>
#include "lab_abi.h"

#define CAPACITY 64
#define DELAY_MS 80

static DEFINE_KFIFO(queue, unsigned char, CAPACITY);
static DEFINE_MUTEX(queue_lock);
static DECLARE_WAIT_QUEUE_HEAD(changed);

static ssize_t lab_read(struct file *file, char __user *destination,
                        size_t count, loff_t *position)
{
    unsigned int copied;
    int error;

    if (!count)
        return 0;
    for (;;) {
        error = mutex_lock_interruptible(&queue_lock);
        if (error)
            return error;
        if (!kfifo_is_empty(&queue))
            break;
        mutex_unlock(&queue_lock);
        if (file->f_flags & O_NONBLOCK)
            return -EAGAIN;
        error = wait_event_interruptible(changed, !kfifo_is_empty(&queue));
        if (error)
            return error;
    }
    error = kfifo_to_user(&queue, destination, min_t(size_t, count, CAPACITY), &copied);
    mutex_unlock(&queue_lock);
    if (copied)
        wake_up_interruptible(&changed);
    return copied ? (ssize_t)copied : error;
}

static ssize_t lab_write(struct file *file, const char __user *source,
                         size_t count, loff_t *position)
{
    unsigned int copied;
    int error;

    if (!count)
        return 0;
    for (;;) {
        error = mutex_lock_interruptible(&queue_lock);
        if (error)
            return error;
        if (!kfifo_is_full(&queue))
            break;
        mutex_unlock(&queue_lock);
        if (file->f_flags & O_NONBLOCK)
            return -EAGAIN;
        error = wait_event_interruptible(changed, !kfifo_is_full(&queue));
        if (error)
            return error;
    }
    error = kfifo_from_user(&queue, source, min_t(size_t, count, CAPACITY), &copied);
    mutex_unlock(&queue_lock);
    if (copied)
        wake_up_interruptible(&changed);
    return copied ? (ssize_t)copied : error;
}

static __poll_t lab_poll(struct file *file, poll_table *table)
{
    __poll_t events = 0;

    poll_wait(file, &changed, table);
    mutex_lock(&queue_lock);
    if (!kfifo_is_empty(&queue))
        events |= EPOLLIN | EPOLLRDNORM;
    if (!kfifo_is_full(&queue))
        events |= EPOLLOUT | EPOLLWRNORM;
    mutex_unlock(&queue_lock);
    return events;
}

/* Workqueue callbacks run in process context and can take a mutex. */
static void publish_event(struct work_struct *work)
{
    const unsigned char value = '!';
    bool inserted;

    mutex_lock(&queue_lock);
    inserted = kfifo_put(&queue, value);
    mutex_unlock(&queue_lock);
    if (inserted)
        wake_up_interruptible(&changed);
}
static DECLARE_DELAYED_WORK(event_work, publish_event);

static long lab_ioctl(struct file *file, unsigned int request, unsigned long argument)
{
    struct lab_info info;

    switch (request) {
    case LAB_GET_INFO:
        mutex_lock(&queue_lock);
        info = (struct lab_info){ .capacity = CAPACITY, .queued = kfifo_len(&queue) };
        mutex_unlock(&queue_lock);
        return copy_to_user((void __user *)argument, &info, sizeof info) ? -EFAULT : 0;
    case LAB_RESET:
        mutex_lock(&queue_lock);
        kfifo_reset(&queue);
        mutex_unlock(&queue_lock);
        wake_up_interruptible(&changed);
        return 0;
    case LAB_SCHEDULE:
        return schedule_delayed_work(&event_work, msecs_to_jiffies(DELAY_MS)) ? 0 : -EBUSY;
    default:
        return -ENOTTY;
    }
}

/* Map a read-only snapshot. The mapping owns its reference to the page. */
static int lab_mmap(struct file *file, struct vm_area_struct *area)
{
    struct page *page;
    struct lab_info *info;
    int error;

    if (area->vm_pgoff || area->vm_end - area->vm_start != PAGE_SIZE ||
        (area->vm_flags & VM_WRITE))
        return -EINVAL;
    vm_flags_clear(area, VM_MAYWRITE);
    page = alloc_page(GFP_KERNEL | __GFP_ZERO);
    if (!page)
        return -ENOMEM;
    info = kmap_local_page(page);
    mutex_lock(&queue_lock);
    *info = (struct lab_info){ .capacity = CAPACITY, .queued = kfifo_len(&queue) };
    mutex_unlock(&queue_lock);
    kunmap_local(info);
    error = vm_insert_page(area, area->vm_start, page);
    put_page(page);
    return error;
}

static const struct file_operations operations = {
    .owner = THIS_MODULE,
    .open = nonseekable_open,
    .read = lab_read,
    .write = lab_write,
    .poll = lab_poll,
    .unlocked_ioctl = lab_ioctl,
    .mmap = lab_mmap,
};

static struct miscdevice device = {
    .minor = MISC_DYNAMIC_MINOR,
    .name = "lab0",
    .fops = &operations,
    .mode = 0600,
};

static int __init lab_init(void)
{
    int result = misc_register(&device);
    if (!result)
        pr_info("lab_device: registered /dev/lab0\n");
    return result;
}

static void __exit lab_exit(void)
{
    misc_deregister(&device);
    cancel_delayed_work_sync(&event_work);
    pr_info("lab_device: removed /dev/lab0\n");
}
module_init(lab_init);
module_exit(lab_exit);
MODULE_LICENSE("GPL");
MODULE_DESCRIPTION("In-memory character device for the Linux driver lab");
