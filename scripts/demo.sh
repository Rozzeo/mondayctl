#!/usr/bin/env bash
# Scripted demo for the README GIF. Simulates typing, runs real commands
# against the live demo board. Record with:
#   asciinema rec -c "bash scripts/demo.sh" demo.cast --overwrite

set -euo pipefail
export PATH="$HOME/.local/bin:$PATH"

BOARD=5098331146
PGVECTOR_ITEM=2986898829

type_cmd() {
  printf '\033[1;32m$\033[0m '
  for ((i = 0; i < ${#1}; i++)); do
    printf '%s' "${1:i:1}"
    sleep 0.025
  done
  printf '\n'
  sleep 0.3
}

run() {
  type_cmd "$1"
  eval "$1"
  sleep 1.6
}

sleep 0.5
run "mondayctl items $BOARD"
run "mondayctl create $BOARD \"Ship v0.2 with delete command\" -c color_mm47xp7f='{\"label\":\"Working on it\"}'"
run "mondayctl update $BOARD $PGVECTOR_ITEM -c color_mm47xp7f='{\"label\":\"Done\"}'"
run "mondayctl items $BOARD -s ship"
type_cmd "# works for humans, scripts, and AI agents — every command speaks --json"
sleep 2.5
