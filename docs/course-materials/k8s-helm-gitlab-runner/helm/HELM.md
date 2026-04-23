# HELM

## Explanation of Helm Basics:
- **Chart.yaml**: Defines the metadata of the chart, such as name, version, and description.
- **values.yaml**: Contains default values for the configurations used in the templates. Users can override these during installation.
- **Templates**: YAML files with placeholders and template directives that are rendered using the values from `values.yaml` and user-provided values.
  - **Variables**: Accessed using `{{ .Values.variableName }}` syntax.
  - **Functions**: Helper functions defined in `_helpers.tpl` can be included using `{{ include "functionName" . }}`.
  - **Conditionals and Loops**:
    - Use `{{- if }}`, `{{- else }}`, `{{- end }}` for conditionals.
    - Use `{{- range }}` to iterate over lists or maps.
- **_helpers.tpl**: Contains reusable template snippets and helper functions to keep templates DRY (Don't Repeat Yourself).


## Install

```shell
helm install quiner-fastapi-app fastapi_helm/
```

## Upgrade

```shell
helm upgrade quiner-fastapi-app fastapi_helm/
```

## Uninstall

```shell
helm uninstall quiner-fastapi-app fastapi_helm/
```

## Linter

```shell
helm lint fastapi_helm/
```
