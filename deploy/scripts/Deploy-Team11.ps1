#Requires -Version 5.1
<#
  Деплой NeBeri в namespace team-11-ns.
  Перед запуском: образы neberi/api и neberi/web должны быть доступны кластеру
  (docker push в registry курса / ttl.sh при стабильной сети / импорт на ноде microk8s).

  Пример с ttl.sh (после успешного docker push):
    .\deploy\scripts\Deploy-Team11.ps1 `
      -ApiImage "ttl.sh/your-uuid-api:4h" `
      -WebImage "ttl.sh/your-uuid-web:4h"
#>
param(
  [string]$Kubeconfig = (Join-Path $PSScriptRoot "..\kubeconfig-team-11.yaml" | Resolve-Path).Path,
  [string]$Release = "neberi",
  [string]$Namespace = "team-11-ns",
  [string]$Chart = (Join-Path $PSScriptRoot "..\helm\neberi" | Resolve-Path).Path,
  [string]$ValuesBase = (Join-Path $PSScriptRoot "..\helm\neberi\values.yaml" | Resolve-Path).Path,
  [string]$ValuesPublic = (Join-Path $PSScriptRoot "..\helm\neberi\values-public.yaml" | Resolve-Path).Path,
  [string]$ValuesGhcr = (Join-Path $PSScriptRoot "..\helm\neberi\values-images-ghcr.yaml" | Resolve-Path).Path,
  [string]$ApiImage = "",
  [string]$WebImage = "",
  [string]$GhcrOwner = "bluvvis"
)

$ErrorActionPreference = "Stop"
$env:KUBECONFIG = $Kubeconfig

Write-Host "KUBECONFIG=$Kubeconfig"
kubectl config current-context
kubectl get ns $Namespace 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Namespace $Namespace will be created by Helm --create-namespace"
}

$owner = $GhcrOwner.Trim().ToLowerInvariant()
if ($owner -ne "") {
  if ($ApiImage -eq "") { $ApiImage = "ghcr.io/${owner}/neberi-api:latest" }
  if ($WebImage -eq "") { $WebImage = "ghcr.io/${owner}/neberi-web:latest" }
}

$extra = @()
if ($ApiImage -ne "") {
  $p = $ApiImage -split ":"
  if ($p.Count -lt 2) { throw "ApiImage must be repo:tag, got: $ApiImage" }
  $tag = $p[-1]
  $repo = ($ApiImage.Substring(0, $ApiImage.Length - $tag.Length - 1))
  $extra += "--set", "api.image.repository=$repo", "--set", "api.image.tag=$tag"
}
if ($WebImage -ne "") {
  $p = $WebImage -split ":"
  if ($p.Count -lt 2) { throw "WebImage must be repo:tag, got: $WebImage" }
  $tag = $p[-1]
  $repo = ($WebImage.Substring(0, $WebImage.Length - $tag.Length - 1))
  $extra += "--set", "web.image.repository=$repo", "--set", "web.image.tag=$tag"
}

helm upgrade --install $Release $Chart `
  -n $Namespace --create-namespace `
  -f $ValuesBase `
  -f $ValuesPublic `
  -f $ValuesGhcr `
  @extra `
  --wait --timeout 8m

kubectl rollout status deploy/${Release}-api -n $Namespace --timeout=5m
kubectl rollout status deploy/${Release}-web -n $Namespace --timeout=5m

kubectl get pods,svc,ingress -n $Namespace
Write-Host "`nОткройте в браузере host из values-public.yaml (Ingress), например http://neberi-t11....nip.io/"
