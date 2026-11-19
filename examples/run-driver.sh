#!/bin/sh
set -eu
mode=${1:?choose a driver exercise}
trap 'rmmod lab_device 2>/dev/null || :; rmmod lab_platform 2>/dev/null || :' EXIT
trap 'exit 130' INT TERM
cd /tmp/device-lab
if [ ! -f lab_device.ko ] || [ ! -f lab_platform.ko ] ||
   [ lab_device.c -nt lab_device.ko ] || [ lab_platform.c -nt lab_platform.ko ] ||
   [ lab_abi.h -nt lab_device.ko ] || [ Makefile -nt lab_device.ko ]; then
    echo 'Building modules with the guest kernel build tree…'
    make -s -C "/lib/modules/$(uname -r)/build" M="$PWD" modules
else
    echo 'Using modules built from the current source.'
fi
if [ "$mode" = platform ]; then
    insmod lab_platform.ko
    test -L /sys/bus/platform/devices/lab-instrument/driver
    printf 'bound driver: '
    readlink /sys/bus/platform/devices/lab-instrument/driver
    printf 'sample rate: '
    cat /sys/bus/platform/devices/lab-instrument/rate
    rmmod lab_platform
    test ! -e /sys/bus/platform/devices/lab-instrument
    echo 'platform device removed'
else
    insmod lab_device.ko
    if [ "$mode" = lifecycle ]; then
        test -c /dev/lab0
        ls -l /dev/lab0
        grep '^lab_device ' /proc/modules
    else
        if [ ! -x probe ] || [ probe.c -nt probe ] || [ lab_abi.h -nt probe ]; then
            gcc -std=c11 -Wall -Wextra -Werror -O2 probe.c -o probe
        fi
        ./probe "$mode"
    fi
    rmmod lab_device
    test ! -e /dev/lab0
    echo 'module unloaded and /dev/lab0 removed'
fi
