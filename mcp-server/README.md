# VBSolution CRM MCP Server

Connect Claude Desktop, Claude Code, Cursor, VS Code and other MCP-compatible tools to your VBSolution CRM.

## Setup

Add to your MCP config (`.cursor/mcp.json`, Claude Desktop config, etc.):

```json
{
  "mcpServers": {
    "vbsolution-crm": {
      "command": "npx",
      "args": ["-y", "@vbsolution/crm-mcp@latest"],
      "env": {
        "VBSOLUTION_API_KEY": "vb_live_xxxxxxxx_your_secret_here",
        "VBSOLUTION_API_URL": "https://your-backend.com/api/v1/crm"
      }
    }
  }
}
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VBSOLUTION_API_KEY` | Yes | API key from VBSolution CRM admin panel |
| `VBSOLUTION_API_URL` | No | Base URL (default: `http://localhost:3000/api/v1/crm`) |

## Available Tools

- `crm_health` — API status check
- `crm_get_organization` — Company info and stats
- `crm_list_contacts` — List contacts
- `crm_list_leads_sales` — List sales opportunities
- `crm_list_activities` — List activities
- `crm_list_tickets` — List support tickets
- `crm_dashboard` — Dashboard metrics
- All Brain CRM tools (create_contact, list_leads, etc.) via `/tools/:name`

## Integrations

- **Zapier / Make** — Use the REST API directly with HTTP modules
- **Claude Desktop / Claude Code** — MCP stdio transport
- **Cursor / VS Code** — MCP config in settings
