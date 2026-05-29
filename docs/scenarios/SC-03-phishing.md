# SC-03 - Phishing Campaign: Orion Logistics

## Runtime Topology

- `172.20.3.10` - GoPhish server. This is the canonical runtime address for both the admin interface on port `3333` and the landing page on port `80`.
- `172.20.3.20` - Postfix mail relay for campaign delivery inside the isolated lab network.
- `172.20.3.30` - Simulated Windows victim endpoint with SMTP receive and event/callback simulation services.

Documentation, hints, event maps, and tests should reference `172.20.3.10` for GoPhish.

## Flag

- `FLAG-SC03-1`: `SC03 callback: 172.20.3.30 -> 172.20.3.10:4444`

This flag represents the simulated reverse-shell callback from the victim endpoint to the GoPhish/payload host inside the lab network.
