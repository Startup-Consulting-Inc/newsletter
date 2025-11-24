#!/bin/bash

# Set the project
gcloud config set project clearly-478614

# Build and deploy
gcloud builds submit --config cloudbuild.yaml .