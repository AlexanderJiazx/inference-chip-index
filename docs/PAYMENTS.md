# Payments

Paid Lucid entrypoints:

| key | advertised price | network |
| --- | --- | --- |
| rank-inference-chips | $0.02 | eip155:84532 (Base Sepolia) |
| compare-inference-chips | $0.03 | eip155:84532 |

Free runtime boots without `PAYMENTS_*`. Copy `.env.example` and set `PAYMENTS_PAY_TO` plus facilitator URL to advertise x402 offers.

Without payment configuration, paid handlers **fail closed** and never run for free.
