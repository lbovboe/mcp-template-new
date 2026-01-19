# Reference: Original Monolithic Implementation

This folder contains the original monolithic version of the MCP server before it was refactored into a modular architecture.

## File

- `index.ts` - The original 365-line single-file implementation (before modularization)

## Purpose

This file is kept for:
- **Comparison**: See the before/after of the refactoring
- **Reference**: Understand the original implementation
- **Learning**: Study the transformation process
- **Documentation**: Historical record of the codebase evolution

## Key Differences

| Aspect | Original (this file) | Refactored (src/) |
|--------|---------------------|-------------------|
| Files | 1 file (365 lines) | 12 files (454 lines) |
| Structure | Everything in one file | Modular architecture |
| Tool addition | Edit 3 sections | Create 1 file + 2 lines |
| Maintainability | Hard to navigate | Easy to understand |
| Testing | Difficult | Each module testable |

## Migration

See the main documentation for details on the refactoring:
- [ARCHITECTURE.md](../ARCHITECTURE.md) - New modular architecture
- [MIGRATION.md](../MIGRATION.md) - Detailed migration guide
- [REFACTORING_SUMMARY.md](../REFACTORING_SUMMARY.md) - Complete summary

## Note

This file is **not included in the build** process. It's for reference only.
The `reference/` folder is excluded from TypeScript compilation via `tsconfig.json`.
