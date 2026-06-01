# Debugging Exercise: Ingress Returns 502/504 While Pods Are Healthy

## Scenario

The application is deployed successfully.

Observed symptoms:

* Ingress returns HTTP 502 or HTTP 504
* Pods are Running
* Readiness and Liveness probes are passing

The objective is to systematically identify where traffic is failing.

---

# Debugging Methodology

I would traverse the request path from the edge to the application.

```text
Client
  ↓
Ingress
  ↓
Service
  ↓
Endpoints
  ↓
Pod
  ↓
Container
```

At each layer I verify whether traffic can proceed to the next hop.

---

# Step 1: Verify Ingress

Check ingress status and configuration.

```bash
kubectl get ingress -A
kubectl describe ingress sample-service -n sample-service
```

Verify:

* Correct ingress class
* Hostname configuration
* Backend service name
* Backend service port

Potential issues:

* Incorrect ingressClassName
* Wrong service reference
* Invalid host configuration

---

# Step 2: Verify Ingress Controller

Ensure the ingress controller itself is healthy.

```bash
kubectl get pods -n ingress-nginx
```

Inspect logs:

```bash
kubectl logs deployment/ingress-nginx-controller -n ingress-nginx
```

Potential issues:

* Controller crash
* Configuration reload failure
* TLS configuration errors

---

# Step 3: Verify Service

Inspect the service.

```bash
kubectl get svc -n sample-service
kubectl describe svc sample-service -n sample-service
```

Verify:

* Service selector
* Port
* TargetPort

Potential issues:

* Wrong selector
* Wrong targetPort
* Service pointing to incorrect port

Example:

```yaml
ports:
  - port: 80
    targetPort: 9090
```

while application listens on:

```text
8080
```

This commonly results in HTTP 502.

---

# Step 4: Verify Endpoints

Check whether Kubernetes attached endpoints to the service.

```bash
kubectl get endpoints sample-service -n sample-service
```

Expected:

```text
10.244.x.x:8080
```

Potential issues:

```text
<none>
```

This indicates:

* Label mismatch
* Selector mismatch

Example:

Deployment:

```yaml
labels:
  app: sample-service
```

Service:

```yaml
selector:
  app: backend
```

The service cannot discover pods.

---

# Step 5: Verify Pod Health

Inspect pods.

```bash
kubectl get pods -n sample-service
```

Check logs:

```bash
kubectl logs <pod-name> -n sample-service
```

Potential issues:

* Application startup failure
* Runtime exception
* Port binding issue

Example:

Application listens on:

```text
3000
```

while Kubernetes expects:

```text
8080
```

---

# Step 6: Verify Internal Connectivity

Launch a temporary debugging pod.

```bash
kubectl run curl \
  --image=curlimages/curl \
  --restart=Never \
  -it \
  --rm \
  -n sample-service \
  -- sh
```

Test service access:

```bash
curl http://sample-service/health
```

If this fails:

Problem exists between:

```text
Service
↓
Pod
```

If this succeeds:

Problem exists before the service.

---

# Step 7: Verify Application Port

Inspect deployment.

```bash
kubectl describe deployment sample-service -n sample-service
```

Verify:

```yaml
containerPort: 8080
```

matches application configuration.

Potential issue:

Application:

```text
Listening on 3000
```

Deployment:

```yaml
containerPort: 8080
```

Ingress returns 502.

---

# Step 8: Verify Network Policies

Inspect network policies.

```bash
kubectl get networkpolicy -A
```

Potential issue:

Ingress controller traffic blocked.

Result:

```text
504 Gateway Timeout
```

because packets never reach the pod.

---

# Step 9: Verify Readiness Probes

Inspect readiness configuration.

```bash
kubectl describe pod <pod>
```

Potential issue:

Readiness endpoint returns:

```text
503
```

Pods appear Running but are not added to service endpoints.

Result:

```text
Ingress → Service → No Ready Backends
```

causing 502 responses.

---

# Common Root Causes

| Root Cause                          | Symptom |
| ----------------------------------- | ------- |
| Wrong targetPort                    | 502     |
| Empty Endpoints                     | 502     |
| Service selector mismatch           | 502     |
| Readiness failures                  | 502     |
| NetworkPolicy blocking traffic      | 504     |
| Ingress backend misconfiguration    | 502     |
| Application listening on wrong port | 502     |
| DNS resolution failure              | 504     |

---

The most common real-world causes are:

* Service selector mismatch
* Incorrect targetPort
* Failed readiness probes
* Network policy/Security group port restrictions 

Once the failing layer is identified, traffic flow can be restored by correcting the configuration and validating connectivity at each hop.
