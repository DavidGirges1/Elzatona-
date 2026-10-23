# Owner request — 23 October 2026

Push all work to the Elzatona GitHub repository, including earlier instructions, system design and everything implemented. The repository is connected to Vercel and elzatona.tech. Use GitHub and Vercel plugins to verify the result. Keep the Coming Soon page visible to the public at the domain root; expose the actual platform at /test for the owner and other programmers to test. Restore normal routing after testing.

Implementation interpretation: /test is unlisted and excluded from indexing, not an authentication or confidentiality boundary. Existing Supabase RLS and protected community actions remain enforced. No secret keys or temporary QA passwords belong in GitHub.
