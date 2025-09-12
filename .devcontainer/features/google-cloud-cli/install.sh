#!/bin/bash
set -e

echo "Installing google cloud cli and firestore emulator..."
apt-get update
apt-get install apt-transport-https ca-certificates gnupg curl --no-install-recommends --no-install-suggests -y
curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg
echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
apt-get update
apt-get install google-cloud-cli google-cloud-cli-firestore-emulator --no-install-recommends --no-install-suggests -y
apt-get autoclean
rm -rf /var/lib/apt/lists/*
echo "google cloud cli and firestore emulator installed."
