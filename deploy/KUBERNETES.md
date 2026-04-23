# Kubernetes и NeBeri

## Кластер команды 11 (microk8s)

Файл **`deploy/kubeconfig-team-11.yaml`** задаёт контекст `team-11-context` и namespace по умолчанию **`team-11-ns`**. В корне репозитория путь к нему добавлен в **`.gitignore`**: при новом клоне положите выданный курсом kubeconfig снова в `deploy/` (или в любое место и укажите путь в `KUBECONFIG`). Токен ServiceAccount не публикуйте в открытый git и чаты; при утечке перевыпустите учётку.

**Проверка доступа** (из корня репозитория, PowerShell):

```powershell
$env:KUBECONFIG = (Resolve-Path ".\deploy\kubeconfig-team-11.yaml").Path
kubectl config current-context
kubectl get ns
kubectl get pods -n team-11-ns
```

**Helm (dry-run)** — убедиться, что чарт рендерится:

```powershell
helm lint .\deploy\helm\neberi
helm template neberi .\deploy\helm\neberi -n team-11-ns --debug > $null
```

**Установка / обновление** в namespace команды:

```powershell
# только внутренний / neberi.local (без публичного DNS)
helm upgrade --install neberi .\deploy\helm\neberi -n team-11-ns --create-namespace -f .\deploy\helm\neberi\values.yaml

# публичный HTTP по nip.io + IngressClass public (см. values-public.yaml — поправьте IP в имени хоста)
helm upgrade --install neberi .\deploy\helm\neberi -n team-11-ns --create-namespace `
  -f .\deploy\helm\neberi\values.yaml `
  -f .\deploy\helm\neberi\values-public.yaml
```

Образы **`neberi/api`** и **`neberi/web`** должны существовать на нодах (`docker compose build` → push в registry курса **или** `docker save` + импорт образов на сервер microk8s — уточните у преподавателя). При необходимости задайте `api.ingestApiKey` в отдельном `-f values-secrets.yaml` (не коммитьте).

**Смоук-тест (при настройке):** `kubectl` до API кластера, `helm lint deploy/helm/neberi` без ошибок; в `team-11-ns` до `helm upgrade --install` подов нет — ожидаемо.

### Что уже настроено в репозитории (чтобы «просто задеплоить»)

| Проблема в кластере | Решение в чарте |
|---------------------|-----------------|
| Нет StorageClass в namespace → PVC `Pending` | В **`values-public.yaml`**: `postgres.persistence.enabled: false` (emptyDir; для проды попросите StorageClass у админов). |
| ResourceQuota требует limits у **каждого** контейнера | У init-контейнера `wait-for-pg` в **`deployment-api.yaml`** заданы `resources` (requests/limits). |
| Образы `neberi/api` и `neberi/web` не существуют в Docker Hub | Workflow **`.github/workflows/build-push-images.yml`**: пуш в **`ghcr.io/<ваш-github-login>/neberi-api`** и **`neberi-web`** (после первого прогона сделайте пакеты **Public** в GitHub Packages, иначе кластеру понадобится `imagePullSecrets`). |
| Скрипт деплоя | **`deploy/scripts/Deploy-Team11.ps1`** — после публикации образов: `.\deploy\scripts\Deploy-Team11.ps1 -GhcrOwner "вашlogin"` (или `-ApiImage`/`-WebImage` вручную). |

Релиз **neberi** в `team-11-ns` уже применён через Helm (ревизия с исправлениями); поды **api/web** останутся в `ImagePullBackOff`, пока в registry не появятся ваши образы — это ожидаемо с текущей среды без пуша.

## Как другие пользователи заходят на сервис после деплоя

**Важно:** Helm кладёт приложение **в кластер**. Чтобы «любой из интернета» открыл сайт, нужны **публичный IP (или DNS)** до порта **80/443** на ноде с Ingress и **имя хоста в браузере**, совпадающее с `ingress.host` в вашем Ingress.

### Как устроен учебный microk8s (типично)

