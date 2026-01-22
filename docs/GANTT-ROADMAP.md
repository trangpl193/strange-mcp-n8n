# MCP N8N Platform Evolution - Gantt Chart Roadmap
**Created:** 2026-01-22
**Updated:** 2026-01-23
**Purpose:** Visual timeline for platform evolution from API wrapper to AI development platform
**Status:** Phase 3A Complete, Documentation Phase Active

---

## 🎯 CURRENT STATUS (2026-01-23)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PLATFORM STATUS                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ✅ FOUNDATION (Phase 1 + 2A + 2B)     COMPLETE                            │
│     └─ 8 workflow tools, 9 builder tools, E2E tests passing                │
│                                                                             │
│  ✅ PHASE 3A: KNOWLEDGE LAYER          DEPLOYED 2026-01-22                 │
│     ├─ Version: v1.2.0                                                      │
│     ├─ Commit: a660f5b                                                      │
│     ├─ 5 MCP tools (schema_*, quirks_*, validate)                          │
│     ├─ 3 node schemas (If, Switch, Filter)                                 │
│     ├─ 1 critical quirk (If-node dual format)                              │
│     ├─ 351 tests passing (100% knowledge layer coverage)                   │
│     └─ UAT: 27/27 steps passed                                              │
│                                                                             │
│  🔄 DOCUMENTATION PHASE               ACTIVE                               │
│     ├─ AI-DOC-TEMPLATE.yaml            ✅ Created                          │
│     ├─ SERVICE-BLUEPRINT.yaml          ✅ Created                          │
│     ├─ KNOWLEDGE-LAYER-RATIONALE.yaml  ✅ Created                          │
│     ├─ MIDDLEWARE-ARCHITECTURE.yaml    ✅ Created                          │
│     └─ GANTT-ROADMAP.md                ✅ Updated                          │
│                                                                             │
│  📋 TEST COVERAGE IMPROVEMENT          IN PROGRESS                         │
│     └─ 25.17% → 41.65% (+16.48%)                                           │
│                                                                             │
│  ⏳ PHASE 4A: VALIDATION LAYER         PENDING DECISION                    │
│     └─ Pre-commit validation, auto-fix (12-16h estimated)                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Achievements Since Last Update

| Date | Milestone | Impact |
|------|-----------|--------|
| 2026-01-22 14:39 | Phase 3A deployed to production | AI self-diagnosis enabled |
| 2026-01-22 16:06 | Test coverage +16.48% | Production code validated |
| 2026-01-23 | AI-first documentation created | AI agents can understand architecture |

### Test Coverage Progress

