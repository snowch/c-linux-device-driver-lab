#!/bin/sh
# Build the starter modules on an x86-64 Linux host with GCC and binutils.
# Pass a directory with the Alpine x86 guest's linux-virt-dev package extracted.
set -eu
root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
kernel_headers=$(realpath "${1:?pass the linux-headers directory}")
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
cp -a "$kernel_headers" "$work/headers"
mkdir "$work/examples"
for name in lab_device.c lab_platform.c lab_abi.h Makefile; do
  cp "$root/examples/$name" "$work/examples/"
done
cd "$work/headers"
cc -O2 -I scripts/include scripts/basic/fixdep.c -o scripts/basic/fixdep
cc -O2 -I scripts/include -I scripts/mod scripts/mod/modpost.c \
  scripts/mod/file2alias.c scripts/mod/sumversion.c scripts/mod/symsearch.c -o scripts/mod/modpost
# The guest's GCC plugin is an i386 shared object. The shipped modules do
# not rely on its entropy instrumentation, and the x86-64 host cannot load it.
make ARCH=x86 GCC_PLUGINS_CFLAGS= M="$work/examples" modules
mkdir -p "$root/runtime/files/starter"
for name in lab_device lab_platform; do
  strip --strip-debug "$work/examples/$name.ko" -o "$root/runtime/files/starter/$name.ko"
done
