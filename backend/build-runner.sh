#!/usr/bin/env bash
echo "======================================================="
echo "Building Vignan Mastery Multi-Language Docker Runner..."
echo "Supports: C, C++, Java, Python, JavaScript"
echo "======================================================="

docker build -f Dockerfile.runner -t vignan-mastery-runner .

if [ $? -eq 0 ]; then
    echo ""
    echo "======================================================="
    echo "[SUCCESS] vignan-mastery-runner image built successfully!"
    echo "======================================================="
else
    echo ""
    echo "======================================================="
    echo "[ERROR] Docker build failed. Please ensure Docker daemon is running."
    echo "======================================================="
fi
