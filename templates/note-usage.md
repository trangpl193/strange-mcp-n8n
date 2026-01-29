## 📖 Usage Instructions

**Workflow**: {{workflow_name}}

---

### Trigger

**Type**: {{trigger_type}}
**Conditions**: {{trigger_conditions}}

**Example**:
```
{{trigger_example}}
```

---

### Expected Inputs

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
{{#each inputs}}
| {{name}} | {{type}} | {{required}} | {{description}} |
{{/each}}

---

### Output Format

```json
{{output_example}}
```

---

### Error Handling

**Common Errors:**
- `{{error_code}}`: {{error_description}}
- Solutions: {{error_solution}}

---

### Related Workflows

- **{{related_workflow}}**: {{relationship_description}}

---

*Last updated: {{updated_date}} by {{author}}*
*For questions, contact: {{contact}}*