```
┌─────────────────────────────────────────────────────────────────┐
│  TEST COVERAGE IMPROVEMENT                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Before:  ████████░░░░░░░░░░░░░░░░░░░░░░ 25.17%                │
│  After:   █████████████████░░░░░░░░░░░░░ 41.65%                │
│  Target:  ████████████████████████░░░░░░ 60%                   │
│                                                                 │
│  Modules improved:                                              │
│  • errors:    63% → 100% (+37%)                                │
│  • types:     0%  → 88%  (+88%)                                │
│  • transport: 90% maintained                                    │
│  • auth:      92%, middleware: 93%                             │
│                                                                 │
│  New test files: 6 files, 225 tests                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Gantt Chart - Platform Evolution Timeline

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                         MCP N8N PLATFORM EVOLUTION ROADMAP                                      │
│                         Timeline: 6 weeks (Jan 22 - Mar 5, 2026)                               │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘

Phase/Task                        │ Week 1 │ Week 2 │ Week 3 │ Week 4 │ Week 5 │ Week 6 │ Status
─────────────────────────────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────
                                 │ Jan 22 │ Jan 29 │ Feb 5  │ Feb 12 │ Feb 19 │ Feb 26 │
─────────────────────────────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────

FOUNDATION (Complete)
├─ Phase 1: Node Operations      │   ✓    │        │        │        │        │        │   ✓
├─ Phase 2A: Builder Pattern     │   ✓    │        │        │        │        │        │   ✓
├─ Phase 2B: Enhanced Builder    │   ✓    │        │        │        │        │        │   ✓
└─ If-node Bug Fix               │   ✓    │        │        │        │        │        │   ✓
─────────────────────────────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────

PHASE 3A: KNOWLEDGE LAYER CORE (Recommended - 10-15h) ✅ COMPLETE
─────────────────────────────────────────────────────────────────────────────
                                │ Actual │ Planned│ Status
─────────────────────────────────┼────────┼────────┼────────
3A.1 Infrastructure Setup        │ ████   │ Week 1 │   ✓
  ├─ Type definitions            │ ██     │   2h   │   ✓
  ├─ Directory structure         │ ██     │   1h   │   ✓
  └─ Core schema interfaces      │ ██     │   1h   │   ✓
─────────────────────────────────┼────────┼────────┼────────
3A.2 Critical Node Schemas       │ ████   │ Week 1 │   ✓
  ├─ If-node schema              │ ██     │   1h   │   ✓
  ├─ Switch-node schema          │ ██     │   1h   │   ✓
  └─ Filter-node schema          │ ██     │   1h   │   ✓
─────────────────────────────────┼────────┼────────┼────────
3A.3 Quirks Database             │ ████   │ Week 2 │   ✓
  ├─ If-node dual format quirk   │ ██     │   1h   │   ✓
  ├─ Quirk registry structure    │ ██     │   1h   │   ✓
  └─ Documentation               │ ██     │   1h   │   ✓
─────────────────────────────────┼────────┼────────┼────────
3A.4 MCP Tools Implementation    │ ████   │ Week 2 │   ✓
  ├─ schema_get()                │ ██     │   1h   │   ✓
  ├─ quirks_check()              │ ██     │   1h   │   ✓
  ├─ schema_validate()           │ ██     │   2h   │   ✓
  └─ schema_list(), quirks_search│ ██     │   1h   │   ✓
─────────────────────────────────┼────────┼────────┼────────
3A.5 Builder Integration         │ ████   │ Week 3 │   ✓
  ├─ Integrate schema_validate   │ ██     │   1h   │   ✓
  ├─ Enhanced builder_preview    │ ██     │   1h   │   ✓
  └─ Validation warnings         │ ██     │   1h   │   ✓
─────────────────────────────────┼────────┼────────┼────────
3A.6 Testing & Documentation     │ ████   │ Week 4 │   ✓
  ├─ Unit tests (schema layer)   │ ██     │   2h   │   ✓
  ├─ Integration tests           │ ██     │   1h   │   ✓
  └─ Documentation (README)      │ ██     │   2h   │   ✓
─────────────────────────────────┼────────┼────────┼────────
3A.7 UAT & Deployment            │ ████   │ Week 4 │   ✓
  ├─ UAT: 27 steps               │ ██     │   2h   │   ✓ 100% passed
  └─ Production deployment       │ ██     │   1h   │   ✓ v1.2.0
─────────────────────────────────┼────────┼────────┼────────

✅ MILESTONE 1: Knowledge Layer Complete - 2026-01-22 14:39 UTC

─────────────────────────────────────────────────────────────────────────────
DOCUMENTATION PHASE (Current) 🔄 IN PROGRESS
─────────────────────────────────────────────────────────────────────────────
AI-First Documentation           │ ████   │ Week 5 │ 🔄
  ├─ AI-DOC-TEMPLATE.yaml        │ ██     │   0.5h │   ✓
  ├─ SERVICE-BLUEPRINT.yaml      │ ██     │   1h   │   ✓
  ├─ KNOWLEDGE-LAYER-RATIONALE   │ ██     │   1h   │   ✓
  ├─ MIDDLEWARE-ARCHITECTURE     │ ██     │   1h   │   ✓
  └─ GANTT-ROADMAP.md update     │ ██     │   0.5h │   ✓
─────────────────────────────────┼────────┼────────┼────────

⚡ DECISION POINT 2: Continue to Phase 4A? (After documentation)

─────────────────────────────────┼────────┼────────┼────────
PHASE 4A: VALIDATION LAYER (Optional - 12-16h)
─────────────────────────────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────
4A.1 Enhanced Builder Preview    │        │        │        │        │ ████   │        │ Optional
  ├─ Schema validation           │        │        │        │        │ ██     │        │   2h
  ├─ Quirks detection            │        │        │        │        │ ██     │        │   1h
  └─ Validation reporting        │        │        │        │        │   ██   │        │   1h
─────────────────────────────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────
4A.2 Auto-Fix Capability         │        │        │        │        │   ████ │ ██     │ Optional
  ├─ quirks_autofix()            │        │        │        │        │   ██   │        │   1h
  ├─ If-node auto-transform      │        │        │        │        │   ██   │        │   1h
  └─ Integration with commit     │        │        │        │        │     ██ │        │   1h
─────────────────────────────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────
4A.3 Pre-Commit Validation Gate  │        │        │        │        │        │ ████   │ Optional
  ├─ Validation gate logic       │        │        │        │        │        │ ██     │   1h
  ├─ Blocker vs warning logic    │        │        │        │        │        │ ██     │   1h
  └─ Error messaging             │        │        │        │        │        │   ██   │   1h
─────────────────────────────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────
4A.4 Testing & Documentation     │        │        │        │        │        │   ████ │ Optional
  ├─ Validation layer tests      │        │        │        │        │        │   ██   │   2h
  ├─ Auto-fix tests              │        │        │        │        │        │   ██   │   1h
  └─ Documentation update        │        │        │        │        │        │     ██ │   1h
─────────────────────────────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────

MILESTONE 2: Validation Layer Complete                              │        │   ✓    │
UAT Testing (Phase 4A)           │        │        │        │        │        │   ████ │ Optional
  ├─ Pre-commit validation       │        │        │        │        │        │   ██   │   0.5h
  ├─ Auto-fix testing            │        │        │        │        │        │   ██   │   0.5h
  └─ End-to-end workflow         │        │        │        │        │        │     ██ │   1h
─────────────────────────────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────

DEFERRED PHASES (Future Iterations)
─────────────────────────────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────
Phase 3B: Examples Library       │        │        │        │        │        │        │ Deferred
Phase 4B: Debugging Tools        │        │        │        │        │        │        │ Deferred
Phase 5: Learning & Memory       │        │        │        │        │        │        │ Deferred
─────────────────────────────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────

LEGEND:
████ = Active work in progress
  ██ = Planned task duration
   ✓ = Completed
   ⚡ = Decision point
```

