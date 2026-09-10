#!/usr/bin/env python3
"""Advance only the explicitly approved Option 2B successor SHA seals.

This helper is intentionally branch-local validation scaffolding. It must run only
after .github/option2b_static_hub_patch.py has produced the final candidate bytes.
"""
from __future__ import annotations

import hashlib
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPECTED_SUPABASE_TREE = "19dd92c4e1f1d7c3ab9fc522d1b1cdf191afc456"

AUTHORIZED_RUNTIME = (
    "site/index.html",
    "site/v40-learning-priorities.js",
    "site/v57c-student-continue-learning-home.js",
    "site/gamification-student.js",
    "site/v58a-student-first-use-experience.js",
)

# The user authorized successor-seal advancement only in these historical guards.
# Within each guard, update every existing SHA entry whose key is one of the five
# authorized runtime paths. Never invent an entry and never touch any other key.
DIRECT_GUARDS = (
    "site/tests/v51-phase4-protected-shas.json",
    "site/tests/verify-phase4-v50-operations-reporting-protected-sha.cjs",
    "site/tests/verify-phase4-v52c-legacy-student-route-protected-sha.cjs",
    "site/tests/verify-phase4-v53-practice-selection-protected-sha.cjs",
    "site/tests/verify-phase4-v53-ui-resource-companion-protected-sha.cjs",
    "site/tests/verify-phase4-v54-resource-bank-protected-sha.cjs",
    "site/tests/verify-phase4-teacher-assignments-checkpoint2-protected-sha.cjs",
)

OPTION2A_SPEC = "e2e/tests/v40-static-student-signin-shell-option2a.spec.cjs"
OPTION2A_ALLOWED_SITE_CHANGES = {
    "site/index.html",
    "site/v40-student-session.js",
    "site/v40-start-shell.js",
}


def git(*args: str) -> str:
    return subprocess.check_output(["git", *args], cwd=ROOT, text=True).strip()


def blob(path: str) -> str:
    return git("hash-object", path)


def path_sha_pattern(path: str) -> re.Pattern[str]:
    return re.compile(
        r"(?P<prefix>['\"]" + re.escape(path) + r"['\"]\s*:\s*['\"])(?P<sha>[0-9a-f]{40})(?P<suffix>['\"])",
    )


def find_path_sha(text: str, path: str) -> list[re.Match[str]]:
    return list(path_sha_pattern(path).finditer(text))


def replace_path_sha(text: str, path: str, new_sha: str) -> tuple[str, str]:
    pattern = path_sha_pattern(path)
    matches = list(pattern.finditer(text))
    if len(matches) != 1:
        raise SystemExit(f"Expected exactly one SHA entry for {path}; found {len(matches)}")
    old_sha = matches[0].group("sha")
    updated, count = pattern.subn(lambda m: m.group("prefix") + new_sha + m.group("suffix"), text, count=1)
    if count != 1:
        raise SystemExit(f"Failed to replace SHA entry for {path}")
    return updated, old_sha


def option2a_manifest_hash() -> str:
    output = git("ls-files", "-co", "--exclude-standard", "site")
    paths = sorted(set(filter(None, output.splitlines()))) if output else []
    records = []
    for path in paths:
        if path in OPTION2A_ALLOWED_SITE_CHANGES:
            continue
        records.append(f"{blob(path)}  {path}")
    payload = ("\n".join(records) + "\n") if records else ""
    return hashlib.sha256(payload.encode()).hexdigest()


def assert_supabase_unchanged() -> None:
    actual = git("rev-parse", "HEAD:supabase")
    if actual != EXPECTED_SUPABASE_TREE:
        raise SystemExit(f"Supabase HEAD tree mismatch: {actual}")
    changed = git("diff", "--name-only", "--", "supabase")
    if changed:
        raise SystemExit(f"Supabase working tree changed unexpectedly:\n{changed}")


