# Domain Class Diagram

Class-level view of the **elections backend** domain model
(`apps/backend/app/**/model.ts`). Where the [ERD](./erd.md) shows the persisted
tables, this shows the domain objects as classes: the entities (`*Row`), their
serialized transfer shapes (`*DTO`) and the value objects they carry, plus the
relationships between them.

Each entity is defined once in its module's `model.ts` as a Drizzle table
(`*Row`), with a `serialize*` function projecting it to a `*DTO` for the API.

## Domain entities & relationships

Associations mirror the foreign keys in the data model: an election owns its
candidates, eligibilities, votes and integration; a voter holds eligibilities;
an eligibility casts at most one vote for a candidate.

```mermaid
classDiagram
    ElectionRow "1" --> "0..*" CandidateRow : has
    ElectionRow "1" --> "0..*" EligibilityRow : grants
    ElectionRow "1" --> "0..*" VoteRow : records
    ElectionRow "1" --> "0..1" IntegrationRow : configures
    VoterRow "1" --> "0..*" EligibilityRow : holds
    EligibilityRow "1" --> "0..1" VoteRow : casts
    CandidateRow "1" --> "0..*" VoteRow : receives

    class ElectionRow {
        +string electionId
        +string electionNumber
        +string title
        +string description
        +ElectionStatus status
        +Date startTime
        +Date endTime
        +boolean deleted
        +Date createdAt
        +Date updatedAt
    }
    note for ElectionRow "ElectionStatus = draft | enrolling_voters | scheduled | active | ended | archived | paused"

    class CandidateRow {
        +string candidateId
        +string electionId
        +string fullName
        +string manifesto
        +string candidateNumber
        +boolean deleted
    }

    class VoterRow {
        +string voterId
        +string email
        +string accountId
    }

    class EligibilityRow {
        +string eligibilityId
        +string votingNumber
        +string voterId
        +string electionId
        +boolean hasVoted
        +boolean deleted
        +string externalVoterId
    }

    class VoteRow {
        +string voteId
        +string electionId
        +string candidateId
        +string ciphertext
        +string commitment
        +Date castAt
    }

    class IntegrationRow {
        +string integrationId
        +string electionId
        +string type
        +Record config
        +FormField[] formFields
    }
    IntegrationRow "1" *-- "0..*" FormField

    class FormField {
        +string id
        +string label
        +string type
        +string description
    }
    class HttpApiConfig {
        +string url
        +string method
        +string apiKeyHeaderName
        +string apiKeyHeaderValue
    }
    IntegrationRow ..> HttpApiConfig : config (when type = http_api)
```

## Transfer objects (DTOs)

The API-facing projections produced by each `serialize*` function.

```mermaid
classDiagram
    ElectionRow ..> ElectionDTO : serializeElection
    CandidateRow ..> CandidateDTO : serializeCandidate
    EligibilityWithVoter ..> EligibilityDTO : serializeEligibility
    IntegrationRow ..> IntegrationDTO : serializeIntegration
    EligibilityWithVoter --|> EligibilityRow

    class ElectionDTO {
        +string electionId
        +string title
        +string description
        +ElectionStatus status
        +string startTime
        +string endTime
        +boolean deleted
    }
    class CandidateDTO {
        +string candidateId
        +string electionId
        +string fullName
        +string manifesto
        +boolean deleted
    }
    class EligibilityWithVoter {
        +string email
        +string accountId
    }
    class EligibilityDTO {
        +string eligibilityId
        +string voterId
        +string accountId
        +string electionId
        +boolean hasVoted
        +boolean deleted
        +string externalVoterId
    }
    class IntegrationDTO {
        +string integrationId
        +string electionId
        +string type
        +Record config
        +FormField[] formFields
    }
    IntegrationDTO "1" *-- "0..*" FormField
    class FormField {
        +string id
        +string label
        +string type
        +string description
    }
```

> The source of truth for these classes is each module's `model.ts` under
> `apps/backend/app/` (`elections`, `candidates`, `voters`, `votes`,
> `integrations`).
> </content>
