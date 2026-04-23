# Initial steps

1 - Create an account on docker hub

2 - Create a docker repository on docker hub

# Usage

## Login

```shell
docker login
```

## Tag image

* Replace `app-python` with our local image
* Replace `quiner1793/fastapi_server` with our docker hub repository
* [Optional] Replace `latest` with our desired tag

```shell
docker tag app-python quiner1793/fastapi_server:latest
```

## Push image

```shell
docker push quiner1793/fastapi_server:latest
```
