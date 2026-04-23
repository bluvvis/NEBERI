# To install GitLab Runner from the Helm chart:

Source: https://docs.gitlab.com/runner/install/kubernetes/

* Add the GitLab Helm repository:

```shell
helm repo add gitlab https://charts.gitlab.io
```

* Get the values.yaml file
https://gitlab.com/gitlab-org/charts/gitlab-runner/blob/main/values.yaml

* Setup values

For GitLab Runner to run properly, you must set these values in your configuration file:

- gitlabUrl: The full URL of the GitLab server (like https://gitlab.example.com) to register the runner against.

- runnerToken: The authentication token obtained when you create a runner in the GitLab UI.

- rbac:
    create: true
    rules:
    - resources: ["configmaps", "pods", "pods/attach", "secrets", "services"]
      verbs: ["get", "list", "watch", "create", "patch", "update", "delete"]
    - apiGroups: [""]
      resources: ["pods/exec"]
      verbs: ["create", "patch", "delete"]

- resources: Configure resource requests and limits. (Uncomment the section)

- runners: Configuration for the Pods that the runner launches for each new job
    config: |
        [[runners]]
        [runners.kubernetes]
            namespace = "{{.Release.Namespace}}"
            image = "alpine"
            cpu_request = "100m"
            cpu_request_overwrite_max_allowed = "200m"
            cpu_limit = "250m"
            cpu_limit_overwrite_max_allowed = "500m"
            memory_request = "128Mi"
            memory_request_overwrite_max_allowed = "256Mi"
            memory_limit = "256Mi"
            memory_limit_overwrite_max_allowed = "512Mi"
            helper_image = "gitlab/gitlab-runner-helper:x86_64-v13.12.0"
            helper_cpu_request = "100m"
            helper_cpu_limit = "300m"
            helper_memory_request = "128Mi"
            helper_memory_limit = "256Mi"
            service_cpu_request = "100m"
            service_cpu_limit = "300m"
            service_memory_request = "128Mi"
            service_memory_limit = "256Mi"

# Install helm chart

```shell
helm install gitlab-runner -f values.yaml gitlab/gitlab-runner
```
