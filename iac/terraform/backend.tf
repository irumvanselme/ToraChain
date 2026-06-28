terraform {
  required_version = ">= 1.9.0"

  # HCP Terraform (app.terraform.io) remote state.
  # Set TF_CLOUD_ORGANIZATION or replace the placeholder below.
  # Workspace variable TF_VAR_* or workspace-level sensitive vars are the
  # recommended way to supply secrets (auth_secrets, backend_secrets).
  cloud {
    organization = "tora-chain-dev"
    workspaces {
      name = "torachain"
    }
  }

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
}
