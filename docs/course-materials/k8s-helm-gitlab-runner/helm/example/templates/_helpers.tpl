# This file contains helper templates that can be used throughout the chart to maintain consistency and reusability.

{{/*
Generates a name based on the chart name and an optional override.
*/}}
{{- define "my-fastapi-app.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end }}

{{/*
Generates a full name using the release name and the chart name.
*/}}
{{- define "my-fastapi-app.fullname" -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- if .Release.Name -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end }}

{{/*
Generates the chart name and version as used in the labels.
*/}}
{{- define "my-fastapi-app.chart" -}}
{{ printf "%s-%s" .Chart.Name .Chart.Version }}
{{- end }}