---

## Timeline Details

### Week 1 (Jan 22-28, 2026)

**Focus:** Phase 3A Infrastructure & Core Schemas

| Day         | Tasks                                 | Hours | Deliverables                               |
| ----------- | ------------------------------------- | ----- | ------------------------------------------ |
| Day 1 (Wed) | Type definitions, directory structure | 3h    | `src/knowledge/types.ts`, folder structure |
| Day 2 (Thu) | If-node schema, core interfaces       | 2h    | `src/knowledge/schemas/if-node.ts`         |
| Day 3 (Fri) | Switch-node, Filter-node schemas      | 2h    | Schema library with 3 nodes                |
| Weekend     | Documentation review                  | 1h    | README updates                             |

**Deliverables:** Core knowledge infrastructure with 3 critical node schemas

---

### Week 2 (Jan 29 - Feb 4, 2026)

**Focus:** Quirks Database & MCP Tools

| Day         | Tasks                         | Hours | Deliverables                                  |
| ----------- | ----------------------------- | ----- | --------------------------------------------- |
| Day 1 (Mon) | If-node quirk documentation   | 2h    | `src/knowledge/quirks/if-node-dual-format.ts` |
| Day 2 (Tue) | Quirk registry structure      | 2h    | Quirks database framework                     |
| Day 3 (Wed) | schema_get() implementation   | 2h    | MCP tool: schema_get                          |
| Day 4 (Thu) | quirks_check() implementation | 2h    | MCP tool: quirks_check                        |
| Day 5 (Fri) | schema_validate() - Part 1    | 1h    | Validation logic foundation                   |

**Deliverables:** Quirks database + 2.5 MCP tools implemented

---

### Week 3 (Feb 5-11, 2026)

**Focus:** MCP Tools Completion & Builder Integration

