# Kubernetes (K8s) Основы

## Архитектура Kubernetes

На высоком уровне Kubernetes следует клиент-серверной архитектуре.

**Cluster:** Набор узлов (физических или виртуальных машин), на которых запускаются контейнеризированные приложения, управляемые Kubernetes.

**Control Plane (Master-узлы):** Координирует все действия в вашем кластере, такие как планирование приложений, поддержание желаемого состояния приложений, масштабирование приложений и развёртывание новых обновлений.

**Worker Nodes:** Запускают приложения и рабочие нагрузки.

---

## Манифесты

Манифесты — это конфигурационные файлы в формате YAML или JSON, которые определяют желаемое состояние объектов в вашем кластере (например, подов, деплойментов, сервисов). Они являются основой декларативной модели Kubernetes.

---

## Основные объекты манифестов

### Pod (Под)

Наименьшая развёртываемая единица в Kubernetes.

**Почему Kubernetes использует Pod как наименьшую развёртываемую единицу, а не отдельный контейнер?**

Контейнер — это уже существующая сущность, обозначающая конкретную вещь, например Docker-контейнер. Для управления контейнером Kubernetes необходима дополнительная информация, такая как restart policy или live probe. Вместо того чтобы перегружать существующую сущность дополнительными свойствами, архитекторы Kubernetes решили использовать новую сущность — **Pod** — которая логически содержит (оборачивает) один или несколько контейнеров, управляемых как единое целое.

**Почему Kubernetes позволяет размещать более одного контейнера в Pod?**

Контейнеры в Pod работают на «логическом хосте»: они используют одно и то же сетевое пространство имён (один и тот же IP-адрес и пространство портов), пространство имён IPC и, опционально, могут использовать общие тома (volumes). Таким образом, эти контейнеры могут эффективно взаимодействовать, обеспечивая локальность данных. Кроме того, Pod позволяют управлять несколькими тесно связанными контейнерами приложений как единым целым.

**Примеры использования мультиконтейнерных Pod'ов:**

- **Sidecar-контейнеры** «помогают» основному контейнеру. Например, наблюдатели за логами или изменениями данных, адаптеры мониторинга и т.д.
- **Прокси, мосты, адаптеры** соединяют основной контейнер с внешним миром. Например, Apache HTTP-сервер или nginx могут раздавать статические файлы и выступать в качестве обратного прокси для веб-приложения в основном контейнере, логировать и ограничивать HTTP-запросы.

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

---

### Deployment (Деплоймент)

Обеспечивает декларативные обновления для Pod'ов и ReplicaSet'ов.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-deployment
spec:
  replicas: 3
  # Selector
  # Что делает: Говорит контроллеру (Deployment), какие поды ему принадлежат.
  # «Я управляю всеми подами, у которых есть лейбл app: my-app»
  selector:
    matchLabels:
      app: my-app
  template:
    # Metadata
    # Каждый под, созданный этим Deployment'ом, получит лейбл app: my-app.
    metadata:
      labels:
        app: my-app
    spec:
      containers:
      - name: my-app-container
        image: my-app-image:1.0
```

---

### Service (Сервис)

Абстракция, определяющая логический набор Pod'ов и политику доступа к ним.

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

---

### Pod vs Deployment vs Service

**Pod** — минимальная единица в Kubernetes. Это один запущенный экземпляр приложения (один или несколько контейнеров). Если под умирает, никто его автоматически не восстановит.

**Deployment** — контроллер, который управляет подами. Он следит за тем, чтобы нужное количество подов всегда работало: если под упал — создаёт новый, если нужно обновить версию — делает это плавно с возможностью отката.

**Service** — сетевая абстракция, дающая стабильную точку доступа к группе подов. Поды постоянно создаются и умирают, их IP меняются, а Service предоставляет постоянный адрес и балансирует трафик между живыми подами.

**Если коротко:** Pod — это работник, Deployment — менеджер, следящий за работниками, Service — единый телефон, по которому можно до них дозвониться.

---

### ConfigMap и Secret

Используются для передачи конфигурационных данных или конфиденциальной информации в Pod'ы.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-config
data:
  # Ключи в виде свойств; каждый ключ соответствует простому значению
  some_info: "1"
  another_info: "2"

  # Ключи в виде файлов
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
  # Примечание: Сериализованные JSON и YAML значения данных Secret кодируются в строки base64.
  username: YWRtaW4=
  password: MWYyZDFlMmU2N2Rm
```

---

### Ingress (Ингресс)

Управляет маршрутизацией определённого трафика.

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

---

## Основные команды

Kubernetes управляется через инструмент командной строки `kubectl`.

### Взаимодействие с кластером

**Проверить информацию о кластере:**

```shell
kubectl cluster-info
```

**Просмотреть узлы кластера:**

```shell
kubectl get nodes
```

### Управление объектами

**Применить манифест:**

```shell
kubectl apply -f manifest.yaml
```

**Удалить объект:**

```shell
kubectl delete -f manifest.yaml
```

**Получить список Pod'ов:**

```shell
kubectl get pods
```

**Описать Pod:**

```shell
kubectl describe pod <имя-пода>
```

**Получить подробную информацию о Pod'е:**

```shell
kubectl get pod <имя-пода> -o yaml
```

### Логи и отладка

**Просмотреть логи Pod'а:**

```shell
kubectl logs <имя-пода>
```

**Выполнить команду внутри контейнера:**

```shell
kubectl exec -it <имя-пода> -- /bin/bash
```

### Масштабирование и обновления

**Масштабировать Deployment:**

```shell
kubectl scale deployment <имя-деплоймента> --replicas=5
```

**Развернуть обновление:**

```shell
kubectl set image deployment/<имя-деплоймента> <имя-контейнера>=<новый-образ>
```

---

## Дополнительные советы

**Пространства имён (Namespaces):** Логическое разделение ресурсов.

```shell
kubectl get pods --namespace=<пространство-имён>
```

**Метки и селекторы (Labels & Selectors):** Используйте метки для маркировки ресурсов, которые затем можно выбирать и группировать.

```yaml
metadata:
  labels:
    app: my-app
```

**Лимиты ресурсов:** Запросы и лимиты ресурсов для контейнеров.

```yaml
resources:
  requests:
    memory: "64Mi"
    cpu: "250m"
  limits:
    memory: "128Mi"
    cpu: "500m"
```

**Конфигурации:** Используйте ConfigMap и Secret для конфигурации приложений.

**Персистентность:** Используйте PersistentVolume и PersistentVolumeClaim для управления хранилищем.

---

## Дополнительные материалы

- **Документация Kubernetes:** [https://kubernetes.io/docs/home/](https://kubernetes.io/docs/home/)
- **Руководство по основам Kubernetes:** [https://kubernetes.io/docs/tutorials/kubernetes-basics/](https://kubernetes.io/docs/tutorials/kubernetes-basics/)
- **Интерактивная среда обучения:** Katacoda Kubernetes Tutorials