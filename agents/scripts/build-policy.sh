#!/usr/bin/env bash
# Compile the Rego policy to WebAssembly so the agent runtime can evaluate it
# inline without shelling out to the `opa` binary at runtime.
#
# Build once after cloning or whenever policies/ changes. Output lives in dist/.

set -euo pipefail

cd "$(dirname "$0")/.."
POLICY_DIR="../guardrails/policies"
ENTRYPOINT="campminder/guardrails/agent_actions/decision"

if ! command -v opa >/dev/null 2>&1; then
  echo "error: opa is not installed. Install via 'brew install opa'." >&2
  exit 1
fi

mkdir -p dist
opa build -t wasm \
  -e "${ENTRYPOINT}" \
  "${POLICY_DIR}" \
  -o dist/bundle.tar.gz >/dev/null

tar -xzf dist/bundle.tar.gz -C dist/ /policy.wasm /data.json 2>/dev/null
rm dist/bundle.tar.gz

echo "built $(pwd)/dist/policy.wasm + data.json (entrypoint: ${ENTRYPOINT})"
