{{- define "data-lighthouse.fullname" -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "data-lighthouse.labels" -}}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
{{ include "data-lighthouse.selectorLabels" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "data-lighthouse.selectorLabels" -}}
app.kubernetes.io/name: data-lighthouse
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
