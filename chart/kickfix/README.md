# kickfix chart

## Secrets

`JWT_SECRET` is **not** rendered into the GitOps manifest. The backend reads it
through a `secretKeyRef` pointing at the Secret named by
`backend.secret.name` (default `kickfix-backend-secrets`).

Because the Secret is never part of the manifest that ArgoCD applies, ArgoCD
does not track it: an automated sync cannot overwrite its value, and
`prune: true` cannot delete it. The `IgnoreExtraneous` annotation keeps it from
being reported as out-of-sync.

### Creating or rotating the Secret

```bash
kubectl -n kickfix create secret generic kickfix-backend-secrets \
  --from-literal=JWT_SECRET="$(openssl rand -hex 48)" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl -n kickfix annotate secret kickfix-backend-secrets \
  argocd.argoproj.io/compare-options=IgnoreExtraneous --overwrite

kubectl -n kickfix rollout restart deployment/release-name-backend
```

Rotating the value invalidates every issued JWT, so all users are signed out.

The Secret must exist **before** the backend rolls out — the pod will not start
without it, and `NODE_ENV=production` makes the app refuse to boot on a missing
or empty `JWT_SECRET` rather than fall back to a default.

### Standalone `helm install`

For a non-GitOps install the chart can create the Secret itself:

```bash
helm install kickfix chart/kickfix \
  --set backend.secret.create=true \
  --set backend.secret.jwtSecret="$(openssl rand -hex 48)"
```

## Rollout strategy

The backend uses `strategy: Recreate`. Its uploads PVC is ReadWriteOnce, so a
rolling update deadlocks whenever the replacement pod is scheduled onto a
different node than the pod still holding the volume.
