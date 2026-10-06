---
type: llm
focus: last_message
weight: 3
---
Score PASS only if ALL of these hold:
1. It lists exactly these 9 work item status values: pending, inprogress, cancelled, failedLimitProcessingTime, failedDownload, failedInstructions, failedUpload, failedUploadOptional, success. FAIL if any is missing or an extra one is invented.
2. It says the reportUrl is valid for 24 hours (from first receiving it).
FAIL if any item is missing or wrong.