def main() -> None:
    assert_supabase_unchanged()

    runtime_shas = {path: blob(path) for path in AUTHORIZED_RUNTIME}
    print("OPTION2B_SUCCESSOR_RUNTIME_SHA_TABLE_BEGIN")
    for path, sha in runtime_shas.items():
        print(f"{path}\t{sha}")
    print("OPTION2B_SUCCESSOR_RUNTIME_SHA_TABLE_END")

    originals: dict[str, str] = {}
    old_values: dict[tuple[str, str], str] = {}
    changed_entries: dict[str, list[str]] = {}

    for guard in DIRECT_GUARDS:
        guard_path = ROOT / guard
        original = guard_path.read_text()
        originals[guard] = original
        updated = original
        entries: list[str] = []

        for runtime_path in AUTHORIZED_RUNTIME:
            matches = find_path_sha(updated, runtime_path)
            if len(matches) > 1:
                raise SystemExit(f"{guard}: duplicate SHA entries for authorized path {runtime_path}")
            if not matches:
                continue
            updated, old_sha = replace_path_sha(updated, runtime_path, runtime_shas[runtime_path])
            old_values[(guard, runtime_path)] = old_sha
            entries.append(runtime_path)

        if not entries:
            raise SystemExit(f"{guard}: none of the five authorized runtime SHA entries exists")
        changed_entries[guard] = entries
        guard_path.write_text(updated)
        print(f"{guard}: advanced {len(entries)} authorized successor seal(s): {', '.join(entries)}")

    # Option 2A keeps its allowed-change set unchanged. Only its explicit
    # v40-learning-priorities high-risk blob and whole-site manifest constant
    # are advanced.
    option2a_path = ROOT / OPTION2A_SPEC
    option2a_original = option2a_path.read_text()
    originals[OPTION2A_SPEC] = option2a_original
    option2a_updated, old_priorities_sha = replace_path_sha(
        option2a_original,
        "site/v40-learning-priorities.js",
        runtime_shas["site/v40-learning-priorities.js"],
    )
    old_values[(OPTION2A_SPEC, "site/v40-learning-priorities.js")] = old_priorities_sha
    option2a_path.write_text(option2a_updated)

    new_manifest = option2a_manifest_hash()
    option2a_with_priority = option2a_path.read_text()
    manifest_pattern = re.compile(
        r"(?P<prefix>const EXPECTED_FROZEN_SITE_SHA256 = ')(?P<sha>[0-9a-f]{64})(?P<suffix>';)",
    )
    manifest_matches = list(manifest_pattern.finditer(option2a_with_priority))
    if len(manifest_matches) != 1:
        raise SystemExit(f"Expected exactly one Option 2A site manifest constant; found {len(manifest_matches)}")
    old_manifest = manifest_matches[0].group("sha")
    option2a_final, count = manifest_pattern.subn(
        lambda m: m.group("prefix") + new_manifest + m.group("suffix"),
        option2a_with_priority,
        count=1,
    )
    if count != 1:
        raise SystemExit("Failed to update Option 2A whole-site successor seal")
    option2a_path.write_text(option2a_final)

    # Strong self-audit: each advanced expected SHA must equal the actual final
    # candidate blob. Reverting only those authorized SHA tokens must reproduce
    # every historical guard byte-for-byte.
    for guard, entries in changed_entries.items():
        current = (ROOT / guard).read_text()
        restored = current
        for runtime_path in reversed(entries):
            restored, observed = replace_path_sha(restored, runtime_path, old_values[(guard, runtime_path)])
            if observed != runtime_shas[runtime_path]:
                raise SystemExit(
                    f"{guard}: successor entry for {runtime_path} is {observed}, "
                    f"expected actual blob {runtime_shas[runtime_path]}"
                )
        if restored != originals[guard]:
            raise SystemExit(f"{guard}: bytes changed outside authorized SHA entries")

    current_option2a = option2a_path.read_text()
    restored_option2a, manifest_count = manifest_pattern.subn(
        lambda m: m.group("prefix") + old_manifest + m.group("suffix"),
        current_option2a,
        count=1,
    )
    if manifest_count != 1:
        raise SystemExit("Option 2A manifest restoration audit failed")
    restored_option2a, observed_priority = replace_path_sha(
        restored_option2a,
        "site/v40-learning-priorities.js",
        old_values[(OPTION2A_SPEC, "site/v40-learning-priorities.js")],
    )
    if observed_priority != runtime_shas["site/v40-learning-priorities.js"]:
        raise SystemExit("Option 2A priorities successor SHA does not match actual candidate bytes")
    if restored_option2a != originals[OPTION2A_SPEC]:
        raise SystemExit("Option 2A spec changed outside its two authorized successor seals")

    actual_manifest = option2a_manifest_hash()
    if actual_manifest != new_manifest:
        raise SystemExit(f"Option 2A whole-site seal mismatch: {actual_manifest} != {new_manifest}")

    assert_supabase_unchanged()
    for path in [*DIRECT_GUARDS, OPTION2A_SPEC]:
        text = (ROOT / path).read_text()
        if "supabase" in text.lower() and EXPECTED_SUPABASE_TREE not in text:
            raise SystemExit(f"{path}: expected Supabase tree token was altered or removed")

    print("OPTION2B_SUCCESSOR_GUARD_ENTRY_TABLE_BEGIN")
    for guard, entries in changed_entries.items():
        for runtime_path in entries:
            print(f"{guard}\t{runtime_path}\t{runtime_shas[runtime_path]}")
    print(f"{OPTION2A_SPEC}\tsite/v40-learning-priorities.js\t{runtime_shas['site/v40-learning-priorities.js']}")
    print(f"{OPTION2A_SPEC}\tEXPECTED_FROZEN_SITE_SHA256\t{new_manifest}")
    print("OPTION2B_SUCCESSOR_GUARD_ENTRY_TABLE_END")
    print("Option 2B successor-seal update self-audit: PASS")
    print(f"Option 2A whole-site successor seal: {new_manifest}")
    print(f"Supabase tree retained: {EXPECTED_SUPABASE_TREE}")


if __name__ == "__main__":
    main()