| Day         | Tasks                                  | Hours | Deliverables                       |
| ----------- | -------------------------------------- | ----- | ---------------------------------- |
| Day 1 (Mon) | schema_validate() - Part 2             | 2h    | MCP tool: schema_validate complete |
| Day 2 (Tue) | MCP tool definitions, registration     | 1h    | All tools registered in server     |
| Day 3 (Wed) | Integrate schema_validate with builder | 2h    | `builder-add-node.ts` updated      |
| Day 4 (Thu) | Enhanced builder_preview               | 2h    | Preview includes schema warnings   |
| Day 5 (Fri) | Testing - Unit tests                   | 2h    | Knowledge layer unit tests         |

**Deliverables:** Complete MCP tool suite + builder integration

---

### Week 4 (Feb 12-18, 2026)

**Focus:** Testing, Documentation & UAT

| Day         | Tasks                         | Hours | Deliverables                    |
| ----------- | ----------------------------- | ----- | ------------------------------- |
| Day 1 (Mon) | Integration tests             | 2h    | Builder + knowledge layer tests |
| Day 2 (Tue) | Documentation (usage guide)   | 2h    | `docs/KNOWLEDGE-LAYER-USAGE.md` |
| Day 3 (Wed) | UAT - schema_get validation   | 1h    | Verify If-node schema retrieval |
| Day 4 (Thu) | UAT - quirks_check validation | 1h    | Test quirk detection            |
| Day 5 (Fri) | UAT - End-to-end workflow     | 1h    | Full builder workflow test      |

**Milestone 1 Complete:** Knowledge Layer Core (Phase 3A) ✓

**DECISION POINT 1:** Continue to Phase 4A (Validation)?

- **If YES:** Proceed to Week 5
- **If NO:** Close Phase 3A, document, deploy

---

### Week 5 (Feb 19-25, 2026) - OPTIONAL

**Focus:** Validation Layer - Enhanced Preview & Auto-Fix

| Day         | Tasks                                        | Hours | Deliverables                   |
| ----------- | -------------------------------------------- | ----- | ------------------------------ |
| Day 1 (Mon) | Enhanced builder_preview - schema validation | 2h    | Schema checks in preview       |
| Day 2 (Tue) | Enhanced builder_preview - quirks detection  | 2h    | Quirk warnings in preview      |
| Day 3 (Wed) | quirks_autofix() implementation              | 2h    | Auto-fix framework             |
| Day 4 (Thu) | If-node auto-transform integration           | 2h    | Legacy → combinator conversion |
| Day 5 (Fri) | Auto-fix integration with builder_commit     | 1h    | Opt-in auto-fix on commit      |

**Deliverables:** Enhanced validation + auto-fix capability

---

### Week 6 (Feb 26 - Mar 5, 2026) - OPTIONAL

**Focus:** Validation Gate & Final UAT

| Day         | Tasks                            | Hours | Deliverables                        |
| ----------- | -------------------------------- | ----- | ----------------------------------- |
| Day 1 (Mon) | Pre-commit validation gate logic | 2h    | Validation before N8N API call      |
| Day 2 (Tue) | Blocker vs warning logic         | 2h    | Critical errors block, warnings log |
| Day 3 (Wed) | Validation layer tests           | 3h    | Comprehensive test suite            |
| Day 4 (Thu) | Documentation update             | 1h    | README + usage guide updates        |
| Day 5 (Fri) | UAT - Full validation workflow   | 2h    | End-to-end testing                  |

**Milestone 2 Complete:** Validation Layer (Phase 4A) ✓

---

## Resource Allocation

### Developer Effort (Solo Work)

```
┌────────────────────────────────────────────────────────────────┐
│                    EFFORT DISTRIBUTION                          │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Phase 3A: Knowledge Layer Core                                │
│  ████████████████████ 15h (65% of recommended path)            │
│                                                                 │
│  UAT & Decision Point                                          │
│  ████ 2h (9%)                                                  │
│                                                                 │
│  Phase 4A: Validation Layer (OPTIONAL)                         │
│  ████████████████ 12h (52% if continued)                       │
│                                                                 │
│  UAT & Finalization                                            │
│  ████ 2h (9%)                                                  │
│                                                                 │
├────────────────────────────────────────────────────────────────┤
│  TOTAL (Phase 3A only):      15-17h over 4 weeks               │
│  TOTAL (Phase 3A + 4A):      29-31h over 6 weeks               │
└────────────────────────────────────────────────────────────────┘
```

### Weekly Time Commitment

