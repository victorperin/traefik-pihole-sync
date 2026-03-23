# Post v1.0 Feature Roadmap

## Overview

This document outlines potential features for versions after v1.0. Each feature is categorized by priority and use case, considering real-world scenarios users might encounter.

---

## Core Functionality Improvements

### v1.1 - Multiple Traefik Instances

**Use Case:** Users have multiple Traefik instances (e.g., edge and core).

| Feature | Description |
|---------|-------------|
| **Multi-Traefik Support** | Configure multiple Traefik API endpoints |
| **Instance-Specific Rules** | Filter routers by Traefik instance |
| **Aggregated View** | Combine routers from all instances |

### v1.2 - Advanced Filtering & Transformations

**Use Case:** Users need fine-grained control over which domains get created.

| Feature | Description |
|---------|-------------|
| **Regex Host Filtering** | Include/exclude hosts matching regex patterns |
| **Domain Transformations** | Transform hostnames (e.g., add suffix, replace text) |
| **Tag-Based Filtering** | Filter routers by tags or labels |
| **Service-Based Routing** | Only sync routers linked to specific services |

---

## Observability

### v2.0 - Production-Grade Observability

**Use Case:** Users need to monitor sync health in production.

| Feature | Description |
|---------|-------------|
| **Health Check Endpoint** | HTTP endpoint returning sync status and metrics |
| **Prometheus Metrics** | Export sync counts, latency, errors via `/metrics` |
| **Structured JSON Logging** | Machine-parseable logs for log aggregation |
| **Webhook Notifications** | Send alerts on sync failures or significant changes |

### v2.1 - Dashboard & UI

**Use Case:** Users want visual monitoring without CLI access.

| Feature | Description |
|---------|-------------|
| **Minimal Web UI** | View sync status, recent changes, errors |
| **Dashboard Stats** | Show sync history, success rate, record counts |
| **Manual Sync Trigger** | Button to trigger immediate sync |

---

## Configuration & UX

### v2.2 - Configuration File Support

**Use Case:** Users prefer YAML/JSON over environment variables.

| Feature | Description |
|---------|-------------|
| **YAML Config File** | Support `config.yaml` or `config.yml` |
| **JSON Config File** | Support `config.json` |
| **Config Precedence** | File < Environment < CLI arguments |
| **Config Validation** | Validate config on startup |

### v2.3 - Dry-Run & Preview Mode

**Use Case:** Users want to see what would change before applying.

| Feature | Description |
|---------|-------------|
| **Dry-Run Mode** | Calculate diff without applying changes |
| **Preview Output** | Show planned changes in human-readable format |
| **Approval Workflow** | Require manual approval before applying changes |

---

## Operational Features

### v3.0 - Operational Tools

**Use Case:** Users need backup/restore and disaster recovery.

| Feature | Description |
|---------|-------------|
| **Export DNS Records** | Export current Pi-hole records to JSON |
| **Import DNS Records** | Import records from JSON backup |
| **Selective Sync** | Sync only specific domains or patterns |
| **Rollback Support** | Revert to previous DNS state |

### v3.1 - Rate Limiting & Debouncing

**Use Case:** Users have rapid config changes and don't want excessive API calls.

| Feature | Description |
|---------|-------------|
| **Debounce Rapid Changes** | Wait for stable state before syncing |
| **Rate Limiting** | Limit API calls to Pi-hole/Traefik |
| **Batch Operations** | Group multiple changes into single API call |

---

## Security

### v3.2 - Security Hardening

**Use Case:** Users need secure production deployments.

| Feature | Description |
|---------|-------------|
| **API Key for Traefik** | Authenticate with Traefik API using key |
| **TLS for Pi-hole** | Secure communication with Pi-hole |
| **Secret Management** | Support for Docker secrets, Vault |
| **Audit Log** | Log all DNS changes with user/timestamp |

---

## Advanced Features

### v4.0 - Enhanced DNS Provider Support

**Use Case:** Users want to use DNS providers other than Pi-hole.

| Feature | Description |
|---------|-------------|
| **Unified DNS Interface** | Abstract DNS operations into interface to support multiple providers |
| **AdGuard Support** | Add support for AdGuard Home |
| **NextDNS Support** | Add support for NextDNS |
| **Custom Provider API** | Allow users to define custom DNS provider via configuration |


### v4.1 - Enterprise Features

**Use Case:** Large organizations need advanced capabilities.

| Feature | Description |
|---------|-------------|
| **TLS Certificate Integration** | Extract IPs from TLS certificates |
| **Service Discovery** | Integrate with Consul, etcd |
| **Template Engine** | Define DNS records via templates |
| **Multi-Tenant Support** | Separate DNS zones for different teams |

### v4.2 - Scheduling & Events

**Use Case:** Users need event-driven syncs.

| Feature | Description |
|---------|-------------|
| **Webhook Triggers** | Trigger sync on Traefik config change |
| **Cron Scheduling** | More complex scheduling options |
| **Event Bus** | Publish sync events for external consumers |

---

## Version Priority Matrix

```
         │ Core │ Observability │ UX  │ Operations │ Security │ Advanced │
──────────┼──────┼───────────────┼─────┼────────────┼──────────┼──────────│
  v1.1   │  ●   │               │     │            │          │          │
  v1.2   │  ●   │               │     │            │          │          │
  v2.0   │      │       ●       │     │            │          │          │
  v2.1   │      │       ●       │  ●  │            │          │          │
  v2.2   │      │               │  ●  │            │          │          │
  v2.3   │      │               │  ●  │     ●      │          │          │
  v3.0   │      │               │     │     ●      │          │          │
  v3.1   │  ●   │               │     │     ●      │          │          │
  v3.2   │      │               │     │            │    ●     │          │
  v4.0   │  ●   │               │     │            │          │          │
  v4.1   │      │               │     │            │          │    ●     │
  v4.2   │      │               │     │     ●      │          │    ●     │
```

---

## User Scenarios

### Scenario 1: Home User
> "I have a single Traefik instance and Pi-hole. I just want it to work."

- **Current v1.0:** ✓ Meets need
- **Future:** Keep simple, add health checks for peace of mind

### Scenario 2: Small Business
> "We have multiple offices with separate Traefik instances."

- **Future v1.2:** Multi-Traefik support
- **Future v2.0:** Health checks for monitoring

### Scenario 3: Enterprise
> "We need audit logs, multi-tenant isolation, and TLS everywhere."

- **Future v3.2:** Security hardening
- **Future v4.0:** Multi-tenant support

### Scenario 4: Developer
> "I want to test changes before applying them."

- **Future v2.3:** Dry-run mode
- **Future v2.2:** Configuration file support

### Scenario 5: Managed Service Provider
> "We manage DNS for many clients with different providers."

- **Future v4.0:** Multiple DNS provider support
- **Future v4.0:** Multi-tenant support

---

## Recommendation for Next Steps

After v1.0 release, prioritize in this order:

1. **v2.0** - Health checks & Prometheus (operational necessity)
2. **v2.3** - Dry-run mode (prevents user errors)
3. **v4.0** - Multi-DNS Provider support (extends usefulness)

---

## Notes

- Version numbers are suggestions; actual releases depend on development velocity
- Some features may be combined or split based on complexity
- Community feedback will shape priorities
- Consider LTS releases for enterprise users
