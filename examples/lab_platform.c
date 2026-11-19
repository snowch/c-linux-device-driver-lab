// SPDX-License-Identifier: GPL-2.0-only
#include <linux/init.h>
#include <linux/module.h>
#include <linux/platform_device.h>

#define SAMPLE_RATE 25

static struct platform_device *instrument;

static ssize_t rate_show(struct device *device, struct device_attribute *attr, char *buffer)
{
    return sysfs_emit(buffer, "%u\n", SAMPLE_RATE);
}
static DEVICE_ATTR_RO(rate);

static struct attribute *instrument_attrs[] = { &dev_attr_rate.attr, NULL };
ATTRIBUTE_GROUPS(instrument);

static int instrument_probe(struct platform_device *device)
{
    dev_info(&device->dev, "instrument bound\n");
    return 0;
}

static void instrument_remove(struct platform_device *device)
{
    dev_info(&device->dev, "instrument unbound\n");
}

static struct platform_driver driver = {
    .probe = instrument_probe,
    .remove = instrument_remove,
    .driver = { .name = "lab-instrument", .dev_groups = instrument_groups },
};

static int __init instrument_init(void)
{
    int error = platform_driver_register(&driver);
    if (error)
        return error;
    instrument = platform_device_register_simple("lab-instrument", -1, NULL, 0);
    if (IS_ERR(instrument)) {
        error = PTR_ERR(instrument);
        platform_driver_unregister(&driver);
        return error;
    }
    return 0;
}

static void __exit instrument_exit(void)
{
    platform_device_unregister(instrument);
    platform_driver_unregister(&driver);
}

module_init(instrument_init);
module_exit(instrument_exit);
MODULE_LICENSE("GPL");
MODULE_DESCRIPTION("Synthetic platform device and driver for the Linux driver lab");
