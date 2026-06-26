{{- define "vdp-portal.fullname" -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "vdp-portal.labels" -}}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
{{ include "vdp-portal.selectorLabels" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "vdp-portal.selectorLabels" -}}
app.kubernetes.io/name: vdp-portal
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
