# API

API dedicated to simplify the usage of image creation with Obsidian AI.

This is runnable locally or in Google Cloud Run (optionally behind a Firebase Hosting configuration).

Please refer to [the main Makefile](../Makefile) for the available commands.

If you are looking for an API key for [stabiblity.ai](https://stability.ai) (stable diffusion) image generation, please head to [https://beta.dreamstudio.ai/membership](https://beta.dreamstudio.ai/membership).

## Cloud Run configuration

### Setup

```bash
# login to gcloud
gcloud auth login

PROJECT_ID=$(gcloud config get-value project)

# Enable container registry
gcloud services enable containerregistry.googleapis.com

# Enable Cloud Run
gcloud services enable run.googleapis.com

# Enable Secret Manager
gcloud services enable secretmanager.googleapis.com

# login to firebase
firebase login

# add firebase project
firebase projects:addfirebase ${PROJECT_ID}

# add target
firebase target:apply hosting api ${PROJECT_ID}

# create a secret for the stability key
gcloud secrets create STABILITY_KEY --replication-policy=automatic

# add a version to the secret (from https://beta.dreamstudio.ai/membership)
STABILITY_KEY="foo"
echo -n "${STABILITY_KEY}" | gcloud secrets versions add STABILITY_KEY --data-file=-
```

### Manual deployment

```bash
# add cloud run to firebase
make api/hosting

# create a service account for the cloud run runtime
gcloud iam service-accounts create obsidian-ai-cloud-run \
  --display-name "Obsidian AI Cloud Run"

# get the service account email
RUNTIME_SVC="obsidian-ai-cloud-run@${PROJECT_ID}.iam.gserviceaccount.com"

# give the service account access to the secret
gcloud secrets add-iam-policy-binding STABILITY_KEY \
  --member serviceAccount:${RUNTIME_SVC} \
  --role roles/secretmanager.secretAccessor

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member serviceAccount:${RUNTIME_SVC} \
  --role roles/secretmanager.secretAccessor

make api/docker/deploy
# allow unauthenticated access
make api/policy

curl -X POST "https://${PROJECT_ID}.web.app/v1/image/create" -H "Content-Type: application/json" -d '{"size":512,"limit":1,"prompt":"A group of Giraffes visiting a zoo on mars populated by humans"}' > giraffes.jpg
```

### Automatic deployment through GitHub Actions

```bash

# create service account for pushing containers to gcr
# and deploying to cloud run
gcloud iam service-accounts create cloud-run-deployer \
  --display-name "Cloud Run deployer"

# Grant the appropriate Cloud Run role
# to the service account to provide repository access
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member serviceAccount:cloud-run-deployer@${PROJECT_ID}.iam.gserviceaccount.com \
  --role roles/run.admin

# Grant the appropriate Cloud Storage role
# to the service account to provide registry access
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member serviceAccount:cloud-run-deployer@${PROJECT_ID}.iam.gserviceaccount.com \
  --role roles/storage.admin

# Service Account User
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member serviceAccount:cloud-run-deployer@${PROJECT_ID}.iam.gserviceaccount.com \
  --role roles/iam.serviceAccountUser

# get svc key
KEY_PATH="obsidian-ai.cloud-run-deployer.svc.prod.json"
gcloud iam service-accounts keys create ${KEY_PATH} \
  --iam-account=cloud-run-deployer@${PROJECT_ID}.iam.gserviceaccount.com
cat ${KEY_PATH}
# copy the key to GitHub secrets as `GCP_SA_KEY_PROD`
rm -rf ${KEY_PATH}
```