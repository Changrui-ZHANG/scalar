#!/bin/sh
set -eu

PISTON_URL="${PISTON_URL:-http://piston:2000/api/v2}"
PISTON_NODE_VERSION="${PISTON_NODE_VERSION:-20.11.1}"

echo "Waiting for Piston to be ready at ${PISTON_URL}..."

# Wait up to 60 seconds for Piston API to respond
ready=0
for i in $(seq 1 30); do
  if curl -s -f -m 2 "${PISTON_URL}/runtimes" >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 2
done

if [ "$ready" -ne 1 ]; then
  echo "Error: Piston did not become ready within 60 seconds." >&2
  exit 1
fi

echo "Checking if Node runtime ${PISTON_NODE_VERSION} is installed..."

is_installed() {
  curl -s -f -m 5 "${PISTON_URL}/runtimes" 2>/dev/null | grep -q "\"language\":\"javascript\"" && \
  curl -s -f -m 5 "${PISTON_URL}/runtimes" 2>/dev/null | grep -q "\"version\":\"${PISTON_NODE_VERSION}\""
}

if is_installed; then
  echo "Node runtime ${PISTON_NODE_VERSION} is already installed."
  exit 0
fi

echo "Installing Node runtime ${PISTON_NODE_VERSION}..."
install_response=$(curl -s -f -X POST "${PISTON_URL}/packages" \
  -H "Content-Type: application/json" \
  -d "{\"language\":\"node\",\"version\":\"${PISTON_NODE_VERSION}\"}" 2>&1) || {
    echo "Error: Failed to request installation of Node ${PISTON_NODE_VERSION}: ${install_response}" >&2
    exit 1
}

echo "Waiting for runtime to be available..."
installed=0
for i in $(seq 1 30); do
  if is_installed; then
    installed=1
    break
  fi
  sleep 1
done

if [ "$installed" -eq 1 ]; then
  echo "Node runtime ${PISTON_NODE_VERSION} successfully installed."
  exit 0
else
  echo "Error: Node runtime ${PISTON_NODE_VERSION} could not be confirmed in /runtimes." >&2
  exit 1
fi
