#ifndef LAB_ABI_H
#define LAB_ABI_H

#include <linux/ioctl.h>
#include <linux/types.h>

struct lab_info {
    __u32 capacity;
    __u32 queued;
};

#define LAB_GET_INFO _IOR('L', 0, struct lab_info)
#define LAB_RESET _IO('L', 1)
#define LAB_SCHEDULE _IO('L', 2)

#endif
