#!/bin/sh
set -eu
mode=${1:?choose a driver exercise}
trap 'exec 9>&-; rmmod lab_hello 2>/dev/null || :; rmmod lab_device 2>/dev/null || :; rmmod lab_platform 2>/dev/null || :' EXIT
trap 'exit 130' INT TERM
cd /tmp/device-lab
module_inputs=$(sha256sum lab_device.c lab_platform.c lab_abi.h Makefile lab_hello.c)
if [ ! -f lab_device.ko ] || [ ! -f lab_platform.ko ] || [ ! -f lab_hello.ko ] ||
   [ ! -f .module-inputs ] || [ "$module_inputs" != "$(cat .module-inputs)" ]; then
    echo 'Building modules with the guest kernel build tree…'
    rm -f lab_device.o lab_platform.o lab_hello.o
    make -s -C "/lib/modules/$(uname -r)/build" M="$PWD" modules
    printf '%s\n' "$module_inputs" > .module-inputs
else
    echo 'Using modules built from the current source.'
fi
if [ "$mode" = module ]; then
    insmod lab_hello.ko
    grep '^lab_hello ' /proc/modules
    rmmod lab_hello
    test ! -e /sys/module/lab_hello
    dmesg | grep 'lab_hello:' | tail -2
    echo 'standalone module removed'
elif [ "$mode" = parameters ]; then
    label=guest
    insmod lab_hello.ko "label=$label"
    value=$(cat /sys/module/lab_hello/parameters/label)
    test "$value" = "$label"
    printf 'sysfs label: %s\n' "$value"
    rmmod lab_hello
elif [ "$mode" = init-error ]; then
    label=
    if insmod lab_hello.ko "label=$label"; then
        echo 'initialisation succeeded'
        test -d /sys/module/lab_hello
        rmmod lab_hello
    else
        test -z "$label"
        test ! -d /sys/module/lab_hello
        echo 'initialisation rejected the empty parameter and left no loaded module'
    fi
elif [ "$mode" = platform ]; then
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
    elif [ "$mode" = open-device ]; then
        gcc -std=c11 -Wall -Wextra -Werror /tmp/lesson-input/open-device.c -o open-device
        ./open-device
    elif [ "$mode" = references ]; then
        hold_device_open=1
        if [ "$hold_device_open" -eq 1 ]; then
            exec 9<>/dev/lab0
            if rmmod lab_device 2>/dev/null; then
                echo 'module unexpectedly unloaded with an open descriptor' >&2
                exit 1
            fi
            test -c /dev/lab0
            echo 'unload refused while a descriptor held a module reference'
            exec 9>&-
        else
            echo 'no descriptor held before unload'
        fi
    else
        probe_inputs=$(sha256sum probe.c lab_abi.h)
        if [ ! -x probe ] || [ ! -f .probe-inputs ] || [ "$probe_inputs" != "$(cat .probe-inputs)" ]; then
            gcc -std=c11 -Wall -Wextra -Werror probe.c -o probe.next
            mv probe.next probe
            printf '%s\n' "$probe_inputs" > .probe-inputs
        fi
        ./probe "$mode"
    fi
    rmmod lab_device
    test ! -e /dev/lab0
    echo 'module unloaded and /dev/lab0 removed'
fi
