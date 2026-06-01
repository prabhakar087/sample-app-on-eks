# Sample Service on Kubernetes (EKS Ready) with GitOps, CI/CD & Observability

## Overview

This project demonstrates onboarding a production-ready Node.js microservice into a Kubernetes platform using modern DevOps practices.

The implementation is designed to:

* Run locally on Kind for development and validation
* Deploy to Amazon EKS with minimal configuration changes
* Follow GitOps principles using ArgoCD
* Provide observability through Prometheus and Grafana
* Support secure and scalable deployment patterns

The goal is not only to deploy an application, but to demonstrate how a service would be managed in a real production environment.

---

# Architecture

```text
                    ┌────────────────────┐
                    │     Developer      │
                    └──────────┬─────────┘
                               │
                               ▼
                    ┌────────────────────┐
                    │     GitHub Repo    │
                    └──────────┬─────────┘
                               │
                               ▼
                 ┌──────────────────────────┐
                 │     GitHub Actions       │
                 │                          │
                 │ - Test                   │
                 │ - Build Image            │
                 │ - Trivy Scan             │
                 │ - Push to ECR/GHCR           │
                 │ - Update Helm Values     │
                 └──────────┬───────────────┘
                            │
                            ▼
                 ┌──────────────────────────┐
                 │        ArgoCD            │
                 │      (GitOps)            │
                 └──────────┬───────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────────┐
        │                 Kubernetes                │
        │                                           │
        │                  Ingress                  │
        │                    │                      │
        │                    ▼                      │
        │                  Service                  │
        │                    │                      │
        │                    ▼                      │
        │                 Deployment                │
        │                    │                      │
        │                    ▼                      │
        │                  Pods                     │
        └───────────────────────────────────────────┘
                            │
                            ▼
         ┌─────────────────────────────────────┐
         │         Observability Stack         │
         │                                     │
         │  Prometheus -> Grafana -> Alerts    │
         └─────────────────────────────────────┘
```

---

# Repository Structure

```text
.
├── app/
│   ├── app.js
│   ├── package.json
│   ├── package-lock.json
│   ├── Dockerfile
│   └── tests/
│
├── helm/
│   └── sample-service/
│       ├── Chart.yaml
│       ├── values.yaml
│       ├── values-kind.yaml
│       ├── values-dev.yaml
│       ├── values-prod.yaml
│       └── templates/
│
├── gitops/
│   ├── bootstrap/
│   │   └── root-app.yaml
│   │
│   ├─────  kind/
│   │   ├── dev/
│   │   └── prod/
│   │
│   └── applications/
│
├── observability/
│   ├── servicemonitors/
│   ├── grafana/
│   ├── alerts/
│   └── runbooks/
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── release.yml
│
└── README.md
```

---

# Component Breakdown

## Application

The sample application is a lightweight Node.js HTTP service.

Endpoints:

| Endpoint | Purpose            |
| -------- | ------------------ |
| /        | Service Info       |
| /health  | Liveness Probe     |
| /ready   | Readiness Probe    |
| /metrics | Prometheus Metrics |

The application exposes Prometheus metrics using `prom-client`.

---

## Containerization

The application is packaged as a Docker container.

Key considerations:

* Multi-stage build ready
* Non-root user support
* Minimal attack surface
* Predictable startup behavior

The same image can run on:

* Kind
* EKS
* Any CNCF-compliant Kubernetes distribution

---

# Kubernetes Deployment

The service is deployed using Helm.

Features:

* Configurable environments
* Health probes
* Resource requests and limits
* Rolling updates
* HPA support
* PDB support

Deployment Strategy:

```text
RollingUpdate
```

Reason:

Rolling updates provide zero-downtime deployments while keeping implementation simple.

Canary deployments are identified as a future enhancement.

---

# CI/CD Pipeline

GitHub Actions is used for CI/CD.

Pipeline stages:

```text
Code Commit
    ↓
Unit Tests
    ↓
Docker Build
    ↓
Trivy Security Scan
    ↓
Push Image (GHCR)
    ↓
Update Helm Values
    ↓
ArgoCD Sync
```

---

## Image Tagging Strategy

Images are tagged using Git commit SHA.

Example:

