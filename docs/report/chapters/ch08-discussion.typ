#import "../theme.typ": *
#import "../components.typ": *
#import "../diagrams.typ": *

#chapter(num: "08", title: "Discussion",
  lead: "What works, what we would change, and what comes next.")

== Limitations
PARALLAX is single-node by design, which suits a classroom and a defense demo but
not multi-tenant institutional load; concurrent sessions are capped
(`MAX_CONCURRENT_SESSIONS`, default 10) to fit one host. Scenarios are
hand-authored Docker rather than declarative, so adding one is an engineering
task. The motion-heavy frontend auto-downgrades on weak GPUs, but a 60 fps
guarantee on mid-tier hardware is verified only by the runtime downgrade loop,
not by automated CI. The Elasticsearch and Samba containers are memory-hungry,
which is why scenario profiles start on demand rather than all at once. Finally,
the approximately eight-second reset is documented rather than benchmarked in
this report.

== Future work
Near-term work falls into four tracks. A *declarative scenario format* would
replace hand-built Compose files, so an instructor could author a scenario from a
specification rather than Docker plumbing. Two new scenarios are already
sketched — *SC-04 (cloud security)*, attacking and defending misconfigured cloud
metadata and IAM against a LocalStack target, and *SC-05 (defensive forensics)*,
analyzing memory and disk artifacts in a dedicated workbench. A *benchmark
harness* would turn the latency budget and the reset time into measured,
CI-tracked numbers. And *curriculum sequencing* would let an instructor chain
scenarios into a graded learning path with prerequisites.

== Reflection
The hardest part was not building either workspace — it was making a single
action legible on both sides without letting their state bleed together, and
keeping the mentor genuinely helpful while provably unable to hand over an
exploit. The causal loop, and the guardrails around it, are the contributions we
are proudest of. Building the platform also reshaped how we read security tools:
once you have watched your own `sqlmap` run light up a WAF audit log in real time,
you stop seeing "attack" and "defense" as separate subjects and start seeing one
event observed from two chairs.
