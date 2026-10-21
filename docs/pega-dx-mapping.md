# InsureHub Pega DX Mapping

## API Base

- App alias: `insurehub`
- Preferred DX API base: `/prweb/app/insurehub/api/application/v2`
- Fallback DX API base: `/prweb/api/application/v2`

## Customer Context

The logged-in Pega operator ID is treated as the portal customer ID.

Every customer-specific request sends:

```json
{
  "CustomerID": "<logged-in-operator-id>"
}
```

`CustomerID` is configurable with `VITE_PEGA_CUSTOMER_ID_PARAM`.

## Case Types

- Change address: `IH-Insure-Work-ChangeAddress`
- Change contact details: `IH-Insure-Work-ChangeContactDetails`
- Complaint: `IH-Insure-Work-Complaint`
- Health claim: `IH-Insure-Work-HealthClaims`
- Manual triage: `IH-Insure-Work-ManualTriage`
- Motor claim: `IH-Insure-Work-MotorClaims`
- Policy clarification/change: `IH-Insure-Work-PolicyClarification`
- Schedule consultation: `IH-Insure-Work-ScheduleConsultation`
- Service request: `IH-Insure-Work-ServiceRequest`

## DX Endpoints Used By Portal

- `POST /cases` to create work with `caseTypeID` and customer content.
- `GET /casetypes` for available case types when needed.
- `POST /data_views/{data_view_ID}` for list/page dashboard data, with `dataViewParameters`.
- `GET /assignments/{assignmentID}` and `PATCH /assignments/{assignmentID}/actions/{actionID}` for future assignment work.

## Pending Data Views

Fill these once created in Pega:

- `VITE_PEGA_DASHBOARD_DATA_VIEW_ID`
- `VITE_PEGA_POLICY_DATA_VIEW_ID`
- `VITE_PEGA_CLAIMS_DATA_VIEW_ID`
- `VITE_PEGA_SERVICE_TASKS_DATA_VIEW_ID`
