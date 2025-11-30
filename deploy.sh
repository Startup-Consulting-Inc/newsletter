#!/bin/bash

# Set the project
gcloud config set project newsletter-b104f

# Build and deploy
gcloud builds submit --config cloudbuild.yaml .