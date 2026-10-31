# Security

OpenVenue is local-first. The editor does not need an account, and a venue file should stay on your machine until you choose to share it.

## Reporting a vulnerability

Please use a [private security advisory](https://github.com/Rachit7168/OpenVenue/security/advisories/new) on this repository. Do not open a public issue for a vulnerability.

Include what you can do, which version or commit you used, and whether the optional API is involved. We will reply on the advisory.

## Notes for operators

The Docker Compose file ships a development database password and a development Django secret, and it publishes Postgres and the API on localhost only. Redis is not published to the host. Do not reuse those values in production. Set `DJANGO_SECRET_KEY` and leave `DJANGO_DEBUG` unset or `0` for any shared deployment.

Imported `venue.json` files are untrusted. The schema package validates them with Ajv before the editor accepts them. Do not skip that check when you add a new import path.
