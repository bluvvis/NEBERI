# NeBeri

Лента событий мошенничества (API + Web + Postgres). Локально: `docker compose up --build`.

Репозиторий GitHub: [bluvvis/NEBERI](https://github.com/bluvvis/NEBERI).

## Залить код на GitHub (один раз)

В этой папке уже выполнены `git init` и первый коммит. Осталось отправить ветку **`main`** (нужна авторизация GitHub):

```powershell
cd $HOME\Desktop\NeBeri
# если origin ещё не добавлен:
git remote add origin https://github.com/bluvvis/NEBERI.git
# если уже есть: git remote set-url origin https://github.com/bluvvis/NEBERI.git

git push -u origin main
```

Если `git push` зависает или просит пароль: используйте [Personal Access Token](https://github.com/settings/tokens) (scope **repo**) как пароль, или выполните `gh auth login`, затем снова `git push`.

После успешного push в Actions запустится workflow **Build and push images** и опубликует **`ghcr.io/bluvvis/neberi-api:latest`** и **`ghcr.io/bluvvis/neberi-web:latest`**.

## Деплой в Kubernetes (команда 11)

1. Дождитесь зелёного workflow **Build and push images** на GitHub.
2. В [Packages пользователя bluvvis](https://github.com/bluvvis?tab=packages) откройте каждый пакет **neberi-api** / **neberi-web** → **Package settings** → **Change visibility** → **Public** (иначе кластер не сможет сделать `docker pull` без секрета).
3. Локально: `.\deploy\scripts\Deploy-Team11.ps1` (нужен файл `deploy/kubeconfig-team-11.yaml` рядом с репо, он в `.gitignore`).

Подробности: [`deploy/KUBERNETES.md`](deploy/KUBERNETES.md).
