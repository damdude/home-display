#!/bin/bash -e
# Standard pi-gen stage bootstrap: start this stage's rootfs from the previous
# stage's output (stage2 / Lite) rather than from scratch.
if [ ! -d "${ROOTFS_DIR}" ]; then
  copy_previous
fi
