{{- define "sample.name" -}}
sample-service
{{- end }}

{{- define "sample.fullname" -}}
{{ include "sample.name" . }}
{{- end }}