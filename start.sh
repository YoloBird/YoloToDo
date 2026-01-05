#!/bin/bash

# Find node executable
NODE_PATH=$(which node 2>/dev/null || which nodejs 2>/dev/null || echo "")

if [ -z "$NODE_PATH" ]; then
    # Try to use npm's node
    echo "Node.js not found in PATH, trying npm's node..."
    npm exec -- node server/server.js
else
    echo "Starting server with $NODE_PATH..."
    $NODE_PATH server/server.js
fi
