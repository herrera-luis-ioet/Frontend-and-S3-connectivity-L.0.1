#!/bin/bash
cd /home/kavia/workspace/Frontend-and-S3-connectivity-L.0.1/image-upload-gallery

# 1.) Run the linter on the files or directories passed as arguments
npx eslint --fix "$@"
ESLINT_EXIT_CODE=$?

# 2.) Test the packaging of the application
npm run build
BUILD_EXIT_CODE=$?

# Exit with error if either command failed
if [ $ESLINT_EXIT_CODE -ne 0 ] || [ $BUILD_EXIT_CODE -ne 0 ]; then
   exit 1
fi