| Week   | Phase      | Recommended Hours | Intensity    |
| ------ | ---------- | ----------------- | ------------ |
| Week 1 | 3A.1-3A.2  | 8h (1.6h/day)     | ███░░ Medium |
| Week 2 | 3A.3-3A.4  | 9h (1.8h/day)     | ███░░ Medium |
| Week 3 | 3A.5-3A.6  | 9h (1.8h/day)     | ███░░ Medium |
| Week 4 | UAT + Docs | 5h (1h/day)       | ██░░░ Light  |
| Week 5 | 4A.1-4A.2  | 9h (1.8h/day)     | ███░░ Medium |
| Week 6 | 4A.3-4A.4  | 10h (2h/day)      | ████░ High   |

**Strategic Architect Note:** Daily 1.5-2h sessions align with analysis → design workflow, allowing time for reflection between implementation sessions.

---

## Dependencies & Critical Path

```
┌─────────────────────────────────────────────────────────────────┐
│                      DEPENDENCY GRAPH                            │
└─────────────────────────────────────────────────────────────────┘

Foundation (Complete)
  └─► Phase 3A.1: Infrastructure
        ├─► Phase 3A.2: Node Schemas
        │     └─► Phase 3A.3: Quirks Database
        │           └─► Phase 3A.4: MCP Tools
        │                 └─► Phase 3A.5: Builder Integration
        │                       └─► Phase 3A.6: Testing & Docs
        │                             └─► UAT (Milestone 1)
        │                                   │
        │                                   ▼
        │                            DECISION POINT 1
        │                                   │
        │                        ┌──────────┴──────────┐
        │                        │                     │
        │                      STOP                 CONTINUE
        │                    (Deploy)                  │
        │                                              ▼
        │                                    Phase 4A.1: Enhanced Preview
        │                                          └─► Phase 4A.2: Auto-Fix
        │                                                └─► Phase 4A.3: Validation Gate
        │                                                      └─► Phase 4A.4: Testing
        │                                                            └─► UAT (Milestone 2)
        │                                                                  └─► Deploy
        │
        └─► DEFERRED: Phases 3B, 4B, 5 (Future iterations)

CRITICAL PATH (Recommended MVP):
Foundation → 3A.1 → 3A.2 → 3A.3 → 3A.4 → 3A.5 → 3A.6 → UAT → Deploy

EXTENDED PATH (If Phase 4A approved):
... → UAT → 4A.1 → 4A.2 → 4A.3 → 4A.4 → UAT → Deploy
```

---

## Risk Timeline

| Week   | Risk                                      | Probability | Impact   | Mitigation                                  |
| ------ | ----------------------------------------- | ----------- | -------- | ------------------------------------------- |
| Week 1 | Type definitions too rigid                | Medium      | Medium   | Allow extension via Redis fallback          |
| Week 2 | Schema documentation inaccurate           | High        | High     | Validate against working workflows from N8N |
| Week 3 | Builder integration breaks existing flows | Medium      | High     | Comprehensive regression tests              |
| Week 4 | UAT discovers new quirks                  | High        | Low      | Add to quirks database, defer to Phase 3B   |
| Week 5 | Auto-fix breaks workflows                 | Medium      | Critical | Make auto-fix opt-in, extensive testing     |
| Week 6 | Validation too strict                     | Medium      | Medium   | Use warnings not blockers, refine rules     |

**Risk Mitigation Strategy:**

- Week 2: Reserve 2h for schema re-validation if inaccuracies found
- Week 3: Maintain parallel tests (before/after integration)
- Week 5: Auto-fix behind feature flag, extensive UAT before enabling

---

## Success Metrics Timeline

### Phase 3A Success Criteria (End of Week 4)

```
Metric                              Target         Measurement Method
────────────────────────────────────────────────────────────────────
Schema lookup time                  < 5ms          Performance tests
Redis fallback success rate         100%           Failure simulation tests
Schema coverage                     3+ nodes       If, Switch, Filter documented
Quirks documented                   3+ quirks      If-node dual format + others
Test coverage                       > 90%          Jest coverage report
AI agent can explain If-node format YES            Manual UAT validation
No UI rendering errors              0 errors       Create If-node workflow, verify UI
```

