# Kubernetes (K8s) Basics

## Kubernetes Architecture

At a high level, Kubernetes follows a client-server architecture.

- Cluster: A set of nodes (physical or virtual machines) that run containerized applications managed by Kubernetes.
- Control Plane (Master Nodes): Coordinates all activities in your cluster, such as scheduling applications, maintaining desired application states, scaling applications, and rolling out new updates.
- Worker Nodes: Run the applications and workloads.

## Manifests

Manifests are configuration files in YAML or JSON format that define the desired state of objects in your cluster (e.g., pods, deployments, services). They are central to Kubernetes' declarative model.

### Common Manifest Objects

- Pod: The smallest deployable units in Kubernetes.

#### Why does Kubernetes use a Pod as the smallest deployable unit and not a single container? 
A container is the existing entity, which denotes a specific thing, for example a Docker container. To manage a container, Kubernetes needs additional information, such as restart policy or live probe. Instead of overloading the existing thing with additional properties, Kubernetes architects have decided to use a new entity - Pod - that logically contains (wraps) one or more containers, which should be managed as a single entity.

#### Why does Kubernetes allow more than one container in a Pod? 
Containers in a Pod runs on a "logical host": they use the same network namespace (same IP address and port space), IPC namespace and, optionally, they can use shared volumes. Therefore, these containers can efficiently communicate, ensuring data locality. Also, Pods allow managing several tightly coupled application containers as a single unit.

### Use Cases for Multi-Container Pods

* Sidecar containers "help" the main container. For example, log or data change watchers, monitoring adapters, and so on.
* Proxies, bridges, adapters connect the main container with the external world. For example, Apache HTTP server or nginx can serve static files and act as a reverse proxy to a web application in the main container to log and limit HTTP request.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-pod
spec:
  containers:
    - name: nginx
      image: nginx:latest
      ports:
        - containerPort: 80
```

- Deployment: Provides declarative updates for Pods and ReplicaSets.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
name: my-deployment
spec:
replicas: 3
selector:
    matchLabels:
    app: my-app
template:
    metadata:
    labels:
        app: my-app
    spec:
    containers:
        - name: my-app-container
        image: my-app-image:1.0
```

- Service: An abstraction which defines a logical set of Pods and a policy by which to access them.

```yaml
apiVersion: v1
kind: Service
metadata:
name: my-service
spec:
selector:
    app: my-app
ports:
    - protocol: TCP
    port: 80
    targetPort: 8080
type: LoadBalancer
```

- Pod vs Deployment vs Service

**Pod** is the minimum unit in Kubernetes. This is a single running instance of the application (one or more containers). If the pod dies, no one will automatically restore it.

**Deployment** is the controller that manages the pods. He makes sure that the required number of pods always works: if a pod has fallen, he creates a new one, if you need to update the version, he does it smoothly with the possibility of rollback.

**Service** is a network abstraction that provides a stable access point to a group of pods. Pods are constantly being created and dying, their IP addresses are changing, and the Service provides a permanent address and balances traffic between live pods.

**In short:** Pod is an employee, Deployment is a manager who monitors employees, and Service is a single phone number that can be used to reach them.

- ConfigMap and Secret: Used to pass configuration data or sensitive information to Pods.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-config
data:
  # property-like keys; each key maps to a simple value
  some_info: "1"
  another_info: "2"

  # file-like keys
  server.properties: |
    worker.types="something"
    worker.maximum="something2"
```

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: mysecret
type: Opaque
data:
  # Note: The serialized JSON and YAML values of Secret data are encoded as base64 strings.
  username: YWRtaW4=
  password: MWYyZDFlMmU2N2Rm
```

- Ingress: Manages the routing for specific traffic

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /$1
spec:
  ingressClassName: public
  rules:
    - http:
        paths:
          - path: /some_path/(.*)
            pathType: ImplementationSpecific
            backend:
              service:
                name: my-service
                port:
                  number: xxxx
```

## Common commands

Kubernetes is operated via the kubectl command-line tool.

### Cluster Interaction

- Check cluster info

```shell
kubectl cluster-info
```

- View nodes in the cluster

```shell
kubectl get nodes
```

### Managing Objects

- Apply a manifest

```shell
kubectl apply -f manifest.yaml
```

- Delete an object

```shell
kubectl delete -f manifest.yaml
```

- Get list of Pods

```shell
kubectl get pods
```

- Describe a Pod

```shell
kubectl describe pod <pod-name>
```

- Get detailed Pod information

```shell
kubectl get pod <pod-name> -o yaml
```

### Logs and Debugging

- View logs of a Pod

```shell
kubectl logs <pod-name>
```

- Execute a command in a container

```shell
kubectl exec -it <pod-name> -- /bin/bash
```

### Scaling and Updates

- Scale a Deployment

```shell
kubectl scale deployment <deployment-name> --replicas=5
```

- Roll out an update

```shell
kubectl set image deployment/<deployment-name> <container-name>=<new-image>
```

## Additional Tips

- Namespaces: Logically separate resources.

```shell
kubectl get pods --namespace=<namespace>
```

- Labels and Selectors: Use labels to tag your resources, which can be selected and grouped.

```yaml
metadata:
labels:
    app: my-app
```

- Resource Limits: Resource requests and limits for containers.

```yaml
resources:
requests:
    memory: "64Mi"
    cpu: "250m"
limits:
    memory: "128Mi"
    cpu: "500m"
```

- Configurations: Use ConfigMaps and Secrets for application configurations.

- Persistence: Use PersistentVolume and PersistentVolumeClaim to manage storage.

---

## Further Reading

- Kubernetes Documentation: https://kubernetes.io/docs/home/
- Kubernetes Basics Tutorial: https://kubernetes.io/docs/tutorials/kubernetes-basics/
- Interactive Learning Environment: Katacoda Kubernetes Tutorials
