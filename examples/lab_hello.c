// SPDX-License-Identifier: GPL-2.0-only
#include <linux/errno.h>
#include <linux/init.h>
#include <linux/module.h>

static char *label = "hello";
module_param(label, charp, 0444);
MODULE_PARM_DESC(label, "Message prefix exposed in sysfs");

static int __init hello_init(void)
{
    if (!label || !label[0])
        return -EINVAL;
    pr_info("lab_hello: init label=%s\n", label);
    return 0;
}

static void __exit hello_exit(void)
{
    pr_info("lab_hello: exit label=%s\n", label);
}

module_init(hello_init);
module_exit(hello_exit);
MODULE_LICENSE("GPL");
MODULE_DESCRIPTION("Standalone module lifecycle exercise");