### Phase 4A Success Criteria (End of Week 6) - OPTIONAL

```
Metric                              Target         Measurement Method
────────────────────────────────────────────────────────────────────
Validation errors prevented         100%           Test known quirks caught
Auto-fix success rate               > 95%          If-node transformation accuracy
Validation time                     < 100ms        Performance benchmark
False positive rate                 < 5%           UAT with valid workflows
User trusts validation              YES            User feedback (not bypassing)
Workflows work in UI after commit   100%           End-to-end UAT
```

---

## Deferred Phases (Post Week 6)

### Phase 3B: Examples Library (8-10h)

**When:** User requests contribution features or needs working examples reference

```
Timeline: 1-2 weeks
├─ Week 1: Examples storage (Redis)
├─ Week 1: CLI tools for management
└─ Week 2: User documentation + testing
```

### Phase 4B: Debugging Tools (10-12h)

**When:** Complex debugging scenarios arise that basic validation doesn't cover

```
Timeline: 1-2 weeks
├─ Week 1: Diff compare tool
├─ Week 1: Schema trace tool
└─ Week 2: Error context enrichment
```

### Phase 5: Learning & Memory (16-20h)

**When:** Platform has accumulated significant usage data

```
Timeline: 2-3 weeks
├─ Week 1-2: Error corpus collection
├─ Week 2: Fix pattern recognition
└─ Week 3: Success case tracking
```

---

## Strategic Architect Alignment

### Analysis Phase (Weeks 1-2)

- **Your Role:** Review type definitions, schema structures
- **AI Role:** Implement based on approved architecture
- **Checkpoints:** End of Week 1 (infrastructure review), End of Week 2 (schema review)

### Design Phase (Weeks 2-3)

- **Your Role:** Validate MCP tool APIs, review integration approach
- **AI Role:** Propose tool signatures, integration patterns
- **Checkpoints:** Mid-Week 2 (API design review), End of Week 3 (integration review)

### Execution Phase (Weeks 3-4)

- **Your Role:** UAT testing, validation against strategy
- **AI Role:** Implementation, testing, documentation
- **Checkpoints:** End of Week 4 (UAT results, decision point)

### Iteration Phase (Weeks 5-6) - OPTIONAL

- **Your Role:** Validate auto-fix behavior, approve validation rules
- **AI Role:** Implement validation logic, auto-fix transforms
- **Checkpoints:** End of Week 5 (auto-fix review), End of Week 6 (final UAT)

---

## Next Steps

### Immediate Actions (This Week)

1. **Review Roadmap:** Approve timeline and effort estimates
2. **Decision:** Commit to Phase 3A start (Yes/No)
3. **Setup:** Create feature branch `feature/knowledge-layer-core`
4. **Kickoff:** Begin 3A.1 Infrastructure setup

### Before Starting Phase 3A

- [ ] Review type definitions proposal
- [ ] Approve directory structure
- [ ] Understand Redis fallback strategy
- [ ] Review schema documentation approach

### Before Starting Phase 4A (If Approved)

- [ ] Review Phase 3A UAT results
- [ ] Decide on auto-fix approach (opt-in vs automatic)
- [ ] Define validation strictness (blocker vs warning)
- [ ] Approve validation gate architecture

---

**Document Status:** Active - Phase 3A Complete, Documentation Phase Active
**Recommended Action:** Review documentation, then decide on Phase 4A
**AI Documentation:** See docs/SERVICE-BLUEPRINT.yaml, KNOWLEDGE-LAYER-RATIONALE.yaml, MIDDLEWARE-ARCHITECTURE.yaml

## Related AI-First Documentation

| Document | Purpose | Status |
|----------|---------|--------|
| AI-DOC-TEMPLATE.yaml | Template for AI-readable docs | ✅ Created |
| SERVICE-BLUEPRINT.yaml | Architecture overview (6 layers, 22 tools) | ✅ Created |
| KNOWLEDGE-LAYER-RATIONALE.yaml | Why knowledge layer was designed | ✅ Created |
| MIDDLEWARE-ARCHITECTURE.yaml | Hybrid code+Redis approach | ✅ Created |
| KNOWLEDGE-LAYER-USAGE.md | How to use knowledge tools | ✅ Exists |