```text
ghcr.io/org/sample-service:a3f2d9c
```

Benefits:

* Immutable deployments
* Easy rollbacks
* Complete traceability

---

# GitOps Design

The repository follows GitOps principles.

ArgoCD continuously reconciles the cluster state with Git.

```text
Git = Source of Truth
```

Benefits:

* Auditable deployments
* Repeatability
* Fast rollback
* Drift detection

---

# Environment Strategy

Separate values files are maintained for:

```text
Kind
Dev
Prod
```

Example:

values-kind.yaml

```yaml
image:
  repository: sample-service
  tag: local
```

values-prod.yaml

```yaml
image:
  repository: ghcr.io/org/sample-service
  tag: latest
```

This allows the same chart to run locally and on EKS without modification.

---

# Observability

The platform includes:

## Metrics

Prometheus metrics exposed through:

```text
/metrics
```

Key Metrics:

* http_requests_total
* http_request_duration_seconds
* process_cpu_seconds_total
* nodejs_heap_size_total_bytes

---

## Monitoring

Prometheus Operator discovers the application using a ServiceMonitor.

```text
Application
    ↓
ServiceMonitor
    ↓
Prometheus
```

---

## Dashboard

Grafana dashboard includes:

* Request Rate
* P95 Latency
* CPU Usage
* Memory Usage

---


```

---

# Debugging Methodology

A structured troubleshooting workflow was implemented.

Traffic flow is validated layer by layer:

```text
Ingress
   ↓
Service
   ↓
Endpoints
   ↓
Pod
   ↓
Application
```

Common failure scenarios investigated:

* Service selector mismatch
* Wrong targetPort
* Empty Endpoints
* Failed readiness probes
* Network Policy restrictions
* Ingress misconfiguration

A dedicated runbook is included under:

```text
observability/runbooks/
```

---

# Security Considerations

## Container Security

* Trivy image scanning
* Minimal image footprint
* Non-root execution (future enhancement)

---

## Secrets Management

External Secrets Operator supported.

Local environments:

```text
Disabled
```

Production:

```text
AWS Secrets Manager
```

---

## Access Control

Recommended:

* Namespace scoped RBAC
* Least privilege permissions
* Dedicated Service Accounts

---

## Network Isolation

Future production implementation:

* Default deny NetworkPolicies
* Explicit ingress/egress rules

---

## Supply Chain Security

Future enhancements:

* Cosign image signing
* SBOM generation
* Admission control policies

---

# Running Locally

## Create Cluster

```bash
kind create cluster --name devops-assignment
```

---

## Install ArgoCD

```bash
kubectl create namespace argocd

kubectl apply -n argocd \
-f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

---

## Deploy Application

```bash
helm upgrade --install sample-service \
helm/sample-service \
-f helm/sample-service/values-kind.yaml \
-n sample-service \
--create-namespace
```

---

## Install Monitoring Stack

```bash
helm upgrade --install monitoring \
prometheus-community/kube-prometheus-stack \
-n monitoring \
--create-namespace
```

---

# Tradeoffs & Design Decisions

## Helm vs Raw Manifests

Chosen:

```text
Helm
```

Reason:

* Reusability
* Environment-specific values
* Easier maintenance

---

## Rolling Updates vs Canary

Chosen:

```text
Rolling Updates
```

Reason:

* Simpler operational model
* Lower complexity

Future:

```text
Argo Rollouts Canary Deployments
```

---

## Kind vs EKS

Chosen:

```text
Kind for local validation
```

Reason:

* Fast iteration
* No cloud dependency

The same Helm chart is EKS-compatible.

---

# Future Enhancements

## Progressive Delivery

Implement:

* Argo Rollouts
* Canary Deployments
* Automated Analysis

---

## OpenTelemetry

Add:

```text
NodeJS
   ↓
OTEL Collector
   ↓
Grafana Tempo
```

for distributed tracing.

---

## Security

Add:

* Cosign Image Signing
* Kyverno Policies
* OPA Gatekeeper
* DAST Scans using OWASP ZAP & Burp suite
* Local artifact Store to prevent supply chain attacks.

---

## Reliability

Add:

* Multi-AZ EKS Deployment
* Cluster Autoscaler
* Karpenter

---