- Контроллер **ingress-nginx** часто слушает **80 и 443 на самой ноде** (`hostPort`), а не через облачный LoadBalancer с `ADDRESS` в `kubectl get ingress`.
- В кластере есть два **IngressClass**: `nginx` и **`public`** (часто **`public` — default**). Для доступа «с улицы» используйте **`ingress.className: public`** (так сделано в `values-public.yaml`).

### Вариант A — без своего DNS (**nip.io**)

Сервис [nip.io](https://nip.io) бесплатно резолвит имя вида `любой-префикс.IP-ЧЕРЕЗ-ДЕФИСЫ.nip.io` в IP.

1. Узнайте **публичный IPv4** машины, куда приходит HTTP (часто совпадает с IP из kubeconfig `server: https://…` **без порта** — уточните у админов, если 80 слушает другой адрес).
2. Переведите IP в slug: `213.165.209.28` → `213-165-209-28`.
3. В **`deploy/helm/neberi/values-public.yaml`** задайте, например, `ingress.host: neberi-t11.213-165-209-28.nip.io` (префикс уникальный в рамках курса).
4. Выполните установку с **двумя** `-f`: `values.yaml` и **`values-public.yaml`** (команда выше).
5. Проверка с любого ПК: в браузере откройте `http://neberi-t11.213-165-209-28.nip.io/` (HTTPS — только если на Ingress настроен TLS).

Чарт монтирует **ConfigMap** с nginx для web: прокси на API идёт на сервис **`neberi-api`** в namespace (в Docker Compose по-прежнему имя `api` в образе).

### Вариант B — выданное преподавателем имя

Если выдали DNS (`team-11.example.edu`), подставьте его в `ingress.host` (в своём values-файле), класс оставьте **`public`**, при необходимости добавьте TLS (секрет с сертификатом + блок `tls` в Ingress — по договорённости с курсом).

### Вариант C — только `neberi.local`

Каждому пользователю в **`hosts`**: `<IP> neberi.local`. Для широкой аудитории неудобно.

### Фронт и API

В Ingress: **`/`** → web, **`/v1`**, **`/docs`** → api. Сборка web с **пустым** `VITE_API_BASE` обращается к API **с того же origin** — один URL в браузере.

### Docker Compose на своей машине

Слушает **localhost**; для доступа из интернета без кластера нужен **VPS / туннель** (ngrok и т.п.) или деплой в K8s, как выше.

## Зачем Kubernetes

**Kubernetes (K8s)** — оркестратор контейнеров: он поднимает и держит в работе **API**, **веб** и **PostgreSQL** (или внешнюю БД), даёт **Ingress** с TLS, **пробы** живости, **rolling update** без простоя, **масштабирование** реплик API и централизованные **секреты** (ключ ingest, строка подключения к БД), не хранящиеся в git.

Для **учебного модуля** и разработки **не обязателен**: достаточно `docker compose` на одной машине.

K8s нужен, когда приложение должно жить в **общем кластере** команды/курса (как у вас с `kubeconfig-team-11.yaml`): единая сеть, квоты, логи, GitOps, отдельные namespace’ы.

## Обязательно ли использовать выданный kubeconfig

**Нет**, если вы работаете только локально через Docker. Файл kubeconfig — это **доступ к кластеру**, не часть репозитория NeBeri.

- **Не коммитьте** kubeconfig и не вставляйте его в чаты/issue.
- Храните локально (как у вас в `Downloads`) и подключайте через переменную окружения на сессию:

```bash
# пример: Windows PowerShell, один раз на сессию
$env:KUBECONFIG = "C:\Users\andro\Downloads\kubeconfig-team-11.yaml"
kubectl config current-context
kubectl get ns
```

Дальше можно применять манифесты из `deploy/helm/neberi` (или сырой Helm), когда они согласованы с вашим курсом.

## Связь с этим репозиторием

В `deploy/helm/neberi` лежат **Helm-чарты** для упаковки тех же сервисов, что и в `docker-compose.yml`, но уже для кластера: образы, переменные окружения, `Ingress`, `Secrets` из Kubernetes, а не из compose.

Если преподаватель не требует деплой в кластер — **compose остаётся основным путём**.
