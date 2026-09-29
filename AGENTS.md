<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- PsyCase uses TanStack Start/React for the interface because this workspace cannot run Angular; preserve the requested experience rather than switching frameworks.
- Clinical cases, session notes, and clinician-defined contexts are stored in Lovable Cloud with owner-scoped row security; this prevents one professional from accessing another's records.
- Generative AI and scientific article retrieval are deferred to a separate phase; do not silently add AI-generated clinical content or present research as verified before integration.
- Constellation positions live on clinician-owned contexts and connections in case_map_edges, scoped to the same owner and case, so maps persist without inferring clinical relationships.
